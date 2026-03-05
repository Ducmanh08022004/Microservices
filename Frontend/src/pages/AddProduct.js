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
            navigate('/dashboard'); // Quay lại trang chính
        } catch (error) {
            alert("Lỗi khi thêm: " + (error.response?.data?.error || error.message));
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <h2>Thêm Sản Phẩm Mới</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label>Mã Sản Phẩm:</label><br/>
                    <input type="text" required style={{ width: '100%' }}
                        onChange={(e) => setFormData({...formData, product_id: e.target.value})} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Tên Sản Phẩm:</label><br/>
                    <input type="text" required style={{ width: '100%' }}
                        onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Số lượng:</label><br/>
                    <input type="number" required style={{ width: '100%' }}
                        onChange={(e) => setFormData({...formData, stock: e.target.value})} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Giá:</label><br/>
                    <input type="number" required style={{ width: '100%' }}
                        onChange={(e) => setFormData({...formData, price: e.target.value})} />
                </div>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'blue', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Lưu sản phẩm
                </button>
                <button type="button" onClick={() => navigate('/dashboard')} style={{ marginLeft: '10px' }}>
                    Hủy
                </button>
            </form>
        </div>
    );
}

export default AddProduct;