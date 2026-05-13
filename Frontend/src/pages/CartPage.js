import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { ShoppingCart, ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

function CartPage() {
    const { cart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
    const navigate = useNavigate();
    const [checkingOut, setCheckingOut] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);

    const applyCoupon = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return toast.error('Vui lòng đăng nhập!');
        if (cart.length !== 1) {
            return toast.error('Hiện tại mã giảm giá chỉ áp dụng cho giỏ có 1 sản phẩm khi thanh toán.');
        }
        try {
            const res = await axios.post(`${API_GATEWAY}/api/coupons/validate`, {
                code: couponCode,
                order_value: totalPrice
            }, { headers: { 'Authorization': `Bearer ${token}` }});
            setCouponDiscount(res.data.discount_amount);
            toast.success('Áp dụng mã giảm giá thành công!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Mã không hợp lệ');
            setCouponDiscount(0);
        }
    };

    const handleCheckout = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            toast.error('Vui lòng đăng nhập để thanh toán!');
            navigate('/login');
            return;
        }
        
        if (cart.length === 0) return;

        setCheckingOut(true);
        try {
            const batchRequests = cart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                coupon_code: cart.length === 1 ? ((couponCode || '').trim() || null) : null
            }));
            
            await axios.post(`${API_GATEWAY}/api/orders/batch`, batchRequests, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            toast.success('Đã tạo đơn hàng thành công!');
            clearCart();
            navigate('/my-orders');
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Có lỗi xảy ra khi tạo đơn hàng');
        } finally {
            setCheckingOut(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="page-shell">
                <div className="empty-state card">
                    <div className="empty-state__icon">
                        <ShoppingCart size={48} strokeWidth={1.5} />
                    </div>
                    <h2 className="empty-state__title">Giỏ hàng trống</h2>
                    <p className="empty-state__desc">Bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy dạo quanh cửa hàng và chọn những món đồ bạn yêu thích nhé!</p>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                        Khám phá cửa hàng
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <h1 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}><ShoppingCart size={32} /> Giỏ hàng của bạn</h1>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 60%', minWidth: '320px' }}>
                    {cart.map(item => (
                        <div key={item.product_id} className="card" style={{ display: 'flex', gap: 16, padding: 16, marginBottom: 16, alignItems: 'center' }}>
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                            ) : (
                                <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={32} color="var(--border)" /></div>
                            )}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 8px' }}>{item.name}</h3>
                                <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-primary)' }}>
                                    {(item.discount_price || item.price).toLocaleString()} VNĐ
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn btn-ghost" onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))} style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={16} /></button>
                                <span>{item.quantity}</span>
                                <button className="btn btn-ghost" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></button>
                            </div>
                            <button className="btn" style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => removeFromCart(item.product_id)}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="card" style={{ flex: '1 1 30%', minWidth: '320px', height: 'fit-content', padding: 24 }}>
                    <h3 style={{ margin: '0 0 16px' }}>Tóm tắt đơn hàng</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span>Tổng số lượng:</span>
                        <b>{totalItems}</b>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input className="input" style={{ flex: 1 }} placeholder="Mã giảm giá..." value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                        <button className="btn btn-ghost" onClick={applyCoupon} disabled={!couponCode}>Áp dụng</button>
                    </div>
                    {couponDiscount > 0 && (
                        <div className="coupon-success-banner" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ok)' }}>
                                <span>Giảm giá:</span>
                                <b>- {couponDiscount.toLocaleString()} VNĐ</b>
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, marginBottom: 24, borderTop: '1px solid #eee', paddingTop: 12 }}>
                        <span>Thành tiền:</span>
                        <b style={{ color: 'var(--color-primary)' }}>{Math.max(0, totalPrice - couponDiscount).toLocaleString()} VNĐ</b>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={handleCheckout} disabled={checkingOut}>
                        {checkingOut ? 'Đang xử lý...' : 'Thanh toán'}
                    </button>
                    <button className="btn btn-ghost" style={{ width: '100%' }} onClick={clearCart}>
                        Xóa giỏ hàng
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CartPage;
