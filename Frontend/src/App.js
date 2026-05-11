import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './api'; // Global interceptor
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AddProduct from './pages/AddProduct';
import ProductDetail from './pages/Product_Detail';
import MyOrders from './pages/MyOrders';
import PaymentPage from './pages/PaymentPage';
import VnPayReturnPage from './pages/VnPayReturnPage';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import CategoryEdit from './pages/CategoryEdit';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

function AppRoutes() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/' || location.pathname === '/register' || location.pathname === '/forgot-password';
  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />

        {/* User routes — cần đăng nhập */}
        <Route path="/dashboard"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/product/:id"      element={<PrivateRoute><ProductDetail /></PrivateRoute>} />
        <Route path="/my-orders"        element={<PrivateRoute><MyOrders /></PrivateRoute>} />
        <Route path="/payment/vnpay-return" element={<VnPayReturnPage />} />
        <Route path="/payment/:orderId" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
        <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Admin routes — cần role ADMIN */}
        <Route path="/admin"                     element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/products"            element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/categories"          element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/orders"              element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/users"               element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/coupons"             element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/reports"             element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/add-product"         element={<PrivateRoute requiredRole="ADMIN"><AddProduct /></PrivateRoute>} />
        <Route path="/admin/products/new"        element={<PrivateRoute requiredRole="ADMIN"><AddProduct /></PrivateRoute>} />
        <Route path="/admin/product/edit/:id"    element={<PrivateRoute requiredRole="ADMIN"><AddProduct /></PrivateRoute>} />
        <Route path="/admin/products/edit/:id"   element={<PrivateRoute requiredRole="ADMIN"><AddProduct /></PrivateRoute>} />
        <Route path="/admin/categories/edit/:id" element={<PrivateRoute requiredRole="ADMIN"><CategoryEdit /></PrivateRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <CartProvider>
        <WishlistProvider>
          <AppRoutes />
        </WishlistProvider>
      </CartProvider>
    </Router>
  );
}

export default App;