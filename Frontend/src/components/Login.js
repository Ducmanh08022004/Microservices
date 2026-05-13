import React, { useState } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { useNavigate, Link } from 'react-router-dom';
import { dispatchAuthChanged } from '../utils/authStorage';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(`${API_GATEWAY}/auth/login`, { username, password });
            const token = response.data.accessToken || response.data;
            localStorage.setItem('accessToken', token);
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }
            dispatchAuthChanged();
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || "Sai tài khoản hoặc mật khẩu!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card login-panel" style={{ width: 400, padding: 40, borderRadius: 20, boxShadow: '0 15px 35px rgba(0,0,0,0.1)', background: 'var(--surface)' }}>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                    <h2 style={{ fontSize: 28, color: 'var(--brand)', marginBottom: 10 }}>Chào mừng trở lại</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Đăng nhập để quản lý hệ thống của bạn</p>
                </div>

                <form className="form-col" onSubmit={handleLogin} style={{ gap: 20 }}>
                    <div className="form-group">
                        <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Tên đăng nhập</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="Nhập username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            style={{ width: '100%', borderRadius: 10 }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Mật khẩu</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', borderRadius: 10 }}
                        />
                    </div>
                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                    <Link to="/forgot-password" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                        Quên mật khẩu?
                    </Link>
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, marginTop: 10 }}>
                        {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                    </button>
                </form>

                {error && <p style={{ color: 'var(--danger)', marginTop: 15, textAlign: 'center', fontSize: 14 }}>{error}</p>}

                
                <div style={{ textAlign: 'center', marginTop: 25, fontSize: 14, color: 'var(--text-muted)' }}>
                    Bạn chưa có tài khoản? <Link to="/register" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 'bold' }}>Đăng ký ngay</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;