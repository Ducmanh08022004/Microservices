import React, { useState } from 'react';
import { login } from './api';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = await login(username, password);
            
            // LƯU TOKEN VÀO LOCALSTORAGE
            localStorage.setItem('accessToken', token);
            
            alert("Đăng nhập thành công!");
            window.location.href = "/dashboard"; // Chuyển sang trang quản lý kho
        } catch (err) {
            setError("Sai tài khoản hoặc mật khẩu!");
        }
    };

    return (
        <div style={{ maxWidth: '300px', margin: '100px auto', textAlign: 'center' }}>
            <h2>Đăng Nhập Hệ Thống</h2>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" placeholder="Username" 
                    value={username} onChange={(e) => setUsername(e.target.value)} 
                    style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
                />
                <input 
                    type="password" placeholder="Password" 
                    value={password} onChange={(e) => setPassword(e.target.value)} 
                    style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }}
                />
                <button type="submit" style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>
                    Đăng nhập
                </button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default Login;