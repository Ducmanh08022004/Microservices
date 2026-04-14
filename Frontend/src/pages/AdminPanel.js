import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('products');
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ 
        revenue: 0, daily: 0, weekly: 0, monthly: 0,
        statusStats: [], topProducts: [], totalUsers: 0 
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageSize] = useState(10);

    const token = localStorage.getItem('accessToken');

    useEffect(() => {
        setPage(0);
        fetchData(0);
        if (activeTab === 'reports') {
            fetchStats();
        }
    }, [activeTab]);

    const fetchData = async (targetPage) => {
        setLoading(true);
        setError(null);
        try {
            let url = '';
            if (activeTab === 'products') url = `${API_GATEWAY}/api/products/paged?page=${targetPage}&size=${pageSize}`;
            else if (activeTab === 'categories') url = `${API_GATEWAY}/api/categories`;
            else if (activeTab === 'orders' || activeTab === 'reports') url = `${API_GATEWAY}/api/orders/admin?page=${targetPage}&size=${pageSize}`;
            else if (activeTab === 'users') url = `${API_GATEWAY}/auth/admin/users?page=${targetPage}&size=${pageSize}`;

            const res = await axios.get(url, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.data?.content) {
                setData(res.data.content);
                setTotalPages(res.data.totalPages);
                setPage(res.data.number);
            } else {
                setData(Array.isArray(res.data) ? res.data : []);
                setTotalPages(0);
            }
        } catch (err) {
            setError("Lỗi khi tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const [orderRes, authRes] = await Promise.all([
                axios.get(`${API_GATEWAY}/api/orders/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                axios.get(`${API_GATEWAY}/auth/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            setStats({
                revenue: orderRes.data.total_revenue,
                daily: orderRes.data.daily_revenue,
                weekly: orderRes.data.weekly_revenue,
                monthly: orderRes.data.monthly_revenue,
                statusStats: orderRes.data.status_distribution,
                topProducts: orderRes.data.top_products,
                totalUsers: authRes.data.total_users
            });
        } catch (err) {}
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 0 && newPage < totalPages) fetchData(newPage);
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Xóa SP này?")) {
            await axios.delete(`${API_GATEWAY}/api/products/admin/products/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            fetchData(page);
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="pagination" style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-ghost" disabled={page === 0} onClick={() => handlePageChange(page - 1)}>Trước</button>
                <span>Trang {page + 1} / {totalPages}</span>
                <button className="btn btn-ghost" disabled={page === totalPages - 1} onClick={() => handlePageChange(page + 1)}>Sau</button>
            </div>
        );
    };

    return (
        <div className="page-shell">
            <div className="dashboard-wrap">
                <div className="dashboard-head">
                    <h1 className="dashboard-title">Hệ thống Quản trị</h1>
                </div>

                <div className="tabs" style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto' }}>
                    {['products', 'categories', 'orders', 'users', 'reports'].map(t => (
                        <button key={t} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
                            {t === 'products' ? 'Sản phẩm' : t === 'categories' ? 'Danh mục' : t === 'orders' ? 'Đơn hàng' : t === 'users' ? 'Người dùng' : 'Báo cáo'}
                        </button>
                    ))}
                </div>

                <div className="card" style={{ padding: 25, minHeight: 500 }}>
                    {loading && <p>Đang tải dữ liệu...</p>}
                    {activeTab === 'reports' ? (
                        <div className="reports-area">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, marginBottom: 25 }}>
                                <div className="card" style={{ padding: 20, background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' }}>
                                    <small>Doanh thu Ngày</small>
                                    <h3 style={{ margin: '5px 0' }}>{stats.daily?.toLocaleString()} đ</h3>
                                </div>
                                <div className="card" style={{ padding: 20, background: '#f0fdf4', borderLeft: '4px solid #22c55e' }}>
                                    <small>Doanh thu Tuần</small>
                                    <h3 style={{ margin: '5px 0' }}>{stats.weekly?.toLocaleString()} đ</h3>
                                </div>
                                <div className="card" style={{ padding: 20, background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
                                    <small>Doanh thu Tháng</small>
                                    <h3 style={{ margin: '5px 0' }}>{stats.monthly?.toLocaleString()} đ</h3>
                                </div>
                                <div className="card" style={{ padding: 20, background: '#faf5ff', borderLeft: '4px solid #a855f7' }}>
                                    <small>Tổng Doanh thu</small>
                                    <h3 style={{ margin: '5px 0' }}>{stats.revenue?.toLocaleString()} đ</h3>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="card" style={{ padding: 20 }}>
                                    <h4>Top Sản phẩm bán chạy</h4>
                                    <div style={{ marginTop: 15 }}>
                                        {stats.topProducts.map((p, i) => (
                                            <div key={i} style={{ marginBottom: 12 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                    <span>{p.product_name}</span>
                                                    <strong>{p.total_sold}</strong>
                                                </div>
                                                <div style={{ height: 6, background: '#eee', borderRadius: 3, marginTop: 4 }}>
                                                    <div style={{ height: '100%', background: 'var(--brand)', width: `${(p.total_sold / (stats.topProducts[0]?.total_sold || 1)) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card" style={{ padding: 20 }}>
                                    <h4>Tỉ lệ Trạng thái Đơn hàng</h4>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 15, height: 180, padding: '20px 0' }}>
                                        {stats.statusStats.map((s, i) => (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <small style={{ fontSize: 10 }}>{s.count}</small>
                                                <div style={{ width: 30, background: 'var(--accent)', height: `${(s.count / (Math.max(...stats.statusStats.map(x => x.count)) || 1)) * 120}px` }}></div>
                                                <small style={{ fontSize: 9, transform: 'rotate(-45deg)', marginTop: 10 }}>{s.status}</small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="table-area">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8f9fa' }}>
                                    <tr style={{ textAlign: 'left' }}>
                                        {activeTab === 'products' && <><th>ID</th><th>Tên</th><th>Giá</th><th>Kho</th><th>Hành động</th></>}
                                        {activeTab === 'orders' && <><th>Mã Đơn</th><th>Tổng tiền</th><th>Trạng thái</th></>}
                                        {activeTab === 'users' && <><th>Username</th><th>Email</th><th>Role</th><th>Status</th></>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                            {activeTab === 'products' && <>
                                                <td style={{ padding: 12 }}>{item.product_id}</td>
                                                <td>{item.name}</td>
                                                <td>{item.price?.toLocaleString()} đ</td>
                                                <td>{item.stock}</td>
                                                <td><button className="btn btn-ghost" onClick={() => handleDeleteProduct(item.product_id)}>Xóa</button></td>
                                            </>}
                                            {activeTab === 'orders' && <>
                                                <td style={{ padding: 12 }}>{item.order_id?.substring(0,8)}...</td>
                                                <td>{item.total_price?.toLocaleString()} đ</td>
                                                <td><span className="badge">{item.status}</span></td>
                                            </>}
                                            {activeTab === 'users' && <>
                                                <td style={{ padding: 12 }}>{item.username}</td>
                                                <td>{item.email}</td>
                                                <td>{item.role}</td>
                                                <td>{item.isEnabled ? 'Active' : 'Locked'}</td>
                                            </>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {renderPagination()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
