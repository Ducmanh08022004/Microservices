import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { useLocation, useNavigate } from 'react-router-dom';

const ADMIN_TAB_PATHS = {
    products: '/admin/products',
    categories: '/admin/categories',
    orders: '/admin/orders',
    users: '/admin/users',
    reports: '/admin/reports'
};

function getActiveTabFromPath(pathname) {
    const match = Object.entries(ADMIN_TAB_PATHS).find(([, path]) => path === pathname);
    return match ? match[0] : 'products';
}

function normalizePaginationPayload(data) {
    const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    const pageInfo = data?.page || data;

    const numberValue = Number.isFinite(Number(pageInfo?.number)) ? Number(pageInfo.number) : 0;
    const totalPagesValue = Number.isFinite(Number(pageInfo?.totalPages)) ? Number(pageInfo.totalPages) : 0;

    return {
        content,
        number: numberValue,
        totalPages: totalPagesValue
    };
}

const AdminPanel = () => {
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
    
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [userFilters, setUserFilters] = useState({ role: '', status: '' });
    const lastQueryKeyRef = React.useRef('');
    
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('accessToken');
    const activeTab = getActiveTabFromPath(location.pathname);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setSearchTerm('');
        setDebouncedSearch('');
        setUserFilters({ role: '', status: '' });
        setData([]);
        setTotalPages(0);
        setPage(0);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchStats();
            return;
        }

        const queryKey = `${activeTab}|${debouncedSearch}|${userFilters.role}|${userFilters.status}`;

        if (lastQueryKeyRef.current !== queryKey) {
            lastQueryKeyRef.current = queryKey;
            if (page !== 0) {
                setPage(0);
                return;
            }
        }

        fetchData(page);
    }, [activeTab, page, debouncedSearch, userFilters]);

    const fetchData = async (targetPage) => {
        setLoading(true);
        setError(null);
        try {
            let url = '';
            let params = { page: targetPage, size: pageSize };

            if (activeTab === 'products') {
                url = `${API_GATEWAY}/api/products/paged`;
                if (debouncedSearch) params.search = debouncedSearch;
            } 
            else if (activeTab === 'categories') {
                url = `${API_GATEWAY}/api/categories/paged`;
                if (debouncedSearch) params.search = debouncedSearch; 
            } 
            else if (activeTab === 'orders' || activeTab === 'reports') {
                url = `${API_GATEWAY}/api/orders/admin`;
                if (debouncedSearch) params.order_id = debouncedSearch;
            } 
            else if (activeTab === 'users') {
                url = `${API_GATEWAY}/auth/admin/users`;
                if (debouncedSearch) params.query = debouncedSearch;
                if (userFilters.role) params.role = userFilters.role;
                if (userFilters.status !== '') params.isEnabled = userFilters.status === 'active';
            }

            const res = await axios.get(url, { 
                headers: { 'Authorization': `Bearer ${token}` },
                params: params 
            });

            const normalized = normalizePaginationPayload(res.data);
            setData(normalized.content);
            setTotalPages(normalized.totalPages);
            setPage(normalized.number);
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
        if (newPage >= 0 && newPage < totalPages) {
            setPage(newPage);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Xóa SP này?")) {
            await axios.delete(`${API_GATEWAY}/admin/products/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            fetchData(page);
        }
    };

    const handleToggleUserStatus = async (id) => {
        try {
            await axios.put(`${API_GATEWAY}/auth/admin/users/${id}/toggle-status`, {}, { headers: { 'Authorization': `Bearer ${token}` } });
            fetchData(page);
        } catch (err) {
            alert("Lỗi khi thay đổi trạng thái user.");
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        
        // Premium Pagination UI
        return (
            <div className="pagination-premium" style={{ 
                marginTop: 30, 
                display: 'flex', 
                gap: 8, 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '10px 0'
            }}>
                <button 
                    className="btn btn-ghost" 
                    disabled={page === 0} 
                    onClick={() => handlePageChange(0)}
                    style={{ padding: '8px 12px' }}
                >
                    &laquo; Đầu
                </button>
                <button 
                    className="btn btn-ghost" 
                    disabled={page === 0} 
                    onClick={() => handlePageChange(page - 1)}
                    style={{ padding: '8px 15px' }}
                >
                    &larr; Trước
                </button>

                <div className="page-indicator" style={{ 
                    padding: '8px 20px', 
                    background: 'rgba(15, 118, 110, 0.05)', 
                    borderRadius: 12,
                    border: '1px solid rgba(15, 118, 110, 0.1)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--brand)'
                }}>
                    Trang {Number(page) + 1} / {Number(totalPages)}
                </div>

                <button 
                    className="btn btn-ghost" 
                    disabled={page + 1 >= totalPages} 
                    onClick={() => handlePageChange(page + 1)}
                    style={{ padding: '8px 15px' }}
                >
                    Sau &rarr;
                </button>
                <button 
                    className="btn btn-ghost" 
                    disabled={page + 1 >= totalPages} 
                    onClick={() => handlePageChange(totalPages - 1)}
                    style={{ padding: '8px 12px' }}
                >
                    Cuối &raquo;
                </button>
            </div>
        );
    };

    return (
        <div className="page-shell">
            <div className="dashboard-wrap">
                <div className="dashboard-head">
                    <h1 className="dashboard-title">Hệ thống Quản trị</h1>
                    {activeTab === 'products' && (
                        <button className="btn btn-primary" onClick={() => navigate('/admin/products/new')}>+ Thêm sản phẩm</button>
                    )}
                </div>

                <div className="tabs" style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto' }}>
                    {[
                        { id: 'products', name: 'Sản phẩm' },
                        { id: 'categories', name: 'Danh mục' },
                        { id: 'orders', name: 'Đơn hàng' },
                        { id: 'users', name: 'Người dùng' },
                        { id: 'reports', name: 'Báo cáo' }
                    ].map(t => (
                        <button key={t.id} className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => navigate(ADMIN_TAB_PATHS[t.id])}>
                            {t.name}
                        </button>
                    ))}
                </div>

                {/* Search and Filters Area */}
                {activeTab !== 'reports' && (
                    <div className="card" style={{ padding: '15px 20px', marginBottom: 20, display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                            <input 
                                className="input" 
                                style={{ paddingLeft: 40 }} 
                                placeholder={`Tìm kiếm theo ${activeTab === 'products' ? 'ID hoặc Tên' : activeTab === 'orders' ? 'Mã đơn hàng' : activeTab === 'users' ? 'Username hoặc Email' : 'Tên danh mục'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        {activeTab === 'users' && (
                            <>
                                <select className="input" style={{ width: 140 }} value={userFilters.role} onChange={e => setUserFilters({...userFilters, role: e.target.value})}>
                                    <option value="">Tất cả Role</option>
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                                <select className="input" style={{ width: 140 }} value={userFilters.status} onChange={e => setUserFilters({...userFilters, status: e.target.value})}>
                                    <option value="">Tất cả Trạng thái</option>
                                    <option value="active">Hoạt động</option>
                                    <option value="locked">Đã khóa</option>
                                </select>
                            </>
                        )}
                    </div>
                )}

                <div className="card" style={{ padding: 25, minHeight: 500 }}>
                    {loading && <div style={{ textAlign: 'center', padding: '50px 0' }}><p>Đang tải dữ liệu...</p></div>}
                    {!loading && activeTab === 'reports' ? (
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
                            {!loading && data.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '40px 0' }}>Không tìm thấy kết quả nào phù hợp.</p>}
                            
                            {data.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8f9fa' }}>
                                        <tr style={{ textAlign: 'left' }}>
                                            {activeTab === 'products' && <><th>ID</th><th>Tên</th><th>Giá</th><th>Kho</th><th>Hành động</th></>}
                                            {activeTab === 'categories' && <><th>ID</th><th>Tên danh mục</th><th>Mô tả</th><th>Hành động</th></>}
                                            {activeTab === 'orders' && <><th>Mã Đơn</th><th>Tổng tiền</th><th>Trạng thái</th><th>Hành động</th></>}
                                            {activeTab === 'users' && <><th>Username</th><th>Email</th><th>Role</th><th>Trạng thái</th><th>Hành động</th></>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                {activeTab === 'products' && <>
                                                    <td style={{ padding: '15px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{item.product_id}</td>
                                                    <td><strong>{item.name}</strong></td>
                                                    <td>{item.price?.toLocaleString()} đ</td>
                                                    <td>{item.stock}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 10 }}>
                                                            <button className="btn btn-ghost" style={{ color: 'var(--brand)' }} onClick={() => navigate(`/admin/products/edit/${item.product_id}`)}>Sửa</button>
                                                            <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteProduct(item.product_id)}>Xóa</button>
                                                        </div>
                                                    </td>
                                                </>}
                                                {activeTab === 'categories' && <>
                                                    <td style={{ padding: 12 }}>{item.id}</td>
                                                    <td><strong>{item.name}</strong></td>
                                                    <td>{item.description}</td>
                                                    <td>
                                                        <button className="btn btn-ghost" style={{ color: 'var(--brand)' }} onClick={() => navigate(`/admin/categories/edit/${item.id}`)}>Sửa</button>
                                                    </td>
                                                </>}
                                                {activeTab === 'orders' && <>
                                                    <td style={{ padding: 12 }}>{item.order_id?.substring(0,8)}...</td>
                                                    <td>{item.total_price?.toLocaleString()} đ</td>
                                                    <td><span className="badge">{item.status}</span></td>
                                                    <td><button className="btn btn-ghost" onClick={() => navigate(`/payment/${item.order_id}`)}>Chi tiết</button></td>
                                                </>}
                                                {activeTab === 'users' && <>
                                                    <td style={{ padding: 12 }}>{item.username}</td>
                                                    <td>{item.email}</td>
                                                    <td><span className="badge" style={{ background: item.role === 'ADMIN' ? 'var(--accent)' : 'rgba(255,255,255,0.05)' }}>{item.role}</span></td>
                                                    <td>
                                                        <span style={{ color: item.isEnabled ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>
                                                            {item.isEnabled ? 'Hoạt động' : 'Đã khóa'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-ghost" onClick={() => handleToggleUserStatus(item.id)}>
                                                            {item.isEnabled ? 'Khóa' : 'Mở khóa'}
                                                        </button>
                                                    </td>
                                                </>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {renderPagination()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
