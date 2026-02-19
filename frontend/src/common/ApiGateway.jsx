
import axios from 'axios';
import AppContext from './AppContext';

const BASE_URL = 'http://localhost:8000';

const ApiGateway = {
    post: async (url, data, callback, authType = 'Public') => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (authType === 'Protected') {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
            }

            const response = await axios.post(`${BASE_URL}/${url}`, data, config);
            if (callback) callback(response);
            return response;
        } catch (error) {
            console.error('API Post Error:', error);
            if (error.response && error.response.status === 401) {
                // Example usage of AppContext to handle unauthorized access
                AppContext.notify({ Type: 'danger', Text: 'Session expired. Please login again.' });
            }
            if (callback) callback(error.response);
            return error.response;
        }
    }
};

export default ApiGateway;
