import React, { useState } from 'react';
import axios from 'axios';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Gọi sang Service Java (Auth) - Cổng 8080
            const response = await axios.post('http://localhost:8080/auth/login', { username, password });
            const token = response.data;
            
            // Cất "chiếc vé" vào localStorage
            localStorage.setItem('accessToken', token);
            alert("Đăng nhập thành công!");
            window.location.href = "/dashboard"; 
        } catch (err) {
            alert("Sai tài khoản hoặc mật khẩu!");
        }
    };

    return (
        <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>Đăng Nhập (Service Auth Java)</h2>
            <form onSubmit={handleLogin}>
                <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} /><br/><br/>
                <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} /><br/><br/>
                <button type="submit">Đăng nhập</button>
            </form>
        </div>
    );
}

export default Login;