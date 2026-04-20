import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Bảo vệ route: kiểm tra JWT token và role yêu cầu.
 * Props:
 *   - requiredRole: 'ADMIN' | 'USER' | null (null = chỉ cần đăng nhập)
 *   - children: component cần bảo vệ
 */
function PrivateRoute({ children, requiredRole = null }) {
    const token = localStorage.getItem('accessToken');
    if (!token) return <Navigate to="/login" replace />;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Kiểm tra token hết hạn
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            localStorage.removeItem('accessToken');
            return <Navigate to="/login" replace />;
        }

        // Kiểm tra role
        if (requiredRole && payload.role !== requiredRole) {
            return <Navigate to="/dashboard" replace />;
        }

        return children;
    } catch {
        return <Navigate to="/login" replace />;
    }
}

export default PrivateRoute;
