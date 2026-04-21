import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_GATEWAY } from '../config';

const STATUS_CONFIG = {
    PROCESSING:      { label: 'Đang xử lý',     color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  icon: '🔄' },
    PENDING_PAYMENT: { label: 'Đang xử lý',     color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  icon: '🔄' },
    PAID:            { label: 'Đã thanh toán',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '💳' },
    CONFIRMED:       { label: 'Đã xác nhận',     color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '✅' },
    PAYMENT_FAILED:  { label: 'TT thất bại',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '❌' },
    FAILED_UPDATE:   { label: 'Lỗi cập nhật',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '⚠️' },
    CANCELLED:       { label: 'Đã hủy',         color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '🚫' },
};

const PAYMENT_ACTIONABLE_STATUSES = new Set(['PROCESSING', 'PENDING_PAYMENT']);

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || { label: status || '—', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '❓' };
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.color}40`,
            whiteSpace: 'nowrap',
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setError('Bạn chưa đăng nhập!');
            setLoading(false);
            return;
        }
        setLoading(true);
        axios.get(`${API_GATEWAY}/api/orders`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: page, size: 5 }
        })
            .then(res => {
                setOrders(res.data.content || []);
                setTotalPages(res.data.totalPages || 0);
            })
            .catch(() => setError('Không lấy được đơn hàng!'))
            .finally(() => setLoading(false));
    }, [page]);

    if (loading) return (
        <div className="page-shell">
            <p className="status-text">Đang tải đơn hàng...</p>
        </div>
    );

    if (error) return (
        <div className="page-shell">
            <p className="status-text status-error">{error}</p>
        </div>
    );

    return (
        <div className="page-shell">
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>📦 Đơn Hàng Của Tôi</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                    Theo dõi trạng thái tất cả đơn hàng của bạn
                </p>

                {orders.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
                        <p style={{ color: 'var(--text-muted)' }}>Chưa có đơn hàng nào.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
                            Mua sắm ngay
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {orders.map(order => (
                            <div
                                key={order.order_id}
                                className="card"
                                style={{ padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onClick={() => {
                                    // Nếu đang xử lý thanh toán → redirect sang PaymentPage
                                    if (PAYMENT_ACTIONABLE_STATUSES.has(order.status)) {
                                        navigate(`/payment/${order.order_id}`);
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    {/* Thông tin đơn hàng */}
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 15 }}>
                                            🛍️ {order.product_name || order.product_id}
                                        </p>
                                        <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: 13 }}>
                                            Mã đơn: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                                                {order.order_id}
                                            </code>
                                        </p>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                                            Số lượng: <b>{order.quantity}</b>
                                        </p>
                                        {order.created_at && (
                                            <p style={{margin: 0,color: 'var(--text-muted)',fontSize:13}}>
                                                Ngày đặt hàng: <b>{new Date(order.created_at).toLocaleString('vi-VN')}</b>
                                            </p>
                                        )}
                                    </div>

                                    {/* Giá & trạng thái */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>
                                            {order.total_price?.toLocaleString('vi-VN')} VNĐ
                                        </p>
                                        <StatusBadge status={order.status} />
                                        {PAYMENT_ACTIONABLE_STATUSES.has(order.status) && (
                                            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f59e0b' }}>
                                                Nhấn để thanh toán →
                                            </p>
                                        )}
                                        {order.status === 'PROCESSING' && (
                                            <button
                                                className="btn btn-ghost"
                                                style={{ marginTop: 8, color: 'var(--danger)', fontSize: 12, padding: '4px 8px', width: '100%' }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!window.confirm('Xác nhận hủy đơn hàng này?')) return;
                                                    const token = localStorage.getItem('accessToken');
                                                    try {
                                                        await axios.post(
                                                            `${API_GATEWAY}/api/orders/${order.order_id}/cancel`,
                                                            {},
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        // Reload danh sách
                                                        setOrders(prev => prev.map(o =>
                                                            o.order_id === order.order_id 
                                                                ? { ...o, status: 'CANCELLED' } 
                                                                : o
                                                        ));
                                                    } catch (err) {
                                                        alert(err?.response?.data?.error || 'Lỗi hủy đơn!');
                                                    }
                                                }}
                                            >
                                                ✕ Hủy đơn
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
                        <button 
                            className="btn btn-ghost" 
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Trước
                        </button>
                        <span style={{ padding: '8px 12px', fontWeight: 600 }}>Trang {page + 1} / {totalPages}</span>
                        <button 
                            className="btn btn-ghost" 
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Sau →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyOrders;
