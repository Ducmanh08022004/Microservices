import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang
import { jwtDecode } from 'jwt-decode'; // Thư viện giải mã token

function Dashboard() {
    const [products, setProducts] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [page, setPage] = useState(0);
    const [size] = useState(24);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const observerTargetRef = useRef(null);
    const requestInFlightRef = useRef(false);
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

        // Reset danh sách khi vào trang lần đầu.
        setProducts([]);
        setPage(0);
        setHasMore(true);
    }, []);

    useEffect(() => {
        if (!hasMore && page > 0) {
            return;
        }

        const token = localStorage.getItem('accessToken');

        setLoading(true);
        setError('');
        requestInFlightRef.current = true;

        axios.get('http://localhost:3002/api/products/paged', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { page, size }
        })
        .then(res => {
            const newItems = res.data.content || [];
            const totalPages = res.data.totalPages || 0;

            setProducts(prev => (page === 0 ? newItems : [...prev, ...newItems]));
            setHasMore(page + 1 < totalPages);
        })
        .catch(() => {
            setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
            setHasMore(false);
        })
        .finally(() => {
            requestInFlightRef.current = false;
            setLoading(false);
        });
    }, [page, size]);

    useEffect(() => {
        const target = observerTargetRef.current;
        if (!target) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const firstEntry = entries[0];
                if (!firstEntry.isIntersecting) {
                    return;
                }
                if (!hasMore || loading || requestInFlightRef.current) {
                    return;
                }
                setPage(prev => prev + 1);
            },
            {
                root: null,
                rootMargin: '200px',
                threshold: 0
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loading]);

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

            {loading && <p style={{ marginTop: '20px' }}>Đang tải thêm sản phẩm...</p>}
            {error && <p style={{ marginTop: '20px', color: '#d9534f' }}>{error}</p>}

            {!hasMore && products.length > 0 && (
                <p style={{ marginTop: '24px', textAlign: 'center', color: '#666' }}>
                    Đã tải hết sản phẩm.
                </p>
            )}

            <div ref={observerTargetRef} style={{ height: '1px' }} />
        </div>
    );
}

export default Dashboard;