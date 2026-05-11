import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';

function WishlistPage() {
    const { wishlist, removeFromWishlist } = useWishlist();
    const navigate = useNavigate();

    return (
        <div className="page-shell">
            <div className="dashboard-wrap">
                <h1 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}><Heart size={32} fill="var(--danger)" color="var(--danger)" /> Sản phẩm Yêu thích</h1>
                
                {wishlist.length === 0 ? (
                    <div className="card marketplace-empty">
                        <div style={{ marginBottom: 10 }}><Heart size={48} color="var(--border)" /></div>
                        <h3>Chưa có sản phẩm yêu thích</h3>
                        <p>Hãy dạo quanh cửa hàng và lưu lại những món bạn thích nhé.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                            Khám phá ngay
                        </button>
                    </div>
                ) : (
                    <div className="product-grid marketplace-grid">
                        {wishlist.map(p => (
                            <div key={p.product_id} className="product-card" onClick={() => navigate(`/product/${p.product_id}`)} style={{ position: 'relative' }}>
                                <div className="product-card__image">
                                    <div className="product-card__wishlist" 
                                         onClick={(e) => {
                                             e.stopPropagation();
                                             removeFromWishlist(p.product_id);
                                         }}
                                         style={{ 
                                             position: 'absolute', top: 8, right: 8, 
                                             background: 'rgba(255,255,255,0.85)', padding: '5px', 
                                             borderRadius: '50%', cursor: 'pointer', zIndex: 10,
                                             boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                             display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28
                                         }}>
                                        <Heart size={16} fill="var(--danger)" color="var(--danger)" />
                                    </div>
                                    {p.image_url ? (
                                        <img src={p.image_url} alt={p.name} />
                                    ) : (
                                        <div className="product-card__placeholder">
                                            <ShoppingBag size={48} color="var(--border)" />
                                        </div>
                                    )}
                                </div>

                                <div className="product-card__body">
                                    <div className="product-card__meta">
                                        <span>{p.brand || 'No Brand'}</span>
                                        <span>{p.category?.name || 'General'}</span>
                                    </div>

                                    <h3 className="product-name product-card__title">{p.name}</h3>

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
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default WishlistPage;
