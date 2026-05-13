import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_GATEWAY } from '../config';
import { RefreshCw, CreditCard, CheckCircle2, XCircle, AlertTriangle, Ban, Package, ShoppingCart, ShoppingBag, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    PROCESSING:      { label: 'Đang xử lý',     color: 'var(--status-processing)', bg: 'var(--status-processing-bg)',  icon: <RefreshCw size={14} /> },
    PENDING_PAYMENT: { label: 'Đang xử lý',     color: 'var(--status-processing)', bg: 'var(--status-processing-bg)',  icon: <RefreshCw size={14} /> },
    PAID:            { label: 'Đã thanh toán',   color: 'var(--status-paid)',       bg: 'var(--status-paid-bg)',       icon: <CreditCard size={14} /> },
    CONFIRMED:       { label: 'Đã xác nhận',     color: 'var(--status-confirmed)',  bg: 'var(--status-confirmed-bg)',  icon: <CheckCircle2 size={14} /> },
    PAYMENT_FAILED:  { label: 'TT thất bại',     color: 'var(--status-failed)',     bg: 'var(--status-failed-bg)',     icon: <XCircle size={14} /> },
    FAILED_UPDATE:   { label: 'Lỗi cập nhật',   color: 'var(--status-failed)',     bg: 'var(--status-failed-bg)',     icon: <AlertTriangle size={14} /> },
    CANCELLED:       { label: 'Đã hủy',         color: 'var(--status-cancelled)',  bg: 'var(--status-cancelled-bg)',  icon: <Ban size={14} /> },
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
    const [cancellingId, setCancellingId] = useState(null);
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
            <div className="container-narrow" style={{ padding: '0 16px' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}><Package size={28} /> Đơn Hàng Của Tôi</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                    Theo dõi trạng thái tất cả đơn hàng của bạn
                </p>

                {orders.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ marginBottom: 12 }}><ShoppingCart size={48} color="var(--border)" /></div>
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
                                    // Chuyển sang trang chi tiết đơn hàng (PaymentPage)
                                    navigate(`/payment/${order.order_id}`);
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    {/* Thông tin đơn hàng */}
                                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 200 }}>
                                        {order.image_url ? (
                                            <img src={order.image_url} alt={order.product_name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                                        ) : (
                                            <div style={{ width: 64, height: 64, background: 'var(--bg-1)', borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={24} color="var(--border)" /></div>
                                        )}
                                        <div>
                                            <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 15 }}>
                                                {order.product_name || order.product_id}
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
                                    </div>

                                    {/* Giá & trạng thái */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: 'var(--brand)' }}>
                                            {order.total_price?.toLocaleString('vi-VN')} VNĐ
                                        </p>
                                        <StatusBadge status={order.status} />
                                        {PAYMENT_ACTIONABLE_STATUSES.has(order.status) ? (
                                            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f59e0b' }}>
                                                Nhấn để thanh toán →
                                            </p>
                                        ) : (
                                            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--brand)' }}>
                                                Xem chi tiết →
                                            </p>
                                        )}
                                        {order.status === 'PROCESSING' && (
                                            cancellingId === order.order_id ? (
                                                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Xác nhận hủy?</span>
                                                    <button className="btn" style={{ fontSize: 11, padding: '4px 10px', background: 'var(--danger)', color: '#fff', borderRadius: 8 }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const token = localStorage.getItem('accessToken');
                                                            try {
                                                                await axios.post(
                                                                    `${API_GATEWAY}/api/orders/${order.order_id}/cancel`,
                                                                    {},
                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                );
                                                                setOrders(prev => prev.map(o =>
                                                                    o.order_id === order.order_id 
                                                                        ? { ...o, status: 'CANCELLED' } 
                                                                        : o
                                                                ));
                                                                setCancellingId(null);
                                                            } catch (err) {
                                                                toast.error(err?.response?.data?.error || 'Lỗi hủy đơn!');
                                                                setCancellingId(null);
                                                            }
                                                        }}>
                                                        Có, hủy
                                                    </button>
                                                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}
                                                        onClick={(e) => { e.stopPropagation(); setCancellingId(null); }}>
                                                        Không
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ marginTop: 8, color: 'var(--danger)', fontSize: 12, padding: '4px 8px', width: '100%' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCancellingId(order.order_id);
                                                    }}
                                                >
                                                    <X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Hủy đơn
                                                </button>
                                            )
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
