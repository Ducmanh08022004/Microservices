import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';

// Cấu hình trạng thái thanh toán
const PAYMENT_STATUS_CONFIG = {
    PROCESSING: {
        label: 'Đang xử lý thanh toán',
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

const formatMoney = (amount) => (typeof amount === 'number' ? amount.toLocaleString('vi-VN') : '—');

const getStatusTone = (status) => {
    if (status === 'PROCESSING') {
        return 'Đơn đang chờ xác nhận thanh toán. Bạn có thể demo xác nhận hoặc hủy thanh toán ngay bên phải.';
    }
    if (status === 'PAID') {
        return 'Thanh toán đã được ghi nhận. Hệ thống sẽ tiếp tục xử lý tồn kho và đồng bộ trạng thái đơn hàng.';
    }
    if (status === 'PAYMENT_FAILED') {
        return 'Thanh toán không thành công. Đơn hàng đã được đánh dấu thất bại và kho hàng không bị trừ.';
    }
    return 'Trạng thái thanh toán hiện tại của đơn hàng.';
};

function Step({ number, title, description, active, done }) {
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done ? 'rgba(22, 101, 52, 0.14)' : active ? 'rgba(15, 118, 110, 0.16)' : 'rgba(82, 95, 110, 0.1)',
                color: done ? 'var(--ok)' : active ? 'var(--brand)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: 13,
            }}>
                {done ? '✓' : number}
            </div>
            <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{description}</div>
            </div>
        </div>
    );
}

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

    const statusConfig = payment ? (PAYMENT_STATUS_CONFIG[payment.status] || {
        label: payment.status,
        color: '#64748b',
        bg: 'rgba(100, 116, 139, 0.12)',
        icon: '❓',
        showActions: false,
    }) : null;

    const isProcessing = payment?.status === 'PROCESSING' || payment?.status === 'PENDING_PAYMENT';
    const isPaid = payment?.status === 'PAID';
    const isFailed = payment?.status === 'PAYMENT_FAILED';

    return (
        <div className="page-shell">
            <div className="dashboard-wrap" style={{ maxWidth: 1120 }}>
                <div className="dashboard-head" style={{ alignItems: 'flex-start', marginBottom: 18 }}>
                    <div>
                        <h1 className="dashboard-title">Thanh toán đơn hàng</h1>
                        <p className="dashboard-subtitle">Xác nhận, hủy hoặc hoàn tất thanh toán theo luồng xử lý chung của hệ thống.</p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 14px',
                            borderRadius: 999,
                            background: 'rgba(15, 118, 110, 0.08)',
                            color: 'var(--brand)',
                            fontWeight: 700,
                        }}>
                            <span>#{orderId}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                            Mã đơn hàng
                        </div>
                    </div>
                </div>

                <div className="card" style={{
                    padding: 22,
                    marginBottom: 18,
                    background: 'linear-gradient(135deg, rgba(15,118,110,0.08), rgba(249,115,22,0.08))',
                    border: '1px solid rgba(15,118,110,0.12)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>Trạng thái hiện tại</div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: statusConfig?.bg, color: statusConfig?.color, fontWeight: 700 }}>
                                <span>{statusConfig?.icon}</span>
                                <span>{statusConfig?.label}</span>
                            </div>
                        </div>
                        <div style={{ maxWidth: 520, color: 'var(--text-muted)', lineHeight: 1.6, fontSize: 14 }}>
                            {getStatusTone(payment?.status)}
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ fontSize: 42, marginBottom: 10 }}>⏳</div>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Đang tải thông tin thanh toán...</p>
                    </div>
                )}

                {!loading && error && !payment && (
                    <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ fontSize: 42, marginBottom: 10 }}>🔄</div>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{error}</p>
                        <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={fetchPayment}>
                            Thử lại
                        </button>
                    </div>
                )}

                {payment && statusConfig && (
                    <div className="detail-layout" style={{ marginTop: 18 }}>
                        <div className="card detail-main">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>Tóm tắt thanh toán</div>
                                    <h2 style={{ fontSize: '1.45rem', marginBottom: 8 }}>Đơn hàng #{orderId}</h2>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                                        {getStatusTone(payment.status)}
                                    </p>
                                </div>

                                <div style={{
                                    minWidth: 180,
                                    padding: '12px 14px',
                                    borderRadius: 16,
                                    background: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(15,118,110,0.12)',
                                }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Số tiền</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                                        {formatMoney(payment.amount)} VNĐ
                                    </div>
                                </div>
                            </div>

                            <hr className="detail-divider" />

                            <div style={{ display: 'grid', gap: 12 }}>
                                <Row label="Mã thanh toán" value={payment.payment_id} mono />
                                <Row label="Mã đơn hàng" value={payment.order_id} mono />
                                <Row label="Số tiền" value={`${formatMoney(payment.amount)} VNĐ`} highlight />
                                <Row label="Trạng thái" value={statusConfig.label} color={statusConfig.color} />
                            </div>

                            <hr className="detail-divider" />

                            <div style={{ display: 'grid', gap: 16 }}>
                                <Step
                                    number={1}
                                    title="Tạo đơn"
                                    description="Người dùng nhấn mua hàng, hệ thống tạo đơn ở trạng thái PROCESSING sau khi kiểm tra còn hàng."
                                    done={isPaid || isFailed}
                                />
                                <Step
                                    number={2}
                                    title="Thanh toán"
                                    description="Xác nhận thanh toán hoặc demo thanh toán thành công để chuyển đơn sang PAID."
                                    active={isProcessing}
                                    done={isPaid || isFailed}
                                />
                                <Step
                                    number={3}
                                    title="Trừ kho"
                                    description="Khi đơn đã PAID, kho sẽ được trừ và trạng thái đồng bộ tiếp theo sẽ cập nhật tự động."
                                    active={isPaid}
                                    done={isPaid}
                                />
                            </div>

                            {(isPaid || isFailed) && (
                                <div style={{
                                    marginTop: 20,
                                    padding: 16,
                                    borderRadius: 16,
                                    background: payment.status === 'PAID'
                                        ? 'rgba(16,185,129,0.08)'
                                        : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${statusConfig.color}33`,
                                }}>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                        {payment.status === 'PAID' ? 'Thanh toán đã hoàn tất' : 'Thanh toán bị hủy'}
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6, fontSize: 14 }}>
                                        {payment.status === 'PAID'
                                            ? 'Bạn có thể quay lại danh sách đơn hàng để theo dõi trạng thái đồng bộ kho.'
                                            : 'Bạn có thể quay lại và thử tạo thanh toán lại nếu cần.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="card detail-side" style={{ background: 'var(--surface-soft)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 18 }}>Hành động</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
                                Giao diện demo này bám theo hệ thống hiện tại: xác nhận để chuyển sang <b>PAID</b>, hủy để chuyển sang <b>PAYMENT_FAILED</b>.
                            </p>

                            <div style={{
                                padding: 16,
                                borderRadius: 16,
                                background: 'rgba(15, 118, 110, 0.06)',
                                border: '1px solid rgba(15, 118, 110, 0.12)',
                                marginBottom: 14,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Trạng thái</span>
                                    <strong style={{ color: statusConfig.color }}>{statusConfig.label}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Số tiền</span>
                                    <strong>{formatMoney(payment.amount)} VNĐ</strong>
                                </div>
                            </div>

                            {statusConfig.showActions ? (
                                <>
                                    <button
                                        id="btn-confirm-payment"
                                        className="btn btn-primary"
                                        style={{ marginBottom: 10, width: '100%' }}
                                        onClick={handleConfirm}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}
                                    </button>

                                    <button
                                        id="btn-cancel-payment"
                                        className="btn btn-ghost"
                                        style={{ width: '100%', border: '1px solid rgba(185, 28, 28, 0.18)', color: 'var(--danger)' }}
                                        onClick={handleCancel}
                                        disabled={actionLoading}
                                    >
                                        Hủy thanh toán
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => navigate('/my-orders')}
                                >
                                    Xem đơn hàng của tôi
                                </button>
                            )}

                            {error && (
                                <p style={{ color: 'var(--danger)', textAlign: 'center', fontSize: 13, marginTop: 14, marginBottom: 0 }}>
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Nút quay lại */}
                <div style={{ textAlign: 'center', marginTop: 20 }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(218, 227, 236, 0.9)', paddingBottom: 8 }}>
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
