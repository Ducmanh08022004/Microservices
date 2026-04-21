import axios from 'axios';
import { API_GATEWAY } from './config';

axios.defaults.baseURL = API_GATEWAY;

axios.interceptors.response.use(
    response => response,
    async error => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/login') && !original.url.includes('/auth/refresh-token')) {
            original._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error("No refresh token");
                
                const res = await axios.post(`${API_GATEWAY}/auth/refresh-token`, { refreshToken });
                localStorage.setItem('accessToken', res.data.accessToken);
                localStorage.setItem('refreshToken', res.data.refreshToken);
                
                original.headers.Authorization = `Bearer ${res.data.accessToken}`;
                return axios(original);
            } catch (err) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axios;