import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';

const formatMoney = (amount) =>
    typeof amount === 'number' ? amount.toLocaleString('vi-VN') : '—';

function VnPayReturnPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const processReturn = useCallback(async () => {
        try {
            // Gửi toàn bộ query params từ VNPay tới backend qua Gateway để verify
            const queryString = searchParams.toString();
            const res = await axios.get(
                `${API_GATEWAY}/api/payments/vnpay-return?${queryString}`
            );
            setResult(res.data);
        } catch (err) {
            setError('Không thể xác minh kết quả thanh toán. Vui lòng kiểm tra lại đơn hàng.');
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        processReturn();
    }, [processReturn]);

    const isSuccess = result?.success === true;
    const paymentData = result?.data;
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    const vnpTransactionNo = searchParams.get('vnp_TransactionNo');
    const vnpBankCode = searchParams.get('vnp_BankCode');
    const vnpAmount = searchParams.get('vnp_Amount');
    const displayAmount = vnpAmount ? Number(vnpAmount) / 100 : null;

    return (
        <div className="page-shell">
            <div className="dashboard-wrap" style={{ maxWidth: 680 }}>

                {loading && (
                    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{ fontSize: 48, marginBottom: 14 }}>⏳</div>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 16 }}>
                            Đang xác minh kết quả thanh toán từ VNPay...
                        </p>
                    </div>
                )}

                {!loading && error && (
                    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
                        <p style={{ color: 'var(--danger)', margin: 0, fontSize: 16 }}>{error}</p>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 24 }}
                            onClick={() => navigate('/my-orders')}
                        >
                            Xem đơn hàng của tôi
                        </button>
                    </div>
                )}

                {!loading && result && (
                    <>
                        {/* Header kết quả */}
                        <div className="card" style={{
                            textAlign: 'center',
                            padding: '48px 32px 36px',
                            background: isSuccess
                                ? 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(15,118,110,0.08))'
                                : 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(249,115,22,0.06))',
                            border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)'}`,
                        }}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 18px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isSuccess ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
                                fontSize: 40,
                            }}>
                                {isSuccess ? '✅' : '❌'}
                            </div>
                            <h1 style={{
                                fontSize: '1.6rem', margin: '0 0 8px',
                                color: isSuccess ? 'var(--ok)' : 'var(--danger)',
                            }}>
                                {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 15 }}>
                                {result.message}
                            </p>
                        </div>

                        {/* Chi tiết giao dịch */}
                        <div className="card" style={{ marginTop: 16, padding: '24px 28px' }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>Chi tiết giao dịch VNPay</h3>
                            <div style={{ display: 'grid', gap: 10 }}>
                                {paymentData?.order_id && (
                                    <InfoRow label="Mã đơn hàng" value={paymentData.order_id} mono />
                                )}
                                {displayAmount != null && (
                                    <InfoRow label="Số tiền" value={`${formatMoney(displayAmount)} VNĐ`} highlight />
                                )}
                                <InfoRow label="Mã phản hồi" value={vnpResponseCode === '00' ? '00 — Thành công' : `${vnpResponseCode} — Thất bại`}
                                    color={vnpResponseCode === '00' ? 'var(--ok)' : 'var(--danger)'} />
                                {vnpTransactionNo && (
                                    <InfoRow label="Mã giao dịch VNPay" value={vnpTransactionNo} mono />
                                )}
                                {vnpBankCode && (
                                    <InfoRow label="Ngân hàng" value={vnpBankCode} />
                                )}
                                {paymentData?.payment_method && (
                                    <InfoRow label="Phương thức" value={paymentData.payment_method} />
                                )}
                            </div>
                        </div>

                        {/* Hành động */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 18, justifyContent: 'center' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/my-orders')}
                            >
                                Xem đơn hàng của tôi
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => navigate('/dashboard')}
                            >
                                Tiếp tục mua sắm
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono, highlight, color }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(218, 227, 236, 0.9)', paddingBottom: 8,
        }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
            <span style={{
                fontFamily: mono ? 'monospace' : 'inherit',
                fontSize: highlight ? 16 : 14,
                fontWeight: highlight ? 700 : 500,
                color: color || (highlight ? 'var(--color-primary)' : 'inherit'),
                maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all',
            }}>
                {value}
            </span>
        </div>
    );
}

export default VnPayReturnPage;
