import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_GATEWAY } from '../config';

function Product_Detail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState(''); // Thêm state báo lỗi

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
    }, [id]);

    const handleCheckAndBuy = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            // Gọi API tạo đơn hàng tại Order_Service
            const orderRes = await axios.post(`${API_GATEWAY}/api/orders`, {
                product_id: id,
                quantity: Number(quantity)
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
            
            {/* CỘT TRÁI: Thông tin sản phẩm */}
            <div className="card detail-main">
                {product.image_url ? (
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <img src={product.image_url} alt={product.name} style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 12, objectFit: 'contain' }} />
                    </div>
                ) : (
                    <div style={{ width: '100%', height: 300, background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 20 }}>
                        <span style={{ fontSize: 40, opacity: 0.5 }}>🛍️</span>
                    </div>
                )}
                <h2>{product.name}</h2>
                <hr className="detail-divider" />
                <p><strong>Mã sản phẩm:</strong> {product.product_id}</p>
                <p className="detail-price">Giá: {product.price} VNĐ</p>
                <p><strong>Số lượng hiện có trong kho:</strong> {product.stock}</p>
            </div>

            {/* CỘT PHẢI: Khung nhập số lượng & Nút mua */}
            <div className="card detail-side">
                <h3>Mua hàng</h3>
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

                <button 
                    className="btn btn-primary"
                    onClick={handleCheckAndBuy}
                >
                    Mua hàng
                </button>

                <button 
                    className="btn btn-ghost"
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