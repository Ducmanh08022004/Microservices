import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_GATEWAY } from '../config';

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Bạn chưa đăng nhập!');
      setLoading(false);
      return;
    }
    axios.get(`${API_GATEWAY}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setOrders(res.data))
      .catch(() => setError('Không lấy được đơn hàng!'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h2>Đơn hàng của tôi</h2>
      {orders.length === 0 ? <p>Chưa có đơn hàng nào.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: 8 }}>Mã đơn</th>
              <th style={{ padding: 8 }}>Sản phẩm</th>
              <th style={{ padding: 8 }}>Số lượng</th>
              <th style={{ padding: 8 }}>Tổng tiền</th>
              <th style={{ padding: 8 }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.order_id}>
                <td style={{ padding: 8 }}>{order.order_id}</td>
                <td style={{ padding: 8 }}>{order.product_id}</td>
                <td style={{ padding: 8 }}>{order.quantity}</td>
                <td style={{ padding: 8 }}>{order.total_price}</td>
                <td style={{ padding: 8 }}>{order.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MyOrders;
