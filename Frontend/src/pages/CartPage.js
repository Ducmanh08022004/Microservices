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
            <div className="page-shell cart-page-shell">
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
        <div className="page-shell cart-page-shell">
            <div className="cart-page__header">
                <h1 className="cart-page__title"><ShoppingCart size={32} /> Giỏ hàng của bạn</h1>
            </div>
            <div className="cart-layout">
                <div className="cart-items">
                    {cart.map(item => (
                        <div key={item.product_id} className="card cart-item">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="cart-item__image" />
                            ) : (
                                <div className="cart-item__placeholder"><ShoppingBag size={32} color="var(--border)" /></div>
                            )}
                            <div className="cart-item__body">
                                <h3 className="cart-item__title">{item.name}</h3>
                                <p className="cart-item__price">
                                    {(item.discount_price || item.price).toLocaleString()} VNĐ
                                </p>
                            </div>
                            <div className="cart-item__quantity">
                                <button className="btn btn-ghost" onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}><Minus size={16} /></button>
                                <span>{item.quantity}</span>
                                <button className="btn btn-ghost" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus size={16} /></button>
                            </div>
                            <button className="btn cart-item__remove" onClick={() => removeFromCart(item.product_id)}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="card cart-summary">
                    <h3 className="cart-summary__title">Tóm tắt đơn hàng</h3>
                    <div className="cart-summary__row">
                        <span>Tổng số lượng</span>
                        <b>{totalItems}</b>
                    </div>
                    <div className="cart-summary__coupon">
                        <input className="input" placeholder="Mã giảm giá..." value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                        <button className="btn btn-ghost" onClick={applyCoupon} disabled={!couponCode}>Áp dụng</button>
                    </div>
                    {couponDiscount > 0 && (
                        <div className="coupon-success-banner cart-summary__coupon-success">
                            <div className="cart-summary__row cart-summary__row--success">
                                <span>Giảm giá:</span>
                                <b>- {couponDiscount.toLocaleString()} VNĐ</b>
                            </div>
                        </div>
                    )}
                    <div className="cart-summary__total">
                        <span>Thành tiền:</span>
                        <b>{Math.max(0, totalPrice - couponDiscount).toLocaleString()} VNĐ</b>
                    </div>
                    <button className="btn btn-primary cart-summary__checkout" onClick={handleCheckout} disabled={checkingOut}>
                        {checkingOut ? 'Đang xử lý...' : 'Thanh toán'}
                    </button>
                    <button className="btn btn-ghost cart-summary__clear" onClick={clearCart}>
                        Xóa giỏ hàng
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CartPage;
