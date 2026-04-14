import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';

// Cấu hình trạng thái thanh toán
const PAYMENT_STATUS_CONFIG = {
    PROCESSING: {
        label: 'Đang chờ thanh toán',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        icon: '⏳',
        showActions: true,
    },
    PAID: {
        label: 'Thanh toán thành công!',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        icon: '✅',
        showActions: false,
    },
    PAYMENT_FAILED: {
        label: 'Thanh toán thất bại',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        icon: '❌',
        showActions: false,
    },
};

function PaymentPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [pollingCount, setPollingCount] = useState(0);

    const token = localStorage.getItem('accessToken');

    const fetchPayment = useCallback(async () => {
        try {
            const res = await axios.get(`${API_GATEWAY}/api/payments/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPayment(res.data);
            setError('');
        } catch (err) {
            if (err?.response?.status === 404) {
                setError('Đơn hàng đang được xử lý, vui lòng đợi giây lát...');
            } else {
                setError('Không thể tải thông tin thanh toán.');
            }
        } finally {
            setLoading(false);
        }
    }, [orderId, token]);

    // Tải thông tin thanh toán lần đầu
    useEffect(() => {
        fetchPayment();
    }, [fetchPayment]);

    // Auto-refresh mỗi 3 giây nếu vẫn đang PROCESSING
    useEffect(() => {
        if (!payment || payment.status !== 'PROCESSING') return;
        if (pollingCount >= 10) return; // Tối đa 30 giây

        const timer = setTimeout(() => {
            fetchPayment();
            setPollingCount(prev => prev + 1);
        }, 3000);

        return () => clearTimeout(timer);
    }, [payment, pollingCount, fetchPayment]);

    const handleConfirm = async () => {
        setActionLoading(true);
        try {
            await axios.post(
                `${API_GATEWAY}/api/payments/${orderId}/confirm`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchPayment();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Lỗi xác nhận thanh toán.';
            setError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm('Bạn chắc chắn muốn hủy thanh toán?')) return;
        setActionLoading(true);
        try {
            await axios.post(
                `${API_GATEWAY}/api/payments/${orderId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchPayment();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Lỗi hủy thanh toán.';
            setError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayWithMomo = async () => {
        setActionLoading(true);
        try {
            const res = await axios.get(`${API_GATEWAY}/api/payments/${orderId}/momo`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.payUrl) {
                window.location.href = res.data.payUrl;
            } else {
                setError('Không lấy được link thanh toán Momo.');
            }
        } catch (err) {
            const msg = err?.response?.data?.error || 'Lỗi khởi tạo thanh toán Momo.';
            setError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const statusConfig = payment ? (PAYMENT_STATUS_CONFIG[payment.status] || {
        label: payment.status,
        color: '#64748b',
        bg: 'rgba(100, 116, 139, 0.12)',
        icon: '❓',
        showActions: false,
    }) : null;

    return (
        <div className="page-shell">
            <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>💳 Thanh Toán Đơn Hàng</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: 14 }}>
                        Mã đơn: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4 }}>{orderId}</code>
                    </p>
                </div>

                {loading && (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                        <p style={{ color: 'var(--text-muted)' }}>Đang tải thông tin thanh toán...</p>
                    </div>
                )}

                {!loading && error && !payment && (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                        <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
                        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
                        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={fetchPayment}>
                            Thử lại
                        </button>
                    </div>
                )}

                {payment && statusConfig && (
                    <>
                        {/* Status Badge */}
                        <div className="card" style={{
                            background: statusConfig.bg,
                            border: `1.5px solid ${statusConfig.color}`,
                            textAlign: 'center',
                            padding: '28px 24px',
                            marginBottom: 20,
                        }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>{statusConfig.icon}</div>
                            <h2 style={{ color: statusConfig.color, margin: 0, fontSize: 20, fontWeight: 700 }}>
                                {statusConfig.label}
                            </h2>
                        </div>

                        {/* Thông tin thanh toán */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
                                📋 Thông Tin Thanh Toán
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <Row label="Mã thanh toán" value={payment.payment_id} mono />
                                <Row label="Mã đơn hàng" value={payment.order_id} mono />
                                <Row
                                    label="Số tiền"
                                    value={payment.amount
                                        ? `${payment.amount.toLocaleString('vi-VN')} VNĐ`
                                        : '—'}
                                    highlight
                                />
                                <Row label="Trạng thái" value={statusConfig.label} color={statusConfig.color} />
                            </div>
                        </div>

                        {/* Actions */}
                        {statusConfig.showActions && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                                    🏦 Xác Nhận Thanh Toán
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                                    Nhấn nút bên dưới để xác nhận thanh toán (môi trường Demo).
                                </p>

                                {/* Giả lập thông tin ngân hàng */}
                                <div style={{
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: 10,
                                    padding: '14px 16px',
                                    marginBottom: 16,
                                    fontSize: 13,
                                }}>
                                    <p style={{ margin: '0 0 6px', fontWeight: 600 }}>🏦 Thông tin chuyển khoản (Demo)</p>
                                    <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>Ngân hàng: <b>VCB Demo Bank</b></p>
                                    <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>STK: <b>9999 0000 1234 5678</b></p>
                                    <p style={{ margin: '2px 0', color: 'var(--text-muted)' }}>Nội dung: <b>{orderId}</b></p>
                                    <p style={{ margin: '6px 0 0', color: '#f59e0b', fontWeight: 600 }}>
                                        Số tiền: {payment.amount?.toLocaleString('vi-VN')} VNĐ
                                    </p>
                                </div>

                                <button
                                    className="btn"
                                    style={{ 
                                        width: '100%', 
                                        marginBottom: 10, 
                                        background: '#a50064', 
                                        color: '#fff', 
                                        borderColor: '#a50064',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 10
                                    }}
                                    onClick={handlePayWithMomo}
                                    disabled={actionLoading}
                                >
                                    <img src="https://developers.momo.vn/v3/vi/assets/images/logo-custom-5949d0ca9ec83b5443bb609b52a9ba5f.png" alt="Momo" style={{ height: 20 }} />
                                    {actionLoading ? 'Đang khởi tạo...' : 'Thanh toán qua ví MoMo (Sandbox)'}
                                </button>

                                <button
                                    id="btn-confirm-payment"
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginBottom: 10, background: '#10b981', borderColor: '#10b981' }}
                                    onClick={handleConfirm}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Đang xử lý...' : '✅ Xác Nhận Đã Thanh Toán'}
                                </button>

                                <button
                                    id="btn-cancel-payment"
                                    className="btn btn-ghost"
                                    style={{ width: '100%', color: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={handleCancel}
                                    disabled={actionLoading}
                                >
                                    ❌ Hủy Thanh Toán
                                </button>
                            </div>
                        )}

                        {/* Paid thành công */}
                        {payment.status === 'PAID' && (
                            <div className="card" style={{ textAlign: 'center', padding: '20px 24px', marginBottom: 20 }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                                    Kho hàng đang được cập nhật. Đơn hàng sẽ được xác nhận trong giây lát.
                                </p>
                                <button
                                    id="btn-view-orders"
                                    className="btn btn-primary"
                                    onClick={() => navigate('/my-orders')}
                                >
                                    📦 Xem Đơn Hàng Của Tôi
                                </button>
                            </div>
                        )}

                        {/* Thanh toán thất bại */}
                        {payment.status === 'PAYMENT_FAILED' && (
                            <div className="card" style={{ textAlign: 'center', padding: '20px 24px', marginBottom: 20 }}>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                                    Thanh toán không thành công. Tồn kho không bị trừ.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate(-1)}
                                >
                                    🔄 Thử Lại
                                </button>
                            </div>
                        )}

                        {error && (
                            <p style={{ color: '#ef4444', textAlign: 'center', fontSize: 13 }}>{error}</p>
                        )}
                    </>
                )}

                {/* Nút quay lại */}
                <div style={{ textAlign: 'center' }}>
                    <button className="btn btn-ghost" onClick={() => {
                        const token = localStorage.getItem('accessToken');
                        if (token) {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            if (payload.role === 'ADMIN') {
                                navigate('/admin');
                            } else {
                                navigate('/my-orders');
                            }
                        } else {
                            navigate('/dashboard');
                        }
                    }}>
                        ← Quay lại danh sách đơn hàng
                    </button>
                </div>
            </div>
        </div>
    );
}

// Component hàng thông tin
function Row({ label, value, mono, highlight, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
            <span style={{
                fontFamily: mono ? 'monospace' : 'inherit',
                fontSize: highlight ? 16 : 14,
                fontWeight: highlight ? 700 : 500,
                color: color || (highlight ? 'var(--color-primary)' : 'inherit'),
                maxWidth: '60%',
                textAlign: 'right',
                wordBreak: 'break-all',
            }}>
                {value}
            </span>
        </div>
    );
}

export default PaymentPage;
