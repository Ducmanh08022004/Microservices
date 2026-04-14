import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_GATEWAY } from '../config';

function AddProduct() {
    const [formData, setFormData] = useState({
        product_id: '',
        name: '',
        stock: 0,
        price: 0,
        image_url: '',
        description: '',
        category: '',
        brand: '',
        sku: '',
        discount_price: null
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const navigate = useNavigate();

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        const token = localStorage.getItem('accessToken');
        const imgData = new FormData();
        imgData.append('file', file);

        try {
            const res = await axios.post(`${API_GATEWAY}/admin/products/images/upload`, imgData, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setFormData({ ...formData, image_url: res.data.url });
        } catch (error) {
            alert("Lỗi upload ảnh: " + (error.response?.data?.error || error.message));
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        try {
            await axios.post(`${API_GATEWAY}/admin/products`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Thêm sản phẩm thành công!");
            navigate('/dashboard'); 
        } catch (error) {
            alert("Lỗi khi thêm: " + (error.response?.data?.error || error.message));
        }
    };

    return (
        <div className="page-shell">
            <div className="card form-wrap">
                <h2 className="form-title">Thêm Sản Phẩm Mới</h2>
                <form className="form-grid" onSubmit={handleSubmit}>
                    
                    {/* Upload ảnh */}
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Ảnh sản phẩm:</label>
                        <div style={{
                            display: 'flex', gap: 20, alignItems: 'center', marginTop: 8,
                            padding: 20, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12
                        }}>
                            {formData.image_url ? (
                                <img src={formData.image_url} alt="Preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
                            ) : (
                                <div style={{ width: 100, height: 100, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    📷
                                </div>
                            )}
                            <div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} id="img-upload" style={{ display: 'none' }} />
                                <label htmlFor="img-upload" className="btn btn-ghost" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                    {uploadingImage ? '⏳ Đang tải lên...' : 'Chọn ảnh mới'}
                                </label>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Hỗ trợ JPG, PNG. Tối đa 5MB.</p>
                            </div>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Mã Sản Phẩm (ID):</label>
                        <input className="input" type="text" required
                            value={formData.product_id}
                            onChange={(e) => setFormData({...formData, product_id: e.target.value})} />
                    </div>
                    <div className="form-field">
                        <label>Tên Sản Phẩm:</label>
                        <input className="input" type="text" required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="form-field">
                        <label>Mã SKU:</label>
                        <input className="input" type="text"
                            placeholder="e.g. LAP-DELL-5530"
                            value={formData.sku}
                            onChange={(e) => setFormData({...formData, sku: e.target.value})} />
                    </div>
                    <div className="form-field">
                        <label>Thương hiệu:</label>
                        <input className="input" type="text"
                            value={formData.brand}
                            onChange={(e) => setFormData({...formData, brand: e.target.value})} />
                    </div>
                    <div className="form-field">
                        <label>Danh mục:</label>
                        <input className="input" type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})} />
                    </div>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Mô tả sản phẩm:</label>
                        <textarea className="input" rows="4"
                            style={{ resize: 'vertical' }}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="form-field">
                        <label>Số lượng kho:</label>
                        <input className="input" type="number" required
                            value={formData.stock}
                            onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} />
                    </div>
                    <div className="form-field">
                        <label>Giá niêm yết (VNĐ):</label>
                        <input className="input" type="number" required
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div className="form-field">
                        <label>Giá khuyến mãi (VNĐ):</label>
                        <input className="input" type="number"
                            value={formData.discount_price}
                            placeholder="Để trống nếu không giảm giá"
                            onChange={(e) => setFormData({...formData, discount_price: e.target.value ? Number(e.target.value) : null})} />
                    </div>
                    <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                        <button className="btn btn-primary" type="submit" disabled={uploadingImage}>
                            Lưu sản phẩm
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => navigate('/dashboard')}>
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddProduct;