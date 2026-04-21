import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function getRole() {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || payload.roles || payload.authorities || null;
  } catch {
    return null;
  }
}

function getUsername() {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.username || '';
  } catch {
    return '';
  }
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('accessToken');
  const role = getRole();
  const username = getUsername();
  const { totalItems } = useCart();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  const isActive = (path) => {
    if (location.pathname === path) return 'active';
    if (path === '/admin' && location.pathname.startsWith('/admin/')) return 'active';
    return '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          🛍️ <span>MicroStore</span>
        </Link>

        {token && (
          <div className="navbar-links">
            <Link to="/my-orders" className={`nav-link ${isActive('/my-orders')}`}>Đơn hàng</Link>
            {role === 'ADMIN' && (
              <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                Quản trị
              </Link>
            )}
          </div>
        )}

        <div className="navbar-actions">
          <Link to="/wishlist" className="nav-link" style={{ marginRight: 16 }}>
            ❤️ {useWishlist().wishlist.length > 0 && <span className="cart-badge" style={{ verticalAlign: 'top', background: 'var(--danger)', color: 'white', borderRadius: 12, padding: '2px 6px', fontSize: 11, marginLeft: 2 }}>{useWishlist().wishlist.length}</span>}
          </Link>
          <Link to="/cart" className="nav-link" style={{ marginRight: 16 }}>
            🛒 Giỏ hàng {totalItems > 0 && <span className="cart-badge" style={{ verticalAlign: 'top', background: 'var(--danger)', color: 'white', borderRadius: 12, padding: '2px 6px', fontSize: 11, marginLeft: 4 }}>{totalItems}</span>}
          </Link>
          {token ? (
            <div className="nav-user-info">
              <Link to="/profile" className="nav-username" style={{ textDecoration: 'none' }}>
                👤 {username}
              </Link>
              <button onClick={handleLogout} className="btn btn-logout">
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link to="/register" className="nav-link">Đăng ký</Link>
              <Link to="/login" className="btn btn-primary" style={{ padding: '8px 24px' }}>Đăng nhập</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
