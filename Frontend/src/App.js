import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/Product_Detail';
import MyOrders from './pages/MyOrders';
import PaymentPage from './pages/PaymentPage';
import Navbar from './components/Navbar';

import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import CategoryEdit from './pages/CategoryEdit';

function AppRoutes() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/' || location.pathname === '/register';
  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/products" element={<AdminPanel />} />
        <Route path="/admin/categories" element={<AdminPanel />} />
        <Route path="/admin/orders" element={<AdminPanel />} />
        <Route path="/admin/users" element={<AdminPanel />} />
        <Route path="/admin/reports" element={<AdminPanel />} />
        <Route path="/admin/add-product" element={<AddProduct />} />
        <Route path="/admin/products/new" element={<AddProduct />} />
        <Route path="/admin/product/edit/:id" element={<AddProduct />} />
        <Route path="/admin/products/edit/:id" element={<AddProduct />} />
        <Route path="/admin/categories/edit/:id" element={<CategoryEdit />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/payment/:orderId" element={<PaymentPage />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;