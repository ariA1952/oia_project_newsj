import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../common/AuthContext';
import Notification from '../../../common/Notification';
import './Login.css';

const LoginPage = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId || !password) {
            setError('Please enter both User ID and Password');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await login(userId, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.detail || 'Invalid User ID or Password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">OIA</div>
                    <h1>Office of International Affairs</h1>
                    <p>Collaboration Metrics Management System</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="userId">User ID</label>
                        <input
                            type="number"
                            id="userId"
                            placeholder="Enter your Employee ID"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2024 International Office. All rights reserved.</p>
                </div>
            </div>

            {error && (
                <Notification
                    message={error}
                    type="error"
                    onClose={() => setError(null)}
                />
            )}
        </div>
    );
};

export default LoginPage;
