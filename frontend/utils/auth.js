import api from './api';
import { rolePermissions } from './permissions';

export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });

    if (response.data && response.data.user) {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('current-user', JSON.stringify(response.data.user));
            }
        } catch (_) {}
        return response.data.user;
    }
    return null;
};

export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (error) {
        // Ignore errors from logout endpoint
    }
    
    try {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('current-user');
            // Redirect to login page after logout
            window.location.href = '/login';
        }
    } catch (_) {}
};

export const getCurrentUser = async () => {
    try {
        const response = await api.get('/auth/me');
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('current-user', JSON.stringify(response.data.user));
            }
        } catch (_) {}
        return response.data.user;
    } catch (error) {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('current-user');
            }
        } catch (_) {}
        return null;
    }
};

export const hasPermission = (permission) => {
    try {
        if (typeof window === 'undefined') return false;
        const raw = localStorage.getItem('current-user');
        const user = raw ? JSON.parse(raw) : null;
        if (!user) return false;
        const permissions = rolePermissions[user.role] || [];
        return permissions.includes('all') || permissions.includes(permission);
    } catch (_) {
        return false;
    }
};

// Register a new user via backend
export const register = async ({ firstName, lastName, username, email, password }) => {
    const payload = {
        first_name: firstName,
        last_name: lastName,
        username,
        email,
        password,
    };
    const response = await api.post('/auth/register', payload);
    return response.data; // { success: true, message: 'User registered successfully. Please log in.' }
};


// ... (Your other auth functions like logActivity)