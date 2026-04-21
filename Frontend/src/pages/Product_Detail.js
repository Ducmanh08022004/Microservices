import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { useCart } from '../context/CartContext';

function getUserId() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    } catch { return null; }
}

function StarRating({ value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(star => (
                <span 
                    key={star}
                    onClick={() => onChange && onChange(star)}
                    style={{ 
                        fontSize: 24, cursor: onChange ? 'pointer' : 'default',
                        color: star <= value ? '#f59e0b' : '#d1d5db',
                        userSelect: 'none'
                    }}
                >★</span>
            ))}
        </div>
    );
}

function Product_Detail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState(''); // Thêm state báo lỗi
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [isEditingReview, setIsEditingReview] = useState(false);
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        
        // Gọi API lấy chi tiết 1 sản phẩm
        axios.get(`${API_GATEWAY}/api/products/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => setProduct(res.data))
        .catch(err => {
            console.log(err);
            setError("Không thể tải dữ liệu. Hãy kiểm tra API GET /api/products/:id của Inventory_Service.");
        });

        // Tải danh sách đánh giá
        axios.get(`${API_GATEWAY}/api/products/${id}/reviews`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => setReviews(res.data))
            .catch(() => {});
    }, [id]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        if (!token) return alert('Vui lòng đăng nhập để đánh giá!');
        
        setReviewSubmitting(true);
        try {
            if (isEditingReview) {
                await axios.put(`${API_GATEWAY}/api/products/${id}/reviews`, reviewForm, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                alert('Cập nhật đánh giá thành công!');
                setIsEditingReview(false);
            } else {
                await axios.post(`${API_GATEWAY}/api/products/${id}/reviews`, reviewForm, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                alert('Đánh giá thành công!');
            }
            setReviewForm({ rating: 5, comment: '' });
            
            const revRes = await axios.get(`${API_GATEWAY}/api/products/${id}/reviews`);
            setReviews(revRes.data);
            const prodRes = await axios.get(`${API_GATEWAY}/api/products/${id}`, { headers: { 'Authorization': `Bearer ${token}` }});
            setProduct(prodRes.data);
        } catch (error) {
            alert(error?.response?.data?.error || 'Lỗi gửi đánh giá');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const validateCoupon = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return alert('Vui lòng đăng nhập!');
        const orderValue = (product.discount_price || product.price) * quantity;
        
        try {
            const res = await axios.post(`${API_GATEWAY}/api/coupons/validate`, {
                code: couponCode,
                order_value: orderValue
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            setCouponDiscount(res.data.discount_amount);
            alert('Áp dụng mã thành công!');
        } catch (error) {
            alert(error?.response?.data?.error || 'Mã không hợp lệ');
            setCouponDiscount(0);
        }
    };

    const handleCheckAndBuy = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            // Gọi API tạo đơn hàng tại Order_Service
            const orderRes = await axios.post(`${API_GATEWAY}/api/orders`, {
                product_id: id,
                quantity: Number(quantity),
                coupon_code: (couponCode || '').trim() || null
            }, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });

            const orderId = orderRes?.data?.data?.order_id;
            if (orderId) {
                // Redirect sang trang thanh toán
                navigate(`/payment/${orderId}`);
            } else {
                alert("Tạo đơn thành công nhưng không nhận được mã đơn.");
            }
        } catch (error) {
            const backendError = error?.response?.data?.error;
            alert(backendError || "Lỗi tạo đơn. Hãy kiểm tra Order_Service.");
        }
    };

    // Xử lý giao diện khi đang tải hoặc lỗi
    if (error) return <div className="page-shell"><p className="status-text status-error">{error}</p></div>;
    if (!product) return <div className="page-shell"><p className="loading-text">Đang tải thông tin sản phẩm...</p></div>;

    return (
        <div className="page-shell">
            <div className="detail-layout">
            
            {/* CỘT TRÁI: Hình ảnh, Thông tin sản phẩm & Đánh giá */}
            <div className="card detail-main">
                {product.image_url ? (
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <img src={product.image_url} alt={product.name} style={{ maxWidth: '100%', maxHeight: '40vh', borderRadius: 8, objectFit: 'contain' }} />
                    </div>
                ) : (
                    <div style={{ width: '100%', height: '30vh', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 16 }}>
                        <span style={{ fontSize: 40, opacity: 0.5 }}>🛍️</span>
                    </div>
                )}
                
                <div className="product-meta" style={{ marginBottom: 10 }}>
                    {product.brand && <span className="badge badge-brand">{product.brand}</span>}
                    {product.category?.name && <span className="badge badge-category">{product.category.name}</span>}
                </div>
                
                <h2>{product.name}</h2>
                
                <div className="product-rating">
                    <span>★</span> {product.rating || 0}
                    <span className="review-count">({product.num_reviews || 0} đánh giá)</span>
                </div>

                <hr className="detail-divider" />
                
                <div className="detail-price">
                    {product.discount_price ? (
                        <>
                            <span>{product.discount_price.toLocaleString()} VNĐ</span>
                            <span className="price-original">{product.price.toLocaleString()} VNĐ</span>
                        </>
                    ) : (
                        <span>{product.price.toLocaleString()} VNĐ</span>
                    )}
                </div>

                <div className="product-description">
                    {product.description || "Chưa có mô tả cho sản phẩm này."}
                </div>

                <div style={{ marginTop: 20, fontSize: '0.9rem' }}>
                    <p style={{ margin: '4px 0' }}><strong>Mã SKU:</strong> <span className="sku-text">{product.sku || 'N/A'}</span></p>
                    <p style={{ margin: '4px 0' }}><strong>Mã hệ thống:</strong> {product.product_id}</p>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Trạng thái:</strong> 
                        <span style={{ marginLeft: 6, color: product.stock > 0 ? '#166534' : '#b91c1c', fontWeight: 600 }}>
                            {product.stock > 0 ? "Còn hàng" : "Hết hàng"} ({product.stock})
                        </span>
                    </p>
                </div>

                <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: '1.2rem' }}>Đánh giá sản phẩm</h3>
                    <hr className="detail-divider" />
                    
                    <form onSubmit={handleReviewSubmit} style={{ marginBottom: 30, background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 8 }}>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Cho điểm đánh giá</label>
                            <StarRating 
                                value={reviewForm.rating} 
                                onChange={(val) => setReviewForm(prev => ({...prev, rating: val}))} 
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <textarea 
                                className="input" 
                                rows="3" 
                                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                                value={reviewForm.comment}
                                onChange={(e) => setReviewForm(prev => ({...prev, comment: e.target.value}))}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="submit" className="btn btn-primary" disabled={reviewSubmitting}>
                                {reviewSubmitting ? 'Đang gửi...' : (isEditingReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá')}
                            </button>
                            {isEditingReview && (
                                <button type="button" className="btn btn-ghost" onClick={() => {
                                    setIsEditingReview(false);
                                    setReviewForm({ rating: 5, comment: '' });
                                }}>
                                    Hủy
                                </button>
                            )}
                        </div>
                    </form>

                    {reviews.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>Chưa có đánh giá nào.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {reviews.map(r => (
                                <div key={r.id} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <b style={{ color: 'var(--brand)' }}>{r.username}</b>
                                        <div>
                                            {r.userId === getUserId() && (
                                                <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 12, marginRight: 8, color: 'var(--accent)' }} onClick={() => {
                                                    setReviewForm({ rating: r.rating, comment: r.comment });
                                                    setIsEditingReview(true);
                                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                                }}>Sửa đánh giá</button>
                                            )}
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 8 }}>
                                        <StarRating value={r.rating} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: 14 }}>{r.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CỘT PHẢI: Khung nhập số lượng & Nút mua */}
            <div className="card detail-side">
                <h3 style={{ fontSize: '1.2rem' }}>Mua hàng</h3>
                <hr className="detail-divider" />
                <div className="form-field">
                    <label>
                        Nhập số lượng:
                    </label>
                    <input 
                        className="input"
                        type="number" 
                        value={quantity} 
                        min="1" 
                        onChange={(e) => setQuantity(e.target.value)}
                    />
                </div>

                <div className="form-field" style={{ display: 'flex', gap: 8 }}>
                    <input 
                        className="input" 
                        placeholder="Mã giảm giá (VD: SUMMER20)" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button className="btn btn-ghost" onClick={validateCoupon} disabled={!couponCode}>
                        Áp dụng
                    </button>
                </div>
                {couponDiscount > 0 && (
                    <div style={{ color: 'var(--ok)', marginBottom: 12, fontWeight: 600 }}>
                        Đã giảm: - {couponDiscount.toLocaleString()} đ! 
                        <span style={{color:'var(--text-muted)', fontWeight: 'normal', fontSize: 13, display: 'block'}}>Giá sau giảm: {((product.discount_price || product.price) * quantity - couponDiscount).toLocaleString()} đ</span>
                    </div>
                )}

                <button 
                    className="btn btn-primary btn-block"
                    onClick={handleCheckAndBuy}
                    style={{ marginBottom: 12 }}
                >
                    Mua ngay
                </button>

                <button 
                    className="btn btn-block"
                    onClick={() => {
                        addToCart(product, Number(quantity));
                        alert(`Đã thêm ${quantity} x ${product.name} vào giỏ!`);
                    }}
                    style={{ 
                    background: '#1d1d1f', // Đen xám sâu
                    color: '#fff', 
                    border: 'none', 
                    marginBottom: 12, 
                    padding: '12px 24px', 
                    borderRadius: 8, 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'}}
                >
                    🛒 Thêm vào giỏ hàng
                </button>

                <button 
                    className="btn btn-ghost btn-block"
                    onClick={() => navigate(-1)}
                >
                    Quay lại
                </button>
            </div>
            
            </div>
        </div>
    );
}

export default Product_Detail;