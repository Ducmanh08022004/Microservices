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
        <div className="page-shell">
            <div className="dashboard-wrap">
                <div className="dashboard-head">
                    <div>
                        <h1 className="dashboard-title">Quản Lý Kho</h1>
                        <p className="dashboard-subtitle">Service Node.js | Danh sách sản phẩm theo trang</p>
                    </div>

                    {/* Nút thêm sản phẩm chỉ hiện nếu là ADMIN */}
                    {isAdmin && (
                        <button
                            className="btn btn-accent"
                            onClick={() => navigate('/admin/add-product')}
                        >
                            + Thêm sản phẩm mới
                        </button>
                    )}
                </div>

                {/* GIAO DIỆN DẠNG THẺ (GRID) */}
                <div className="product-grid">
                    {products.map(p => (
                        <div
                            key={p.product_id}
                            className="product-card"
                            onClick={() => navigate(`/product/${p.product_id}`)}
                        >
                            <h3 className="product-name">{p.name}</h3>
                            <p className="product-id">Mã SP: <b>{p.product_id}</b></p>
                            <p className="product-price">Giá: {p.price} VNĐ</p>
                            <p className="product-stock">Còn lại: {p.stock}</p>
                        </div>
                    ))}
                </div>

                {loading && <p className="status-text">Đang tải thêm sản phẩm...</p>}
                {error && <p className="status-text status-error">{error}</p>}

                {!hasMore && products.length > 0 && (
                    <p className="status-text status-muted">
                        Đã tải hết sản phẩm.
                    </p>
                )}

                <div ref={observerTargetRef} style={{ height: '1px' }} />
            </div>
        </div>
    );
}

export default Dashboard;