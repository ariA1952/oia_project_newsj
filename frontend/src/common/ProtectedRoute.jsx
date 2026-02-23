import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Loader fullscreen />;
    }

    if (!token) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
