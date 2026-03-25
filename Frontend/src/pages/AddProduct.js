import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AddProduct() {
    const [formData, setFormData] = useState({
        product_id: '',
        name: '',
        stock: 0,
        price: 0
    });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        try {
            await axios.post('http://localhost:3002/admin/products', formData, {
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
                    <div className="form-field">
                        <label>Mã Sản Phẩm:</label>
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
                        <label>Số lượng:</label>
                        <input className="input" type="number" required
                            value={formData.stock}
                            onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} />
                    </div>
                    <div className="form-field">
                        <label>Giá:</label>
                        <input className="input" type="number" required
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
                    </div>
                    <div className="form-actions">
                        <button className="btn btn-primary" type="submit">
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