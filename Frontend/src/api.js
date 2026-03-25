import axios from 'axios';
import { API_GATEWAY } from './config';

const API_AUTH = `${API_GATEWAY}/auth`;

export const login = async (username, password) => {
    const response = await axios.post(`${API_AUTH}/login`, { username, password });
    return response.data; 
};