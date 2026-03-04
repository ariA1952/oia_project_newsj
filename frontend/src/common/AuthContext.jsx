import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * Decode a JWT and return true if it is expired (or malformed).
 * Works without any external library by reading the base64-encoded payload.
 */
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // `exp` is in seconds; Date.now() is in milliseconds
        return payload.exp < Math.floor(Date.now() / 1000);
    } catch {
        return true; // treat unreadable tokens as expired
    }
}

const API_BASE_URL = 'http://127.0.0.1:8000';

// Determine if Keycloak is explicitly configured via env vars
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL;
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM;
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;
const USE_KEYCLOAK = !!(KEYCLOAK_URL && KEYCLOAK_REALM && KEYCLOAK_CLIENT_ID);

// Add Axios Interceptor to inject the token into all requests
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Restore session from localStorage on page refresh
        // If the stored token is already expired, treat the user as logged out
        try {
            const storedToken = localStorage.getItem('token');
            if (!storedToken || isTokenExpired(storedToken)) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                return null;
            }
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState(() => {
        const storedToken = localStorage.getItem('token');
        return storedToken && !isTokenExpired(storedToken) ? storedToken : null;
    });
    const [loading, setLoading] = useState(USE_KEYCLOAK); // Only show loading if Keycloak needs to init
    const isRun = useRef(false);
    const keycloakRef = useRef(null);

    useEffect(() => {
        if (!USE_KEYCLOAK) return;
        if (isRun.current) return;
        isRun.current = true;

        const initKeycloak = async () => {
            try {
                const Keycloak = (await import('keycloak-js')).default;
                const kc = new Keycloak({
                    url: KEYCLOAK_URL,
                    realm: KEYCLOAK_REALM,
                    clientId: KEYCLOAK_CLIENT_ID,
                });
                keycloakRef.current = kc;

                const authenticated = await kc.init({
                    onLoad: 'login-required',
                    checkLoginIframe: false,
                });

                if (authenticated) {
                    setToken(kc.token);
                    localStorage.setItem('token', kc.token);

                    const tokenParsed = kc.tokenParsed || {};
                    const userData = {
                        id: tokenParsed.preferred_username || kc.subject,
                        erp_users_type: tokenParsed.erp_users_type || 'OIA_ADMIN',
                        erp_campus_department_mapping_id: tokenParsed.erp_campus_department_mapping_id || 1,
                        isAdmin: (tokenParsed.erp_users_type || 'OIA_ADMIN') === 'OIA_ADMIN',
                    };

                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));

                    // Auto-refresh token every 60s; refresh if expiring within 70s
                    const refreshInterval = setInterval(async () => {
                        try {
                            const refreshed = await kc.updateToken(70);
                            if (refreshed) {
                                setToken(kc.token);
                                localStorage.setItem('token', kc.token);
                            }
                        } catch {
                            console.error('Token refresh failed, logging out');
                            kc.logout();
                        }
                    }, 60000);

                    kc._refreshInterval = refreshInterval;
                }
            } catch (error) {
                console.error('Keycloak init failed', error);
            } finally {
                setLoading(false);
            }
        };

        initKeycloak();
    }, []);

    // Manual login (used when Keycloak is NOT configured)
    const login = async (userId, password) => {
        if (USE_KEYCLOAK) {
            keycloakRef.current?.login();
            return;
        }

        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', userId);
        formData.append('password', password);

        const response = await axios.post(`${API_BASE_URL}/auth/login`, formData.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const data = response.data;
        const userData = {
            id: data.erp_users_id,
            erp_users_type: data.erp_users_type,
            erp_campus_department_mapping_id: data.erp_campus_department_mapping_id,
            isAdmin: data.erp_users_type === 'OIA_ADMIN',
        };

        setToken(data.access_token);
        setUser(userData);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        const kc = keycloakRef.current;
        if (kc?._refreshInterval) {
            clearInterval(kc._refreshInterval);
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (USE_KEYCLOAK && kc) {
            kc.logout();
        }
    };

    if (loading) {
        return <div>Loading authentication...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, useKeycloak: USE_KEYCLOAK }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
