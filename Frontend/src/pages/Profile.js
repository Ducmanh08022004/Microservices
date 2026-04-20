import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';

const Profile = () => {
    const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        axios.get(`${API_GATEWAY}/auth/me`,{
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            setCurrentUser(res.data);
            setForm(prev => ({ ...prev, email: res.data.email  || ''}));
        })
        .catch(() => setError('Không lấy được thông tin người dùng!'));
    }, [token]);

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (form.password && form.password !== form.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const updates = { email: form.email };
            if (form.password) updates.password = form.password;

            await axios.put(`${API_GATEWAY}/auth/profile`, updates, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage("Cập nhật thông tin thành công!");
            setForm({ ...form, password: '', confirmPassword: '' });
        } catch (err) {
            setError("Lỗi khi cập nhật thông tin!");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="page-shell" style={{ padding: '40px 20px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="card" style={{ padding: 40, borderRadius: 20 }}>
                    <div style={{ textAlign: 'center', marginBottom: 30 }}>
                        <div style={{ 
                            width: 80, height: 80, background: 'var(--brand)', 
                            borderRadius: '50%', margin: '0 auto 15px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: 32, fontWeight: 'bold'
                        }}>
                            👤
                        </div>
                        <h2 style={{ fontSize: 24, color: 'var(--brand)' }}>Thông tin cá nhân</h2>
                        <p style={{ color: '#666' }}>Cập nhật thông tin tài khoản của bạn</p>
                    </div>
                    {currentUser && (
                        <div style={{ marginBottom: 20, padding: '12px 16px', 
                                    background: 'rgba(15,118,110,0.06)', borderRadius: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>
                                👤 {currentUser.username}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                Role: <span style={{ 
                                    color: currentUser.role === 'ADMIN' ? 'var(--accent)' : 'var(--brand)', 
                                    fontWeight: 600 
                                }}>{currentUser.role}</span>
                            </div>
                        </div>
                    )}
                    <form className="form-col" onSubmit={handleSubmit} style={{ gap: 20 }}>
                        <div className="form-group">
                            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Email mới</label>
                            <input 
                                className="input" 
                                name="email" 
                                placeholder="Nhập email mới" 
                                value={form.email} 
                                onChange={handleChange}
                                required 
                            />
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '10px 0' }} />
                        <p style={{ fontSize: 12, color: '#999' }}>Để trống mật khẩu nếu không muốn thay đổi</p>

                        <div className="form-group">
                            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Mật khẩu mới</label>
                            <input 
                                className="input" 
                                name="password" 
                                type="password" 
                                placeholder="••••••••" 
                                value={form.password} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Xác nhận mật khẩu</label>
                            <input 
                                className="input" 
                                name="confirmPassword" 
                                type="password" 
                                placeholder="••••••••" 
                                value={form.confirmPassword} 
                                onChange={handleChange} 
                            />
                        </div>

                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: 12, borderRadius: 10 }}>
                            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </form>

                    {message && <p style={{ color: '#27ae60', marginTop: 15, textAlign: 'center', fontWeight: 'bold' }}>{message}</p>}
                    {error && <p style={{ color: '#e74c3c', marginTop: 15, textAlign: 'center' }}>{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default Profile;
