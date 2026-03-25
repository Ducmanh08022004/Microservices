import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function getRole() {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    // JWT: header.payload.signature
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || payload.roles || payload.authorities || null;
  } catch {
    return null;
  }
}

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  const role = getRole();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  return (
    <nav style={{ background: '#222', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
      <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 18 }}>Trang chủ</Link>
      {token && (
        <>
          {role === 'ADMIN' && (
            <Link to="/admin/add-product" style={{ color: '#fff', textDecoration: 'none' }}>Thêm sản phẩm</Link>
          )}
          {role === 'USER' && (
            <Link to="/my-orders" style={{ color: '#fff', textDecoration: 'none' }}>Đơn hàng của tôi</Link>
          )}
          <button onClick={handleLogout} style={{ marginLeft: 'auto', background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>Đăng xuất</button>
        </>
      )}
      {!token && (
        <>
          <Link to="/register" style={{ color: '#fff', textDecoration: 'none' }}>Đăng ký</Link>
          <Link to="/login" style={{ marginLeft: 'auto', color: '#fff', textDecoration: 'none' }}>Đăng nhập</Link>
        </>
      )}
    </nav>
  );
}

export default Navbar;
