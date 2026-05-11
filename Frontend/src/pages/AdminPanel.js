import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';
import { useLocation, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Info, Plus } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff6b6b'];

const ADMIN_TAB_PATHS = {
    products: '/admin/products',
    categories: '/admin/categories',
    orders: '/admin/orders',
    users: '/admin/users',
    coupons: '/admin/coupons',
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
        statusStats: [], topProducts: [], totalUsers: 0, dailyChart: []
    });
    const [loading, setLoading] = useState(false);
    const [, setError] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [couponCategories, setCouponCategories] = useState([]);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        categoryName: '',
        type: 'PERCENT',
        value: '',
        maxUsage: '',
        minOrderValue: '',
        maxDiscountAmount: '',
        expiresAt: ''
    });

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageSize] = useState(7);
    
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
        if (!showCouponModal) return;

        const loadCategories = async () => {
            try {
                const res = await axios.get(`${API_GATEWAY}/api/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { page: 0, size: 100 }
                });
                setCouponCategories(res.data?.content || []);
            } catch {
                setCouponCategories([]);
            }
        };

        loadCategories();
    }, [showCouponModal, token]);

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
            else if (activeTab === 'coupons') {
                url = `${API_GATEWAY}/api/coupons/admin`;
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
                totalUsers: authRes.data.total_users,
                dailyChart: orderRes.data.daily_chart || []
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

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const isFixed = newCoupon.type === 'FIXED';
            const payload = {
                code: (newCoupon.code || '').trim().toUpperCase().slice(0, 15),
                categoryName: newCoupon.categoryName || 'ALL',
                type: newCoupon.type,
                value: Number(newCoupon.value),
                maxUsage: isFixed ? 1 : Number(newCoupon.maxUsage),
                minOrderValue: Number(newCoupon.minOrderValue),
                maxDiscountAmount: isFixed ? Number(newCoupon.value) : Number(newCoupon.maxDiscountAmount),
                expiresAt: `${newCoupon.expiresAt}T23:59:59`
            };

            await axios.post(`${API_GATEWAY}/api/coupons/admin`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setShowCouponModal(false);
            setNewCoupon({
                code: '',
                categoryName: '',
                type: 'PERCENT',
                value: '',
                maxUsage: '',
                minOrderValue: '',
                maxDiscountAmount: '',
                expiresAt: ''
            });
            fetchData(page);
        } catch (err) {
            alert("Lỗi tạo Coupon! " + (err.response?.data?.error || ''));
        }
    };

    const handleDeleteCoupon = async (id) => {
        if (window.confirm("Xóa Mã Giảm Giá này?")) {
            await axios.delete(`${API_GATEWAY}/api/coupons/admin/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            fetchData(page);
        }
    };

    const generateRandomCouponCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'CP';
        for (let i = 0; i < 8; i += 1) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewCoupon(prev => ({ ...prev, code: result.slice(0, 15) }));
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
        <div className="page-shell" style={{ padding: 'calc(var(--nav-height) + 16px) 20px 20px' }}>
            <div className="dashboard-wrap">
                <div className="dashboard-head" style={{ marginBottom: 12 }}>
                    <h1 className="dashboard-title" style={{ fontSize: '1.5rem' }}>Hệ thống Quản trị</h1>
                    {activeTab === 'products' && (
                        <button className="btn btn-primary" onClick={() => navigate('/admin/products/new')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={18} /> Thêm sản phẩm</button>
                    )}
                    {activeTab === 'coupons' && (
                        <button className="btn btn-primary" onClick={() => setShowCouponModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={18} /> Thêm Mã Giảm Giá</button>
                    )}
                </div>

                <div className="tabs" style={{ display: 'flex', gap: 10, marginBottom: 12, overflowX: 'auto' }}>
                    {[
                        { id: 'products', name: 'Sản phẩm' },
                        { id: 'categories', name: 'Danh mục' },
                        { id: 'orders', name: 'Đơn hàng' },
                        { id: 'users', name: 'Người dùng' },
                        { id: 'coupons', name: 'Mã giảm giá' },
                        { id: 'reports', name: 'Báo cáo' }
                    ].map(t => (
                        <button key={t.id} className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => navigate(ADMIN_TAB_PATHS[t.id])}>
                            {t.name}
                        </button>
                    ))}
                </div>

                {/* Search and Filters Area */}
                {activeTab !== 'reports' && (
                    <div className="card" style={{ padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex' }}><Search size={18} /></span>
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

                <div className="card" style={{ padding: '16px', minHeight: 400 }}>
                    {loading && <div style={{ textAlign: 'center', padding: '30px 0' }}><p>Đang tải dữ liệu...</p></div>}
                    {!loading && activeTab === 'reports' ? (
                        <div className="reports-area">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
                                <div className="card" style={{ padding: '12px 16px', background: '#f0f9ff', borderLeft: '4px solid #0ea5e9' }}>
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

                            <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
                                <h4 style={{ margin: '0 0 10px' }}>Biểu đồ Doanh thu (30 ngày)</h4>
                                <div style={{ height: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={stats.dailyChart}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                                            <YAxis tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 12}} />
                                            <Tooltip formatter={(value) => `${value.toLocaleString()} đ`} />
                                            <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="admin-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                                <div className="card" style={{ padding: '12px 16px' }}>
                                    <h4 style={{ margin: '0 0 10px' }}>Top Sản phẩm bán chạy</h4>
                                    <div style={{ height: 180 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.topProducts} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="product_name" type="category" width={100} tick={{fontSize: 12}} />
                                                <Tooltip />
                                                <Bar dataKey="total_sold" fill="#10b981" radius={[0, 4, 4, 0]}>
                                                    {stats.topProducts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="card" style={{ padding: '12px 16px' }}>
                                    <h4 style={{ margin: '0 0 10px' }}>Tỉ lệ Trạng thái Đơn hàng</h4>
                                    <div style={{ height: 180 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.statusStats}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="count"
                                                    nameKey="status"
                                                >
                                                    {stats.statusStats.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="table-area" style={{ overflowX: 'auto' }}>
                            {!loading && data.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5, padding: '20px 0' }}>Không tìm thấy kết quả nào phù hợp.</p>}
                            
                            {data.length > 0 && (
                                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{ background: '#f8f9fa' }}>
                                        <tr style={{ textAlign: 'left' }}>
                                            {activeTab === 'products' && <><th style={{padding: '8px 12px'}}>ID</th><th style={{padding: '8px 12px'}}>Tên</th><th style={{padding: '8px 12px'}}>Giá</th><th style={{padding: '8px 12px'}}>Kho</th><th style={{padding: '8px 12px'}}>Hành động</th></>}
                                            {activeTab === 'categories' && <><th style={{padding: '8px 12px'}}>ID</th><th style={{padding: '8px 12px'}}>Tên danh mục</th><th style={{padding: '8px 12px'}}>Mô tả</th><th style={{padding: '8px 12px'}}>Hành động</th></>}
                                            {activeTab === 'orders' && <><th style={{padding: '8px 12px'}}>Mã Đơn</th><th style={{padding: '8px 12px'}}>Tổng tiền</th><th style={{padding: '8px 12px'}}>Trạng thái</th><th style={{padding: '8px 12px'}}>Hành động</th></>}
                                            {activeTab === 'users' && <><th style={{padding: '8px 12px'}}>Username</th><th style={{padding: '8px 12px'}}>Email</th><th style={{padding: '8px 12px'}}>Role</th><th style={{padding: '8px 12px'}}>Trạng thái</th><th style={{padding: '8px 12px'}}>Hành động</th></>}
                                            {activeTab === 'coupons' && <><th style={{padding: '8px 12px'}}>Mã giảm giá</th><th style={{padding: '8px 12px'}}>Danh mục</th><th style={{padding: '8px 12px'}}>Loại</th><th style={{padding: '8px 12px'}}>Giá trị</th><th style={{padding: '8px 12px'}}>Giảm tối đa</th><th style={{padding: '8px 12px'}}>Hiệu lực</th><th style={{padding: '8px 12px'}}>Đã dùng</th><th style={{padding: '8px 12px'}}>Sở hữu</th><th style={{padding: '8px 12px'}}>Hành động</th></>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                {activeTab === 'products' && <>
                                                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{item.product_id}</td>
                                                    <td style={{ padding: '8px 12px' }}><strong>{item.name}</strong></td>
                                                    <td style={{ padding: '8px 12px' }}>{item.price?.toLocaleString()} đ</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.stock}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <button className="btn btn-ghost" style={{ color: 'var(--brand)', padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => navigate(`/admin/products/edit/${item.product_id}`)}>Sửa</button>
                                                            <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => handleDeleteProduct(item.product_id)}>Xóa</button>
                                                        </div>
                                                    </td>
                                                </>}
                                                {activeTab === 'categories' && <>
                                                    <td style={{ padding: '8px 12px' }}>{item.id}</td>
                                                    <td style={{ padding: '8px 12px' }}><strong>{item.name}</strong></td>
                                                    <td style={{ padding: '8px 12px' }}>{item.description}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <button className="btn btn-ghost" style={{ color: 'var(--brand)', padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => navigate(`/admin/categories/edit/${item.id}`)}>Sửa</button>
                                                    </td>
                                                </>}
                                                {activeTab === 'orders' && <>
                                                    <td style={{ padding: '8px 12px' }}>{item.order_id?.substring(0,8)}...</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.total_price?.toLocaleString()} đ</td>
                                                    <td style={{ padding: '8px 12px' }}><span className="badge" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>{item.status}</span></td>
                                                    <td style={{ padding: '8px 12px' }}><button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => navigate(`/payment/${item.order_id}`)}>Chi tiết</button></td>
                                                </>}
                                                {activeTab === 'users' && <>
                                                    <td style={{ padding: '8px 12px' }}>{item.username}</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.email}</td>
                                                    <td style={{ padding: '8px 12px' }}><span className="badge" style={{ background: item.role === 'ADMIN' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', padding: '3px 8px', fontSize: '0.75rem' }}>{item.role}</span></td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ color: item.isEnabled ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>
                                                            {item.isEnabled ? 'Hoạt động' : 'Đã khóa'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => handleToggleUserStatus(item.id)}>
                                                            {item.isEnabled ? 'Khóa' : 'Mở khóa'}
                                                        </button>
                                                    </td>
                                                </>}
                                                {activeTab === 'coupons' && <>
                                                    <td style={{ padding: '8px 12px' }}><strong>{item.code}</strong></td>
                                                    <td style={{ padding: '8px 12px' }}>{item.categoryName || 'ALL'}</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.type}</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.type === 'PERCENT' ? `${item.value}%` : `${item.value?.toLocaleString()} đ`}</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.maxDiscountAmount?.toLocaleString()} đ</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('vi-VN') : '-'}</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.usedCount} / {item.maxUsage || "∞"}</td>
                                                    <td style={{ padding: '8px 12px' }}>{item.ownerUserId?<span style={{ color: 'var(--accent)', fontSize: 12 }}>User #{item.ownerUserId}</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Công khai</span>}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                    <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '6px 10px', fontSize: '0.85rem' }} onClick={() => handleDeleteCoupon(item.id)}>Xóa</button>
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

                {showCouponModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div className="card" style={{ padding: 20, width: 400, maxWidth: '90%' }}>
                            <h3>Tạo Mã Giảm Giá</h3>
                            <form className="form-col" onSubmit={handleCreateCoupon}>
                                <div className="form-field">
                                    <label>Mã Code (nhập tay hoặc random, tối đa 15 ký tự)</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            className="input"
                                            maxLength={15}
                                            value={newCoupon.code}
                                            onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 15) })}
                                            placeholder="VD: TET2026"
                                            style={{ flex: 1 }}
                                        />
                                        <button className="btn btn-ghost" type="button" onClick={generateRandomCouponCode}>Random</button>
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Danh mục áp dụng</label>
                                    <select className="input" value={newCoupon.categoryName} onChange={e => setNewCoupon({ ...newCoupon, categoryName: e.target.value })}>
                                        <option value="">Tất cả danh mục</option>
                                        {couponCategories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Loại Giảm Giá</label>
                                    <select className="input" value={newCoupon.type} onChange={e => setNewCoupon({...newCoupon, type: e.target.value})}>
                                        <option value="PERCENT">Giảm theo %</option>
                                        <option value="FIXED">Giảm trực tiếp (đ)</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Giá trị (số % hoặc số tiền)</label>
                                    <input className="input" type="number" min="0" required value={newCoupon.value} onChange={e => setNewCoupon({...newCoupon, value: e.target.value})} />
                                </div>
                                {newCoupon.type !== 'FIXED' && (
                                <div className="form-field">
                                    <label>Số lượt sử dụng tối đa</label>
                                    <input className="input" type="number" min="1" required value={newCoupon.maxUsage} onChange={e => setNewCoupon({...newCoupon, maxUsage: e.target.value})} />
                                </div>
                                )}
                                {newCoupon.type === 'FIXED' && (
                                <div style={{ padding: '6px 10px', background: 'rgba(15, 118, 110, 0.06)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Info size={16} /> <span>Mã giảm cố định sẽ tự động giới hạn <strong>1 lượt sử dụng</strong> và giá trị giảm tối đa bằng giá trị mã.</span>
                                </div>
                                )}
                                <div className="form-field">
                                    <label>Đơn hàng tối thiểu (đ)</label>
                                    <input className="input" type="number" min="0" required value={newCoupon.minOrderValue} onChange={e => setNewCoupon({...newCoupon, minOrderValue: e.target.value})} />
                                </div>
                                {newCoupon.type !== 'FIXED' && (
                                <div className="form-field">
                                    <label>Giá trị tối đa được giảm (đ)</label>
                                    <input className="input" type="number" min="0" required value={newCoupon.maxDiscountAmount} onChange={e => setNewCoupon({...newCoupon, maxDiscountAmount: e.target.value})} />
                                </div>
                                )}
                                <div className="form-field">
                                    <label>Hiệu lực đến ngày</label>
                                    <input className="input" type="date" required value={newCoupon.expiresAt} onChange={e => setNewCoupon({...newCoupon, expiresAt: e.target.value})} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                    <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Tạo Code</button>
                                    <button className="btn btn-ghost" type="button" onClick={() => setShowCouponModal(false)} style={{ flex: 1 }}>Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
