import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login'; // Đảm bảo bạn đã tạo file này
import Dashboard from './pages/Dashboard'; // Đảm bảo bạn đã tạo file này
import AddProduct from './pages/AddProduct'; // Đảm bảo bạn đã tạo file này
import ProductDetail from './pages/Product_Detail'; // Đảm bảo bạn đã tạo file này

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Login />} /> {/* Mặc định vào Login */}
        <Route path="/admin/add-product" element={<AddProduct />} />
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </Router>
  );
}

export default App;