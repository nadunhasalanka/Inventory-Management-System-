import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    withCredentials: true
});

// Response interceptor to handle token expiry and authentication errors
api.interceptors.response.use(
    (response) => {
        // If response is successful, just return it
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized errors (expired or invalid token)
        if (error.response && error.response.status === 401) {
            // Clear any stored user data
            if (typeof window !== 'undefined') {
                localStorage.removeItem('current-user');

                // Get current path to avoid redirecting if already on login page
                const currentPath = window.location.location.pathname;

                // Only redirect if not already on login page
                if (currentPath !== '/login') {
                    // Redirect to login page
                    window.location.href = '/login';
                }
            }
        }

        // Return the error for further handling
        return Promise.reject(error);
    }
);

export default api;