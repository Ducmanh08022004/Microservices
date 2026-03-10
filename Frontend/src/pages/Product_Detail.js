import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Product_Detail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState(''); // Thêm state báo lỗi

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        
        // Gọi API lấy chi tiết 1 sản phẩm
        axios.get(`http://localhost:3002/api/products/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => setProduct(res.data))
        .catch(err => {
            console.log(err);
            setError("Không thể tải dữ liệu. Hãy kiểm tra API GET /api/products/:id của service_kho-springboot.");
        });
    }, [id]);

    const handleCheckAndBuy = async () => {
        const token = localStorage.getItem('accessToken');
        try {
            // Gọi API kiểm tra tồn kho
            const checkRes = await axios.post(`http://localhost:3002/api/products/check-stock`, {
                productId: id,
                quantity: Number(quantity)
            }, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });

            if (checkRes.data.isAvailable) {
                alert("Kho còn đủ hàng! Đang chuyển thông tin sang Order_Service...");
                // Sau này đội khác sẽ xử lý gửi thông tin này đi
            } else {
                alert("Rất tiếc, số lượng trong kho không đủ!");
            }
        } catch (error) {
            const backendError = error?.response?.data?.error;
            alert(backendError || "Lỗi gọi API kiểm tra kho. Hãy kiểm tra service_kho-springboot.");
        }
    };

    // Xử lý giao diện khi đang tải hoặc lỗi
    if (error) return <div style={{ padding: '20px', color: 'red', fontWeight: 'bold' }}>{error}</div>;
    if (!product) return <div style={{ padding: '20px' }}>Đang tải thông tin sản phẩm...</div>;

    return (
        <div style={{ display: 'flex', padding: '30px', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* CỘT TRÁI: Thông tin sản phẩm */}
            <div style={{ flex: 2, border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
                <h2>{product.name}</h2>
                <hr />
                <p style={{ fontSize: '16px' }}><strong>Mã sản phẩm:</strong> {product.product_id}</p>
                <p style={{ fontSize: '20px', color: '#d9534f', fontWeight: 'bold' }}>Giá: {product.price} VNĐ</p>
                <p style={{ fontSize: '16px' }}><strong>Số lượng hiện có trong kho:</strong> {product.stock}</p>
            </div>

            {/* CỘT PHẢI: Khung nhập số lượng & Nút mua */}
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '20px', borderRadius: '8px', height: 'fit-content', backgroundColor: '#f9f9f9' }}>
                <h3 style={{ marginTop: 0 }}>Mua hàng</h3>
                <hr />
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Nhập số lượng:
                    </label>
                    <input 
                        type="number" 
                        value={quantity} 
                        min="1" 
                        onChange={(e) => setQuantity(e.target.value)}
                        style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>

                <button 
                    onClick={handleCheckAndBuy}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}
                >
                    Kiểm tra kho & Mua hàng
                </button>

                <button 
                    onClick={() => navigate(-1)}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                >
                    Quay lại
                </button>
            </div>
            
        </div>
    );
}

export default Product_Detail;