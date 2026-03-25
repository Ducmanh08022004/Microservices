import React, { useState } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import Register from './Register';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Gọi sang Service Java (Auth) - Cổng 8080
            const response = await axios.post(`${API_GATEWAY}/auth/login`, { username, password });
            const token = response.data;
            
            // Cất "chiếc vé" vào localStorage
            localStorage.setItem('accessToken', token);
            alert("Đăng nhập thành công!");
            navigate('/dashboard');
        } catch (err) {
            alert("Sai tài khoản hoặc mật khẩu!");
        } finally {
            setLoading(false);
        }
    };

    if (showRegister) {
        return (
            <div>
                <button onClick={() => setShowRegister(false)} style={{ margin: 10 }}>Quay lại Đăng nhập</button>
                <Register />
            </div>
        );
    }

    return (
        <div className="login-wrap">
            <div className="card login-panel">
                <h2 className="login-title">Đăng Nhập Hệ Thống</h2>
                <p className="login-subtitle">Inventory microservices control panel</p>
                <form className="form-col" onSubmit={handleLogin}>
                    <input
                        className="input"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                    <input
                        className="input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
                <div style={{ marginTop: 12 }}>
                    <button onClick={() => setShowRegister(true)} style={{ background: 'transparent', border: 'none', color: '#0a58ca', cursor: 'pointer' }}>Chưa có tài khoản? Đăng ký</button>
                </div>
            </div>
        </div>
    );
}

export default Login;