import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang
import { jwtDecode } from 'jwt-decode'; // Thư viện giải mã token

function Dashboard() {
    const [products, setProducts] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        
        if (token) {
            try {
                // Giải mã token để lấy role
                const decoded = jwtDecode(token);
                if (decoded.role === 'ADMIN') {
                    setIsAdmin(true);
                }
            } catch (error) {
                console.error("Token không hợp lệ");
            }
        }

        // Gọi API lấy sản phẩm (Giữ nguyên logic của bạn)
        axios.get('http://localhost:3002/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => setProducts(res.data))
        .catch(err => console.log("Lỗi lấy dữ liệu hoặc chưa đăng nhập"));
    }, []);

    return (
        <div style={{ padding: '20px', position: 'relative' }}>
            <h1>Quản Lý Kho (Service Node.js)</h1>

            {/* Nút thêm sản phẩm chỉ hiện nếu là ADMIN */}
            {isAdmin && (
                <button 
                    onClick={() => navigate('/admin/add-product')}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    + Thêm sản phẩm mới
                </button>
            )}

            {/* GIAO DIỆN DẠNG THẺ (GRID) */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '20px', 
                marginTop: '30px' 
            }}>
                {products.map(p => (
                    <div 
                        key={p.product_id} 
                        onClick={() => navigate(`/product/${p.product_id}`)}
                        style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            backgroundColor: '#fff',
                            transition: 'transform 0.2s'
                        }}
                        // Hiệu ứng hover nhẹ
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <h3 style={{ marginTop: 0 }}>{p.name}</h3>
                        <p style={{ color: '#555', marginBottom: '5px' }}>Mã SP: <b>{p.product_id}</b></p>
                        <p style={{ color: '#d9534f', fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>
                            Giá: {p.price} VNĐ
                        </p>
                        <p style={{ color: '#0275d8', marginBottom: 0 }}>
                            Còn lại: {p.stock}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;