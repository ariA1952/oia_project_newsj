import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi } from '../modules/metrics/services/metricsService';

import axios from 'axios';

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
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (userId, password) => {
        try {
            const data = await loginApi(userId, password);
            const newToken = data.access_token;

            // Using user profile directly from backend response
            const userData = {
                id: data.erp_users_id,
                erp_users_type: data.erp_users_type,
                erp_campus_department_mapping_id: data.erp_campus_department_mapping_id,
                isAdmin: data.erp_users_type === 'OIA_ADMIN'
            };

            setToken(newToken);
            setUser(userData);

            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));

            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
