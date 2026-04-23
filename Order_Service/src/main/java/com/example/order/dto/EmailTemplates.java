package com.example.order.dto;

public class EmailTemplates {
    public static String paymentSuccess(String username, String orderId, double amount) {
        return """
            <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #374151;">
              <div style="background: #15803d; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h2 style="margin:0">Thanh toán thành công</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>Xin chào <strong>%s</strong>,</p>
                <p>Cảm ơn bạn! Giao dịch cho đơn hàng <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px">%s</code> 
                   đã được hoàn tất thành công.</p>
                
                <div style="background:#f0fdf4; border-left:4px solid #16a34a; padding:16px; margin:24px 0;">
                  <span style="display:block; color:#166534; font-size:14px; margin-bottom:4px;">Số tiền đã thanh toán:</span>
                  <strong style="font-size:20px; color:#15803d;">%,.0f VNĐ</strong>
                </div>

                <p>Đơn hàng của bạn hiện đang được chuyển sang bộ phận chuẩn bị hàng và sẽ sớm được giao đến bạn.</p>
                
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                
                <p style="color:#6b7280; font-size:13px; line-height: 1.5;">
                  Nếu có bất kỳ thắc mắc nào về giao dịch này, vui lòng liên hệ với bộ phận chăm sóc khách hàng của chúng tôi để được hỗ trợ nhanh nhất.
                </p>
              </div>
            </body></html>
            """.formatted(username, orderId, amount);
    }
}