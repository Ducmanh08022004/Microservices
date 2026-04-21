import React, { useState } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({ username: '', password: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_GATEWAY}/auth/register`, form);
      alert('Tạo tài khoản thành công!Chào mừng bạn gia nhập hệ thống.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Tên đăng nhập hoặc email có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <div className="card login-panel" style={{ width: 400, padding: 40, borderRadius: 20, boxShadow: '0 15px 35px rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h2 style={{ fontSize: 28, color: 'var(--brand)', marginBottom: 10 }}>Tham gia ngay</h2>
        </div>
        
        <form className="form-col" onSubmit={handleSubmit} style={{ gap: 20 }}>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Tên đăng nhập</label>
            <input className="input" name="username" placeholder="Nhập username" value={form.username} onChange={handleChange} required style={{ width: '100%', borderRadius: 10 }} />
          </div>
          
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Email</label>
            <input className="input" name="email" type="email" placeholder="example@email.com" value={form.email} onChange={handleChange} required style={{ width: '100%', borderRadius: 10 }} />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 5, display: 'block' }}>Mật khẩu</label>
            <input className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required style={{ width: '100%', borderRadius: 10 }} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, marginTop: 10 }}>
            {loading ? 'Đang xử lý...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        {error && <p style={{ color: '#e74c3c', marginTop: 15, textAlign: 'center', fontSize: 14 }}>{error}</p>}
        
        <div style={{ textAlign: 'center', marginTop: 25, fontSize: 14, color: '#666' }}>
          Bạn đã có tài khoản? <Link to="/login" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 'bold' }}>Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
