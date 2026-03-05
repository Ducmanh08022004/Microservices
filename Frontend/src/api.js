import axios from 'axios';

const API_AUTH = "http://localhost:8080/auth"; // Cổng của Java Spring Boot

export const login = async (username, password) => {
    // Gọi API login mà bạn vừa gửi code Java lúc nãy
    const response = await axios.post(`${API_AUTH}/login`, { username, password });
    return response.data; // Trả về chuỗi Token
};