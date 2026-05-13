import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

function NotFound() {
  return (
    <div className="page-shell" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <h1 style={{ fontSize: '8rem', margin: 0, fontWeight: 800, color: 'var(--brand)', opacity: 0.1, lineHeight: 1 }}>404</h1>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%' }}>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>Không tìm thấy trang</h2>
        </div>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: 400, margin: '0 auto 30px' }}>
        Trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời không thể truy cập.
      </p>
      
      <Link to="/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <Home size={18} /> Về trang chủ
      </Link>
    </div>
  );
}

export default NotFound;
