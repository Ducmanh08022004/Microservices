package com.example.order.service;

public class EmailTemplates {
    public static String orderConfirmation(String username, String orderId, double amount) {
        return """
            <html><body style="font-family: Arial; max-width: 600px; margin: auto;">
              <div style="background: #0f766e; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin:0">🛍️ Xác nhận đơn hàng</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>Xin chào <strong>%s</strong>,</p>
                <p>Đơn hàng <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px">%s</code> 
                   của bạn đã được tạo thành công.</p>
                <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px 16px;margin:20px 0">
                  <strong>Tổng tiền:</strong> %,.0f VNĐ
                </div>
                <p style="color:#6b7280;font-size:13px">
                  Vui lòng hoàn thành thanh toán để hệ thống xử lý đơn hàng.
                </p>
              </div>
            </html>
            """.formatted(username, orderId, amount);
    }
}
