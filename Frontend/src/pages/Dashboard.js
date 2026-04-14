import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang
import { jwtDecode } from 'jwt-decode'; // Thư viện giải mã token
import { API_GATEWAY } from '../config';

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

        axios.get(`${API_GATEWAY}/api/products/paged`, {
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
                            {p.image_url ? (
                                <img src={p.image_url} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover', borderTopLeftRadius: 12, borderTopRightRadius: 12 }} />
                            ) : (
                                <div style={{ width: '100%', height: 180, background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                                    <span style={{ fontSize: 40, opacity: 0.5 }}>🛍️</span>
                                </div>
                            )}
                            <div style={{ padding: '16px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                                    {p.brand || 'No Brand'} • {p.category || 'General'}
                                </div>
                                <h3 className="product-name" style={{ margin: '0 0 8px', fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, fontSize: 13, color: '#fbbf24' }}>
                                    <span>★</span> {p.rating || 0}
                                </div>

                                <div style={{ marginBottom: 8 }}>
                                    {p.discount_price ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1.1rem' }}>{p.discount_price.toLocaleString()} VNĐ</span>
                                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.price.toLocaleString()} VNĐ</span>
                                        </div>
                                    ) : (
                                        <span style={{ fontWeight: 'bold', color: 'var(--brand)', fontSize: '1.1rem' }}>{p.price?.toLocaleString()} VNĐ</span>
                                    )}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Mã: {p.product_id}</span>
                                    <span style={{ 
                                        color: p.stock > 0 ? 'var(--ok)' : 'var(--danger)',
                                        fontWeight: 600
                                    }}>
                                        Kho: {p.stock}
                                    </span>
                                </div>
                            </div>
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