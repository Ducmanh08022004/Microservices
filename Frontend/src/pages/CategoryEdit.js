import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { API_GATEWAY } from '../config';
import toast from 'react-hot-toast';

function CategoryEdit() {
    const { id } = useParams();
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        axios.get(`${API_GATEWAY}/api/categories/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            setFormData({
                name: res.data.name,
                description: res.data.description || ''
            });
            setLoading(false);
        })
        .catch(err => {
            toast.error("Không thể tải danh mục: " + err.message);
            navigate('/admin');
        });
    }, [id, token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_GATEWAY}/api/categories/${id}`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success("Cập nhật danh mục thành công!");
            navigate('/admin');
        } catch (error) {
            toast.error("Lỗi: " + (error.response?.data?.error || error.message));
        }
    };

    if (loading) return <div className="page-shell"><p>Đang tải dữ liệu danh mục...</p></div>;

    return (
        <div className="page-shell">
            <div className="card form-wrap" style={{ maxWidth: 600, margin: '40px auto' }}>
                <h2 className="form-title">Chỉnh Sửa Danh Mục</h2>
                <form className="form-grid" onSubmit={handleSubmit}>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Tên Danh Mục:</label>
                        <input className="input" type="text" required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Mô tả:</label>
                        <textarea className="input" rows="4"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                    <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                        <button className="btn btn-primary" type="submit">
                            Lưu Thay Đổi
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

export default CategoryEdit;
