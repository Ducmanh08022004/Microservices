import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_GATEWAY } from '../config';
import { useWishlist } from '../context/WishlistContext';
import { useToast, ToastContainer } from '../components/Toast';
import { Gift, Check, Clipboard, Heart, ShoppingBag, Star, Search } from 'lucide-react';

function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton skeleton-card__image" />
            <div className="skeleton-card__body">
                <div className="skeleton-card__meta-row">
                    <div className="skeleton" style={{ height: 10, width: '38%', borderRadius: 999 }} />
                    <div className="skeleton" style={{ height: 10, width: '28%', borderRadius: 999 }} />
                </div>
                <div className="skeleton" style={{ height: 36, width: '92%', borderRadius: 8 }} />
                <div className="skeleton-card__meta-row">
                    <div className="skeleton" style={{ height: 12, width: '30%', borderRadius: 999 }} />
                    <div className="skeleton" style={{ height: 12, width: '24%', borderRadius: 999 }} />
                </div>
                <div className="skeleton-card__price-row">
                    <div className="skeleton" style={{ height: 20, width: '42%', borderRadius: 999 }} />
                    <div className="skeleton" style={{ height: 12, width: '26%', borderRadius: 999 }} />
                </div>
                <div className="skeleton-card__footer-row">
                    <div className="skeleton" style={{ height: 10, width: '28%', borderRadius: 999 }} />
                    <div className="skeleton" style={{ height: 10, width: '20%', borderRadius: 999 }} />
                </div>
            </div>
        </div>
    );
}

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
    const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();
    const { toasts, show } = useToast();
    const [copied, setCopied] = useState(false);
    const [dailyCoupon, setDailyCoupon] = useState(null);
    const [dailyCouponLoading, setDailyCouponLoading] = useState(true);
    const [showCoupon, setShowCoupon] = useState(false);
    const categoryChips = categories;
    const isFiltering = loading && page === 0 && (debouncedSearch !== '' || selectedCategoryId !== 'all');
    const activeCategoryLabel = selectedCategoryId === 'all'
        ? 'Tất cả danh mục'
        : categories.find(category => String(category.id) === String(selectedCategoryId))?.name || 'Danh mục đã chọn';
    const currentFilterSummary = [
        debouncedSearch ? `Từ khóa: ${debouncedSearch}` : null,
        selectedCategoryId !== 'all' ? activeCategoryLabel : null,
    ].filter(Boolean).join(' · ') || 'Tất cả sản phẩm';

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
        const token = localStorage.getItem('accessToken');
        if (!token) {
            setDailyCouponLoading(false);
            return;
        }

        setDailyCouponLoading(true);
        axios.get(`${API_GATEWAY}/api/coupons/my-daily`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setDailyCoupon(res.data))
            .catch(() => setDailyCoupon(null))
            .finally(() => setDailyCouponLoading(false));
    }, []);

    useEffect(() => {
        if (!showCoupon) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setShowCoupon(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showCoupon]);

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

    const couponWidget = (
        <>
            {dailyCoupon && showCoupon && (
                <div
                    className="coupon-backdrop"
                    onClick={() => setShowCoupon(false)}
                    aria-hidden="true"
                >
                    <div className="card coupon-banner" onClick={(e) => e.stopPropagation()} style={{
                        position: 'fixed', bottom: 92, right: 24, zIndex: 10001,
                        background: 'linear-gradient(135deg, #0f766e 0%, #065f46 100%)',
                        color: '#fff', padding: '20px 24px',
                        borderRadius: 16, boxShadow: '0 12px 32px rgba(6, 95, 70, 0.25)',
                        animation: 'riseUp 0.35s ease', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14,
                        alignItems: 'stretch'
                    }}>
                    <button
                        onClick={() => setShowCoupon(false)}
                        style={{
                            position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                            color: '#fff', opacity: 0.7, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1
                        }}
                        title="Đóng"
                    >
                        ✕
                    </button>
                    <div>
                        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Gift size={16} /> Mã giảm giá hôm nay dành cho bạn
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>
                            {dailyCoupon.code}
                        </div>
                        <div style={{ fontSize: 13, opacity: 0.8 }}>
                            Giảm {dailyCoupon.value}% · Tối đa {dailyCoupon.maxDiscountAmount?.toLocaleString()}đ
                            <br />HSD: Hôm nay
                        </div>
                    </div>
                    <button
                        className="btn-copy"
                        onClick={() => {
                            navigator.clipboard.writeText(dailyCoupon.code);
                            setCopied(true);
                            show('✓ Đã copy mã ' + dailyCoupon.code);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{
                            background: copied ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)', border: 'none',
                            color: '#fff', padding: '12px 20px', borderRadius: 8,
                            cursor: 'pointer', fontWeight: 600, fontSize: 14, width: '100%',
                            transition: 'all 0.3s ease', textAlign: 'center'
                        }}
                    >
                        {copied ? <><Check size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Đã copy!</> : <><Clipboard size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Copy mã ngay</>}
                    </button>
                    </div>
                </div>
            )}
            <button
                onClick={() => {
                    if (!dailyCoupon) {
                        show(dailyCouponLoading ? 'Đang tải mã giảm giá hôm nay...' : 'Chưa có mã giảm giá hôm nay.');
                        return;
                    }

                    setShowCoupon(v => !v);
                }}
                className="coupon-fab"
                style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 10000,
                    background: 'linear-gradient(135deg, #0f766e 0%, #065f46 100%)',
                    color: '#fff', width: 56, height: 56,
                    borderRadius: '50%', boxShadow: '0 8px 24px rgba(6, 95, 70, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    transform: showCoupon ? 'scale(0.92)' : 'scale(1)',
                    opacity: dailyCouponLoading ? 0.92 : 1,
                }}
                title={dailyCoupon ? (showCoupon ? 'Ẩn mã giảm giá' : 'Xem mã giảm giá hôm nay') : 'Đang tải mã giảm giá hôm nay'}
                aria-label="Xem mã giảm giá hôm nay"
                aria-busy={dailyCouponLoading}
            >
                <Gift size={26} className={dailyCouponLoading ? 'lucide-spin' : ''} />
                {dailyCouponLoading && <span className="coupon-fab__status">Đang tải...</span>}
                {dailyCoupon && !dailyCouponLoading && <span className="coupon-fab__badge">Có mã hôm nay</span>}
            </button>
        </>
    );

    return (
        <div className="page-shell">
            <ToastContainer toasts={toasts} />
            {typeof document !== 'undefined' ? createPortal(couponWidget, document.body) : null}
            <div className="dashboard-wrap">
                <div className="dashboard-head marketplace-head">
                    <div>
                        <h1 className="dashboard-title">Khám phá sản phẩm</h1>
                    </div>
                    <div className="dashboard-filter-pill">
                        {isFiltering ? 'Đang lọc...' : currentFilterSummary}
                    </div>
                </div>

                <div className="marketplace-toolbar card">
                    <div className="home-search__copy">
                        <div className="home-search__title">Tìm & lọc</div>

                    </div>

                    <div className="marketplace-toolbar__actions">
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

                    {categoryChips.length > 0 && (
                        <div className="marketplace-chips marketplace-chips--compact">
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
                </div>

                {isFiltering && (
                    <div className="marketplace-loading-state card">
                        <Search size={16} className="lucide-spin" /> Đang lọc...
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
                                <button
                                    type="button"
                                    className="product-card__wishlist"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        isWishlisted(p.product_id)
                                            ? removeFromWishlist(p.product_id)
                                            : addToWishlist(p);
                                    }}
                                    style={{
                                        position: 'absolute', top: 8, right: 8,
                                        background: 'rgba(255,255,255,0.85)', padding: '5px',
                                        borderRadius: '50%', cursor: 'pointer', zIndex: 10,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                                        border: 'none'
                                    }}>
                                    <Heart size={16} fill={isWishlisted(p.product_id) ? 'var(--danger)' : 'none'} color={'var(--danger)'} />
                                </button>
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} />
                                ) : (
                                    <div className="product-card__placeholder">
                                        <ShoppingBag size={48} color="var(--border)" />
                                    </div>
                                )}
                                {p.discount_price && (
                                    <div className="product-card__flag">Giảm giá</div>
                                )}
                            </div>

                            <div className="product-card__body">
                                <div className="product-card__meta">
                                    <span>{p.brand || 'No Brand'}</span>
                                    <span>{p.category?.name || 'General'}</span>
                                </div>

                                <h3 className="product-name product-card__title">{p.name}</h3>

                                <div className="product-card__rating">
                                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                                    <span>{p.rating || 0}</span>
                                    <span className="product-card__sold">{p.num_reviews ? `${p.num_reviews} đánh giá` : 'Mới'}</span>
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
                        <div style={{ marginBottom: 10 }}><Search size={48} color="var(--border)" /></div>
                        <h3>Không có sản phẩm phù hợp</h3>
                        <p>Bạn có thể thử xóa bộ lọc hoặc đổi từ khóa để mở rộng kết quả.</p>
                        <button className="btn btn-primary" onClick={handleClear}>
                            Xóa bộ lọc
                        </button>
                    </div>
                )}

                {!loading && products.length === 0 && !debouncedSearch && selectedCategoryId === 'all' && (
                    <div className="card marketplace-empty">
                        <div style={{ marginBottom: 10 }}><Search size={48} color="var(--border)" /></div>
                        <h3>Danh sách đang trống</h3>
                        <p>Hãy thử cuộn xuống để tải thêm, hoặc dùng ô tìm kiếm để lọc đúng sản phẩm bạn cần.</p>
                        <button className="btn btn-primary" onClick={handleClear}>
                            Xóa tìm kiếm
                        </button>
                    </div>
                )}

                {loading && page === 0 && (
                    <div className="product-grid marketplace-grid" style={{ marginTop: 24 }}>
                        {Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                )}
                {loading && page > 0 && <p className="status-text marketplace-loading">Đang tải thêm sản phẩm...</p>}
                {error && <p className="status-text status-error marketplace-loading">{error}</p>}

                {!hasMore && products.length > 0 && (
                    <p className="status-text status-muted">Đã tải hết sản phẩm.</p>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
