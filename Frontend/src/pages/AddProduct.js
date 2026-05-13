import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { API_GATEWAY } from '../config';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';

function AddProduct() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    
    const [formData, setFormData] = useState({
        product_id: '',
        name: '',
        stock: 0,
        price: 0,
        image_url: '',
        description: '',
        categoryId: null,
        brand: '',
        sku: '',
        discount_price: null
    });
    const [categories, setCategories] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [loadingData, setLoadingData] = useState(isEdit);
    const navigate = useNavigate();

    useEffect(() => {
        if (isEdit) {
            const token = localStorage.getItem('accessToken');
            axios.get(`${API_GATEWAY}/api/products/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => {
                const p = res.data;
                setFormData({
                    product_id: p.product_id || p.productId,
                    name: p.name,
                    stock: p.stock,
                    price: p.price,
                    image_url: p.image_url || p.imageUrl,
                    description: p.description,
                    categoryId: p.category?.id || null,
                    brand: p.brand,
                    sku: p.sku,
                    discount_price: p.discount_price || p.discountPrice
                });
                setLoadingData(false);
            })
            .catch(err => {
                toast.error("Không thể tải sản phẩm: " + err.message);
                navigate('/admin');
            });
        }
    }, [id, isEdit, navigate]);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        axios.get(`${API_GATEWAY}/api/categories`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { page: 0, size: 100 }
        })
        .then(res => setCategories(res.data?.content || []))
        .catch(() => {});
    }, []);

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
            toast.error("Lỗi upload ảnh: " + (error.response?.data?.error || error.message));
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        try {
            if (isEdit) {
                await axios.put(`${API_GATEWAY}/admin/products/full/${id}`, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                toast.success("Cập nhật sản phẩm thành công!");
            } else {
                await axios.post(`${API_GATEWAY}/admin/products`, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                toast.success("Thêm sản phẩm thành công!");
            }
            navigate('/admin'); 
        } catch (error) {
            toast.error("Lỗi: " + (error.response?.data?.error || error.message));
        }
    };

    if (loadingData) return <div className="page-shell"><p>Đang tải dữ liệu sản phẩm...</p></div>;

    return (
        <div className="page-shell">
            <div className="card form-wrap">
                <h2 className="form-title">{isEdit ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
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
                                    <Camera size={32} color="var(--text-muted)" />
                                </div>
                            )}
                            <div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} id="img-upload" style={{ display: 'none' }} />
                                <label htmlFor="img-upload" className="btn btn-ghost" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                    {uploadingImage ? <><Loader2 size={16} className="lucide-spin" style={{ verticalAlign: 'middle', marginRight: 4 }} /> Đang tải lên...</> : 'Chọn ảnh mới'}
                                </label>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Hỗ trợ JPG, PNG. Tối đa 5MB.</p>
                            </div>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>Mã Sản Phẩm (ID):</label>
                        <input className="input" type="text" required disabled={isEdit}
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
                        <CustomSelect 
                            options={[
                                { value: '', label: '-- Chọn danh mục --' },
                                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                            ]}
                            value={formData.categoryId || ''}
                            onChange={(e) => setFormData({
                                ...formData, 
                                categoryId: e.target.value ? Number(e.target.value) : null
                            })}
                        />
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
                            {isEdit ? 'Lưu Thay Đổi' : 'Tạo Sản Phẩm'}
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => navigate('/admin')}>
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddProduct;