import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { Hourglass, CheckCircle2, XCircle, HelpCircle, RefreshCw, Check, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';

const formatMoney = (amount) => (typeof amount === 'number' ? amount.toLocaleString('vi-VN') : '—');

const PAYMENT_STATUS_CONFIG = {
    PROCESSING: {
        label: 'Đang xử lý',
        color: 'var(--status-warning)',
        bg: 'rgba(245, 158, 11, 0.12)',
        icon: <Hourglass size={14} />,
    },
    PAID: {
        label: 'Đã thanh toán',
        color: 'var(--status-paid)',
        bg: 'var(--status-paid-bg)',
        icon: <CheckCircle2 size={14} />,
    },
    PAYMENT_FAILED: {
        label: 'Thanh toán thất bại',
        color: 'var(--status-failed)',
        bg: 'var(--status-failed-bg)',
        icon: <XCircle size={14} />,
    },
};

const ORDER_STATUSES = [
    { value: 'PROCESSING', label: 'Đang xử lý' },
    { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'CANCELLED', label: 'Đã hủy' }
];

function AdminOrderDetail() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');

    const token = localStorage.getItem('accessToken');

    const fetchOrderDetails = useCallback(async () => {
        setLoading(true);
        try {
            // Lấy thông tin order (endpoint này ai cũng gọi được nếu có token hợp lệ)
            const orderRes = await axios.get(`${API_GATEWAY}/api/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOrder(orderRes.data);
            setSelectedStatus(orderRes.data.status);
            setError('');
            
            // Lấy thông tin payment (nếu có)
            try {
                const paymentRes = await axios.get(`${API_GATEWAY}/api/payments/${orderId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setPayment(paymentRes.data);
            } catch (err) {
                // Ignore payment not found
                setPayment(null);
            }
        } catch (err) {
            setError('Không thể tải thông tin đơn hàng.');
        } finally {
            setLoading(false);
        }
    }, [orderId, token]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    const handleUpdateStatus = async () => {
        if (!selectedStatus) return;
        setStatusUpdating(true);
        try {
            await axios.put(
                `${API_GATEWAY}/api/orders/admin/${orderId}/status`,
                { status: selectedStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Cập nhật trạng thái thành công!");
            setOrder({ ...order, status: selectedStatus });
        } catch (err) {
            toast.error(err?.response?.data?.error || "Lỗi cập nhật trạng thái");
            setSelectedStatus(order?.status); // Revert
        } finally {
            setStatusUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="page-shell">
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 600, margin: '40px auto' }}>
                    <div style={{ marginBottom: 10 }}><Hourglass size={42} color="var(--border)" /></div>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Đang tải thông tin đơn hàng...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="page-shell">
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 600, margin: '40px auto' }}>
                    <div style={{ marginBottom: 10 }}><RefreshCw size={42} color="var(--border)" /></div>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{error}</p>
                    <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={fetchOrderDetails}>
                        Thử lại
                    </button>
                    <button className="btn btn-ghost" style={{ marginTop: 18, marginLeft: 10 }} onClick={() => navigate('/admin/orders')}>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    const payStatusConfig = payment ? (PAYMENT_STATUS_CONFIG[payment.status] || {
        label: payment.status,
        color: '#64748b',
        bg: 'rgba(100, 116, 139, 0.12)',
        icon: <HelpCircle size={14} />
    }) : null;

    return (
        <div className="page-shell">
            <div className="dashboard-wrap" style={{ maxWidth: 1120 }}>
                <div className="dashboard-head" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                        <h1 className="dashboard-title">Chi tiết đơn hàng (Admin)</h1>
                    </div>
                </div>

                <div className="detail-layout" style={{ marginTop: 18 }}>
                    <div className="card detail-main">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                {order.image_url && (
                                    <img src={order.image_url} alt={order.product_name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12 }} />
                                )}
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>Thông tin sản phẩm</div>
                                    <h2 style={{ fontSize: '1.45rem', marginBottom: 8, margin: 0 }}>
                                        {order.product_name || order.product_id}
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                                        Mã SP: {order.product_id}
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                minWidth: 180,
                                padding: '12px 14px',
                                borderRadius: 16,
                                background: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(15,118,110,0.12)',
                            }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Tổng tiền ({order.quantity} x SP)</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                                    {formatMoney(order.total_price)} đ
                                </div>
                            </div>
                        </div>

                        <hr className="detail-divider" />

                        <div style={{ display: 'grid', gap: 12 }}>
                            <Row label="Mã đơn hàng" value={order.order_id} mono />
                            <Row label="Khách hàng" value={order.user_email || `User #${order.user_id || 'N/A'}`} />
                            <Row label="Ngày tạo" value={order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '—'} />
                            <Row label="Số lượng" value={order.quantity} />
                            <Row label="Tổng tiền" value={`${formatMoney(order.total_price)} đ`} highlight />
                            <Row label="Trạng thái đơn hàng" value={ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status} highlight />
                        </div>
                    </div>

                    <div className="card detail-side" style={{ background: 'var(--surface-soft)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 18 }}>Quản lý Đơn hàng</h3>
                        
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                                Cập nhật trạng thái
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <CustomSelect 
                                    options={ORDER_STATUSES}
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleUpdateStatus}
                                    disabled={statusUpdating || selectedStatus === order.status}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                                >
                                    <Save size={18} />
                                </button>
                            </div>
                        </div>

                        <hr className="detail-divider" style={{ margin: '15px 0' }} />

                        <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 16 }}>Thông tin thanh toán</h3>
                        {payment ? (
                            <div style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15, 118, 110, 0.06)',
                                border: '1px solid rgba(15, 118, 110, 0.12)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Trạng thái</span>
                                    <strong style={{ color: payStatusConfig?.color, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {payStatusConfig?.icon} {payStatusConfig?.label}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Mã TT</span>
                                    <strong style={{ fontSize: 13, wordBreak: 'break-all' }}>{payment.payment_id}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Số tiền</span>
                                    <strong style={{ fontSize: 13 }}>{formatMoney(payment.amount)} đ</strong>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                                Chưa có thông tin thanh toán cho đơn hàng này.
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={() => navigate('/admin/orders')}>
                        ← Quay lại danh sách đơn hàng
                    </button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value, mono, highlight, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(218, 227, 236, 0.9)', paddingBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
            <span style={{
                fontFamily: mono ? 'monospace' : 'inherit',
                fontSize: highlight ? 16 : 14,
                fontWeight: highlight ? 700 : 500,
                color: color || (highlight ? 'var(--brand)' : 'inherit'),
                maxWidth: '60%',
                textAlign: 'right',
                wordBreak: 'break-all',
            }}>
                {value}
            </span>
        </div>
    );
}

export default AdminOrderDetail;
