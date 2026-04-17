import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_GATEWAY } from '../config';

function Dashboard() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);

    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(0);
    const [size] = useState(24);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(() => queryParams.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(() => queryParams.get('search') || '');
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(() => queryParams.get('categoryId') || 'all');
    const requestInFlightRef = useRef(false);
    const activeRequestIdRef = useRef(0);

    const categoryChips = categories;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 350);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setProducts([]);
        setPage(0);
        setHasMore(true);
    }, [debouncedSearch, selectedCategoryId]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        }

        if (selectedCategoryId !== 'all') {
            params.set('categoryId', selectedCategoryId);
        }

        navigate(
            {
                pathname: location.pathname,
                search: params.toString() ? `?${params.toString()}` : '',
            },
            { replace: true }
        );
    }, [debouncedSearch, selectedCategoryId, location.pathname, navigate]);

    useEffect(() => {
        const searchFromUrl = new URLSearchParams(location.search).get('search') || '';
        const categoryIdFromUrl = new URLSearchParams(location.search).get('categoryId') || 'all';

        if (searchFromUrl !== searchTerm) {
            setSearchTerm(searchFromUrl);
            setDebouncedSearch(searchFromUrl);
        }

        if (categoryIdFromUrl !== selectedCategoryId) {
            setSelectedCategoryId(categoryIdFromUrl);
        }
        // Intentionally depend on the raw URL so browser navigation keeps filters intact.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        axios.get(`${API_GATEWAY}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 0, size: 1000 },
        })
            .then(res => {
                const items = Array.isArray(res.data?.content) ? res.data.content : [];
                setCategories(items.filter(category => category?.id && category?.name));
            })
            .catch(() => {
                setCategories([]);
            });
    }, []);

    useEffect(() => {
        if (!hasMore && page > 0) {
            return;
        }

        const requestId = ++activeRequestIdRef.current;
        const token = localStorage.getItem('accessToken');
        requestInFlightRef.current = true;
        setLoading(true);
        setError('');

        axios.get(`${API_GATEWAY}/api/products/paged`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
                page,
                size,
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
                ...(selectedCategoryId !== 'all' ? { categoryId: selectedCategoryId } : {}),
            },
        })
            .then(res => {
                if (activeRequestIdRef.current !== requestId) {
                    return;
                }

                const newItems = res.data.content || [];
                const isLastPage = typeof res.data.last === 'boolean'
                    ? res.data.last
                    : newItems.length < size;

                setProducts(prev => (page === 0 ? newItems : [...prev, ...newItems]));
                setHasMore(newItems.length > 0 && !isLastPage);
            })
            .catch(() => {
                if (activeRequestIdRef.current !== requestId) {
                    return;
                }

                setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
                setHasMore(false);
            })
            .finally(() => {
                if (activeRequestIdRef.current !== requestId) {
                    return;
                }

                requestInFlightRef.current = false;
                setLoading(false);
            });
    }, [page, size, hasMore, debouncedSearch, selectedCategoryId]);

    useEffect(() => {
        const checkNearBottom = () => {
            if (!hasMore || loading || requestInFlightRef.current) {
                return;
            }

            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.scrollHeight;
            if (scrollPosition >= documentHeight - 400) {
                setPage(prev => prev + 1);
            }
        };

        window.addEventListener('scroll', checkNearBottom, { passive: true });
        window.addEventListener('resize', checkNearBottom);
        checkNearBottom();

        return () => {
            window.removeEventListener('scroll', checkNearBottom);
            window.removeEventListener('resize', checkNearBottom);
        };
    }, [hasMore, loading, products.length]);

    const handleSearch = () => {
        setDebouncedSearch(searchTerm.trim());
    };

    const handleClear = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setSelectedCategoryId('all');
    };

    return (
        <div className="page-shell">
            <div className="dashboard-wrap">
                <div className="home-search card">
                    <div className="home-search__copy">
                        <div className="home-search__title">Tìm sản phẩm</div>
                        <div className="home-search__subtitle">
                            Tìm theo tên sản phẩm, thương hiệu.
                        </div>
                    </div>

                    <div className="home-search__bar">
                        <input
                            className="input home-search__input"
                            placeholder="Nhập từ khóa tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch();
                                }
                            }}
                        />

                        <button className="btn btn-primary" onClick={handleSearch}>
                            Tìm kiếm
                        </button>

                        <button className="btn btn-ghost" onClick={handleClear}>
                            Xóa
                        </button>
                    </div>
                </div>

                {categoryChips.length > 0 && (
                    <div className="marketplace-chips">
                        <button
                            className={`marketplace-chip marketplace-chip--button ${selectedCategoryId === 'all' ? 'is-active' : ''}`}
                            onClick={() => setSelectedCategoryId('all')}
                        >
                            Tất cả
                        </button>
                        {categoryChips.map(category => (
                            <button
                                key={category.id}
                                className={`marketplace-chip marketplace-chip--button ${selectedCategoryId === String(category.id) ? 'is-active' : ''}`}
                                onClick={() => setSelectedCategoryId(String(category.id))}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="product-grid marketplace-grid">
                    {products.map(p => (
                        <div
                            key={p.product_id}
                            className="product-card"
                            onClick={() => navigate(`/product/${p.product_id}`)}
                        >
                            <div className="product-card__image">
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} />
                                ) : (
                                    <div className="product-card__placeholder">
                                        <span>🛍️</span>
                                    </div>
                                )}
                                <div className="product-card__flag">{p.discount_price ? 'Giảm giá' : 'Hot'}</div>
                            </div>

                            <div className="product-card__body">
                                <div className="product-card__meta">
                                    <span>{p.brand || 'No Brand'}</span>
                                    <span>{p.category?.name || 'General'}</span>
                                </div>

                                <h3 className="product-name product-card__title">{p.name}</h3>

                                <div className="product-card__rating">
                                    <span>★</span>
                                    <span>{p.rating || 0}</span>
                                    <span className="product-card__sold">Đã xem nhiều</span>
                                </div>

                                <div className="product-card__price">
                                    {p.discount_price ? (
                                        <>
                                            <span className="product-card__current-price">{p.discount_price.toLocaleString()} VNĐ</span>
                                            <span className="product-card__old-price">{p.price.toLocaleString()} VNĐ</span>
                                        </>
                                    ) : (
                                        <span className="product-card__current-price">{p.price?.toLocaleString()} VNĐ</span>
                                    )}
                                </div>

                                <div className="product-card__footer">
                                    <span>Mã: {p.product_id}</span>
                                    <span style={{ color: p.stock > 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}>
                                        Kho: {p.stock}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!loading && products.length === 0 && (debouncedSearch || selectedCategoryId !== 'all') && (
                    <div className="card marketplace-empty">
                        <div style={{ fontSize: 40, marginBottom: 10 }}>🔎</div>
                        <h3>Không có sản phẩm phù hợp</h3>
                        <p>Hãy đổi danh mục hoặc xóa tìm kiếm.</p>
                        <button className="btn btn-primary" onClick={handleClear}>
                            Xóa bộ lọc
                        </button>
                    </div>
                )}

                {!loading && products.length === 0 && !debouncedSearch && selectedCategoryId === 'all' && (
                    <div className="card marketplace-empty">
                        <div style={{ fontSize: 40, marginBottom: 10 }}>🔎</div>
                        <h3>Không có sản phẩm phù hợp</h3>
                        <p>Hãy đổi từ khóa hoặc xóa tìm kiếm.</p>
                        <button className="btn btn-primary" onClick={handleClear}>
                            Xóa tìm kiếm
                        </button>
                    </div>
                )}

                {loading && <p className="status-text marketplace-loading">Đang tải thêm sản phẩm...</p>}
                {error && <p className="status-text status-error marketplace-loading">{error}</p>}

                {!hasMore && products.length > 0 && (
                    <p className="status-text status-muted">Đã tải hết sản phẩm.</p>
                )}

            </div>
        </div>
    );
}

export default Dashboard;