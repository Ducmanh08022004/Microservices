import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { dispatchAuthChanged } from '../utils/authStorage';

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
    return payload.displayName || payload.sub || payload.username || '';
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
  const { wishlist } = useWishlist();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    dispatchAuthChanged();
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
          🛍️ <span>MiniStore</span>
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
          <Link to="/wishlist" className="nav-icon-btn" style={{ marginRight: 8 }}>
            🤍
            {wishlist.length > 0 && <span className="nav-badge">{wishlist.length}</span>}
          </Link>
          <Link to="/cart" className="nav-icon-btn" style={{ marginRight: 16 }}>
            🛒
            {totalItems > 0 && <span className="nav-badge">{totalItems}</span>}
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
