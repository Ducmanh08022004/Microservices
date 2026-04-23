# 🗺️ Kế Hoạch Triển Khai End-to-End — 3 Phases

> **Dự án:** Microservices E-Commerce Platform  
> **Ngày lập:** 20/04/2026  
> **Mức độ chi tiết:** Production-ready, từng file / từng đoạn code

---

## 📐 Quy ước ký hiệu

| Ký hiệu | Nghĩa |
|---------|-------|
| `[MODIFY]` | Sửa file hiện có |
| `[NEW]` | Tạo file mới |
| `[MODIFY-MINOR]` | Sửa nhỏ (< 10 dòng) |
| 🔴 | Blocking — phải xong trước bước tiếp theo |
| 🟡 | Quan trọng nhưng không blocking |
| 🟢 | Nice-to-have |

---

# PHASE 1 — Sửa lỗi cốt lõi & Mock Data
> **Mục tiêu:** Xóa bỏ tất cả trải nghiệm người dùng bị vỡ. Mọi tính năng hiện có phải hiển thị dữ liệu thật.  
> **Ước tính:** 5–8 ngày làm việc

---

## Task 1.1 — Thêm `product_name` vào OrderResponse 🔴
> **Vấn đề:** `MyOrders.js` hiển thị `product_id` thô vì `OrderResponse` DTO không chứa `product_name`, mặc dù `OrderEntity` đã có trường `productName`.

### Backend — Order_Service

#### [MODIFY] `OrderResponse.java`
**Đường dẫn:** `Order_Service/src/main/java/com/example/order/dto/OrderResponse.java`

Thêm field `product_name` và `created_at` vào DTO:
```java
// Thêm sau field "status"
@JsonProperty("product_name")
private String productName;

@JsonProperty("created_at")
private LocalDateTime createdAt;

// Thêm getter/setter tương ứng
public String getProductName() { return productName; }
public void setProductName(String productName) { this.productName = productName; }
public LocalDateTime getCreatedAt() { return createdAt; }
public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
```

#### [MODIFY] `OrderApplicationService.java`
**Đường dẫn:** `Order_Service/src/main/java/com/example/order/service/OrderApplicationService.java`

Sửa phương thức `toOrderResponse()` ở dòng 122–130:
```java
private OrderResponse toOrderResponse(OrderEntity order) {
    OrderResponse response = new OrderResponse();
    response.setOrderId(order.getOrderId());
    response.setProductId(order.getProductId());
    response.setProductName(order.getProductName()); // ← THÊM
    response.setQuantity(order.getQuantity());
    response.setTotalPrice(order.getTotalPrice());
    response.setStatus(order.getStatus());
    response.setCreatedAt(order.getCreatedAt());     // ← THÊM
    return response;
}
```

### Frontend — MyOrders.js

#### [MODIFY] `MyOrders.js`
**Đường dẫn:** `Frontend/src/pages/MyOrders.js`

Sửa phần hiển thị tên sản phẩm (dòng 104–106):
```jsx
// TRƯỚC:
<p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 15 }}>
    🛍️ {order.product_id}
</p>

// SAU:
<p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 15 }}>
    🛍️ {order.product_name || order.product_id}
</p>
<p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: 12 }}>
    Mã SP: {order.product_id}
</p>
```

Thêm hiển thị ngày đặt hàng:
```jsx
// Thêm sau dòng "Số lượng":
{order.created_at && (
    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
        Ngày đặt: <b>{new Date(order.created_at).toLocaleDateString('vi-VN')}</b>
    </p>
)}
```

**Xác minh:** Build lại Order_Service → kiểm tra GET `/api/orders` trả về `product_name`.

---

## Task 1.2 — Thêm `GET /auth/me` và hoàn thiện Profile.js 🔴
> **Vấn đề:** `Profile.js` có form trống hoàn toàn. JWT token đã chứa `userId`, `email`, `username`, `role` — chỉ cần thêm endpoint và gọi khi mount.

### Backend — Auth_Service

#### [MODIFY] `AuthController.java`
**Đường dẫn:** `Auth_Service/src/main/java/com/example/demo/AuthController.java`

Thêm endpoint `GET /auth/me` sau method `updateProfile()`:
```java
@GetMapping("/me")
public ResponseEntity<?> getMe(Authentication auth) {
    return userRepository.findByUsername(auth.getName())
        .map(user -> ResponseEntity.ok(Map.of(
            "id",       user.getId(),
            "username", user.getUsername(),
            "email",    user.getEmail() != null ? user.getEmail() : "",
            "role",     user.getRole()
        )))
        .orElse(ResponseEntity.notFound().build());
}
```

> **Lưu ý Gateway:** Endpoint `/auth/me` yêu cầu Bearer token — Gateway đã xử lý nên không cần thêm cấu hình.

### Frontend — Profile.js

#### [MODIFY] `Profile.js`
**Đường dẫn:** `Frontend/src/pages/Profile.js`

Thay toàn bộ nội dung — thêm state và gọi `/auth/me` khi mount:
```jsx
const [currentUser, setCurrentUser] = useState(null);

useEffect(() => {
    axios.get(`${API_GATEWAY}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        setCurrentUser(res.data);
        setForm(prev => ({ ...prev, email: res.data.email || '' }));
    })
    .catch(() => {});
}, [token]);
```

Thêm header hiển thị username + role trong JSX (trước form):
```jsx
{currentUser && (
    <div style={{ marginBottom: 20, padding: '12px 16px', 
                  background: 'rgba(15,118,110,0.06)', borderRadius: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
            👤 {currentUser.username}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Role: <span style={{ 
                color: currentUser.role === 'ADMIN' ? 'var(--accent)' : 'var(--brand)', 
                fontWeight: 600 
            }}>{currentUser.role}</span>
        </div>
    </div>
)}
```

**Xác minh:** Login → vào `/profile` → thấy username + email đã điền sẵn.

---

## Task 1.3 — Route Guard Admin (PrivateRoute) 🔴
> **Vấn đề:** Không có bảo vệ phía Frontend. Bất kỳ ai biết URL `/admin` đều truy cập được (dù Gateway đã bảo vệ API, nhưng trang vẫn render).

### Frontend

#### [NEW] `src/components/PrivateRoute.js`
**Đường dẫn:** `Frontend/src/components/PrivateRoute.js`

```jsx
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
```

#### [MODIFY] `App.js`
**Đường dẫn:** `Frontend/src/App.js`

Import PrivateRoute và wrap các route cần bảo vệ:
```jsx
import PrivateRoute from './components/PrivateRoute';

// Thay tất cả route /admin/* và route user:
<Route path="/dashboard"   element={<PrivateRoute><Dashboard /></PrivateRoute>} />
<Route path="/product/:id" element={<PrivateRoute><ProductDetail /></PrivateRoute>} />
<Route path="/my-orders"   element={<PrivateRoute><MyOrders /></PrivateRoute>} />
<Route path="/payment/:orderId" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
<Route path="/profile"     element={<PrivateRoute><Profile /></PrivateRoute>} />

{/* Admin routes */}
<Route path="/admin"         element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
<Route path="/admin/products" element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
<Route path="/admin/categories" element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
<Route path="/admin/orders"  element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
<Route path="/admin/users"   element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
<Route path="/admin/reports" element={<PrivateRoute requiredRole="ADMIN"><AdminPanel /></PrivateRoute>} />
<Route path="/admin/products/new"      element={<PrivateRoute requiredRole="ADMIN"><AddProduct /></PrivateRoute>} />
<Route path="/admin/products/edit/:id" element={<PrivateRoute requiredRole="ADMIN"><AddProduct /></PrivateRoute>} />
<Route path="/admin/categories/edit/:id" element={<PrivateRoute requiredRole="ADMIN"><CategoryEdit /></PrivateRoute>} />
```

**Xác minh:** Đăng xuất → truy cập `/admin` → tự redirect về `/login`. Login với USER → truy cập `/admin` → redirect về `/dashboard`.

---

## Task 1.4 — Category Dropdown trong AddProduct 🟡
> **Vấn đề:** `AddProduct.js` nhập tên danh mục bằng text tự do, không có validation và có thể gây mismatch. Backend (`createProduct`) đã hỗ trợ `categoryId` kiểu `Long`.

### Frontend

#### [MODIFY] `AddProduct.js`
**Đường dẫn:** `Frontend/src/pages/AddProduct.js`

**1. Thêm state và fetch categories khi mount:**
```jsx
const [categories, setCategories] = useState([]);

useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get(`${API_GATEWAY}/api/categories`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page: 0, size: 100 }
    })
    .then(res => setCategories(res.data?.content || []))
    .catch(() => {});
}, []);
```

**2. Thay field formData.category bằng categoryId:**
```jsx
// formData state: thêm categoryId, bỏ category (string)
const [formData, setFormData] = useState({
    // ...existing fields...
    categoryId: null,    // ← THÊM (Long ID)
    // Xóa: category: ''
});
```

**3. Thay input text bằng select:**
```jsx
// TRƯỚC:
<input className="input" type="text"
    value={formData.category}
    onChange={(e) => setFormData({...formData, category: e.target.value})} />

// SAU:
<select className="input"
    value={formData.categoryId || ''}
    onChange={(e) => setFormData({
        ...formData, 
        categoryId: e.target.value ? Number(e.target.value) : null
    })}>
    <option value="">-- Chọn danh mục --</option>
    {categories.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
    ))}
</select>
```

**4. Khi load sản phẩm để edit, map category.id vào categoryId:**
```jsx
setFormData({
    // ...
    categoryId: p.category?.id || null,  // ← THÊM
});
```

### Backend — Inventory_Service

#### [MODIFY] `CreateProductRequest.java`
**Đường dẫn:** `Inventory_Service/src/main/java/com/example/inventory/dto/CreateProductRequest.java`

Đảm bảo field `categoryId` kiểu `Long` tồn tại (verify, không thêm nếu đã có):
```java
private Long categoryId;  // đã có trong service, confirm trong DTO
```

**Xác minh:** Mở form thêm SP → dropdown hiện đúng danh mục → tạo SP → category được gán đúng.

---

## Task 1.5 — Hiển thị thông tin sản phẩm trên Dashboard đúng hơn 🟢
> **Vấn đề:** Text "Đã xem nhiều" là hardcode, không có dữ liệu thật.

#### [MODIFY-MINOR] `Dashboard.js`
**Đường dẫn:** `Frontend/src/pages/Dashboard.js`  
Dòng 259: thay `"Đã xem nhiều"` bằng `{p.num_reviews ? `${p.num_reviews} đánh giá` : 'Mới'}`.

---

## Verification Plan — Phase 1

```
✅ Checklist Phase 1:
[ ] GET /api/orders → response có product_name, created_at
[ ] GET /auth/me → trả { id, username, email, role }
[ ] Profile.js mount → hiển thị username + email đúng
[ ] /admin khi chưa login → redirect /login
[ ] /admin khi login với USER → redirect /dashboard
[ ] /admin khi login với ADMIN → hiển thị bình thường
[ ] AddProduct form → dropdown hiện danh mục từ API
[ ] Tạo SP với category chọn từ dropdown → category đúng
[ ] MyOrders → hiển thị tên SP thay vì product_id
```

---

---

# PHASE 2 — Hoàn thiện nghiệp vụ
> **Mục tiêu:** Thêm các tính năng business logic còn thiếu: hủy đơn, phân trang, SMTP, timeout thanh toán, và chuẩn bị nền tảng cho tích hợp cổng thanh toán thật.  
> **Ước tính:** 10–15 ngày làm việc

---

## Task 2.1 — Hủy đơn hàng từ phía User 🔴

### Backend — Order_Service

#### [MODIFY] `OrderApplicationService.java`

Thêm method `cancelOrder()`:
```java
public Optional<OrderResponse> cancelOrder(String orderId, Long userId) {
    return orderRepository.findByOrderId(orderId).map(order -> {
        // Chỉ user chủ đơn mới được hủy
        if (!order.getUserId().equals(userId)) {
            throw new IllegalStateException("Bạn không có quyền hủy đơn này!");
        }
        // Chỉ được hủy khi đang ở trạng thái PROCESSING
        if (!"PROCESSING".equals(order.getStatus())) {
            throw new IllegalStateException(
                "Chỉ được hủy đơn ở trạng thái PROCESSING. " +
                "Trạng thái hiện tại: " + order.getStatus()
            );
        }
        order.setStatus("CANCELLED");
        return toOrderResponse(orderRepository.save(order));
    });
}
```

#### [MODIFY] `OrderController.java`

Thêm endpoint `POST /api/orders/{orderId}/cancel`:
```java
@PostMapping("/{orderId}/cancel")
public ResponseEntity<?> cancelOrder(
        @PathVariable String orderId,
        @RequestHeader(value = "X-User-Id", required = false) String xUserId
) {
    if (xUserId == null || xUserId.isBlank()) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "Bạn chưa đăng nhập!"));
    }
    try {
        Long userId = Long.valueOf(xUserId);
        Optional<OrderResponse> result = orderApplicationService.cancelOrder(orderId, userId);
        return result.<ResponseEntity<?>>map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Không tìm thấy đơn hàng")));
    } catch (IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", ex.getMessage()));
    }
}
```

#### [MODIFY] `STATUS_CONFIG` trong `MyOrders.js`

Thêm trạng thái CANCELLED:
```jsx
CANCELLED: { label: 'Đã hủy', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '🚫' },
```

#### [MODIFY] `MyOrders.js`

Thêm nút "Hủy đơn" trên mỗi card:
```jsx
{order.status === 'PROCESSING' && (
    <button
        className="btn btn-ghost"
        style={{ marginTop: 8, color: 'var(--danger)', fontSize: 12 }}
        onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm('Xác nhận hủy đơn hàng này?')) return;
            const token = localStorage.getItem('accessToken');
            try {
                await axios.post(
                    `${API_GATEWAY}/api/orders/${order.order_id}/cancel`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                // Reload danh sách
                setOrders(prev => prev.map(o =>
                    o.order_id === order.order_id 
                        ? { ...o, status: 'CANCELLED' } 
                        : o
                ));
            } catch (err) {
                alert(err?.response?.data?.error || 'Lỗi hủy đơn!');
            }
        }}
    >
        ✕ Hủy đơn
    </button>
)}
```

---

## Task 2.2 — Phân trang cho MyOrders 🟡

### Backend — Order_Service

#### [MODIFY] `OrderController.java`

Sửa endpoint `GET /api/orders` để hỗ trợ phân trang:
```java
@GetMapping
public ResponseEntity<?> listMyOrders(
    @RequestHeader(value = "X-User-Id", required = false) String xUserId,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
) {
    // ...
    Page<OrderResponse> result = orderApplicationService
        .getOrdersByUserIdPaged(userId, PageRequest.of(page, size, 
            Sort.by(Sort.Direction.DESC, "createdAt")));
    return ResponseEntity.ok(result);
}
```

#### [MODIFY] `OrderApplicationService.java`

Thêm method `getOrdersByUserIdPaged()`:
```java
public Page<OrderResponse> getOrdersByUserIdPaged(Long userId, Pageable pageable) {
    return orderRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable)
        .map(this::toOrderResponse);
}
```

#### [MODIFY] `OrderRepository.java`

Thêm method phân trang:
```java
Page<OrderEntity> findAllByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
```

### Frontend

#### [MODIFY] `MyOrders.js`

Thêm state và logic phân trang, tương tự `AdminPanel.js`.

---

## Task 2.3 — Cấu hình SMTP cho Notification Service 🔴

### Infrastructure

#### [MODIFY] `docker-compose.yml`

Thêm environment variables cho `notification-service`:
```yaml
notification-service:
  environment:
    SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    SPRING_MAIL_HOST: smtp.gmail.com
    SPRING_MAIL_PORT: 587
    SPRING_MAIL_USERNAME: ${MAIL_USERNAME}
    SPRING_MAIL_PASSWORD: ${MAIL_PASSWORD}      # App Password của Gmail
    SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH: true
    SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE: true
```

#### [MODIFY-MINOR] `.env.example`

Thêm vào file mẫu:
```
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_app_password_16_chars
```

#### [NEW] `.env`

Tạo file `.env` (không commit lên git) với giá trị thật:
```
MAIL_USERNAME=xxx@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

> **Hướng dẫn lấy App Password Gmail:**
> Google Account → Security → 2-Step Verification → App Passwords → Tạo password 16 ký tự.

---

## Task 2.4 — Payment Timeout: Tự động hủy đơn sau 30 phút 🟡

### Backend — Payment_Service

#### [NEW] `PaymentTimeoutScheduler.java`
**Đường dẫn:** `Payment_Service/src/main/java/com/example/payment/service/PaymentTimeoutScheduler.java`

```java
package com.example.payment.service;

import com.example.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class PaymentTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(PaymentTimeoutScheduler.class);
    private static final int TIMEOUT_MINUTES = 30;

    private final PaymentRepository paymentRepository;
    private final PaymentEventPublisher paymentEventPublisher;

    public PaymentTimeoutScheduler(PaymentRepository paymentRepository,
                                   PaymentEventPublisher paymentEventPublisher) {
        this.paymentRepository = paymentRepository;
        this.paymentEventPublisher = paymentEventPublisher;
    }

    /**
     * Chạy mỗi 5 phút, hủy các payment PROCESSING quá 30 phút.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    @Transactional
    public void cancelExpiredPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(TIMEOUT_MINUTES);
        int count = paymentRepository.cancelExpiredPayments(cutoff);
        if (count > 0) {
            log.info("Đã tự động hủy {} payment hết hạn (> {} phút)", count, TIMEOUT_MINUTES);
            // Publish event cho từng payment đã hủy nếu cần notify Order_Service
        }
    }
}
```

#### [MODIFY] `PaymentRepository.java`
**Đường dẫn:** `Payment_Service/src/main/java/com/example/payment/repository/PaymentRepository.java`

```java
@Modifying
@Query("UPDATE PaymentEntity p SET p.status = 'PAYMENT_FAILED', p.updatedAt = CURRENT_TIMESTAMP " +
       "WHERE p.status = 'PROCESSING' AND p.createdAt < :cutoff")
int cancelExpiredPayments(@Param("cutoff") LocalDateTime cutoff);
```

#### [MODIFY-MINOR] `PaymentServiceApplication.java`

Thêm `@EnableScheduling`:
```java
@SpringBootApplication
@EnableScheduling   // ← THÊM
public class PaymentServiceApplication { ... }
```

---

## Task 2.5 — HTML Email Template 🟢

### Backend — Notification_Service

#### [MODIFY] `EmailService.java`

Thay `SimpleMailMessage` bằng `MimeMessage` để hỗ trợ HTML:
```java
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;

public void sendEmail(String to, String subject, String htmlContent) {
    try {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true); // true = isHtml
        mailSender.send(message);
    } catch (Exception e) {
        throw new RuntimeException("Lỗi gửi email: " + e.getMessage(), e);
    }
}
```

#### [NEW] `EmailTemplates.java`
**Đường dẫn:** `Notification_Service/src/main/java/com/example/demo/EmailTemplates.java`

```java
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
```

---

## Verification Plan — Phase 2

```
✅ Checklist Phase 2:
[ ] POST /api/orders/{id}/cancel với đúng user → status = CANCELLED
[ ] POST /api/orders/{id}/cancel với user khác → 403 CONFLICT
[ ] POST /api/orders/{id}/cancel khi status = PAID → lỗi đúng
[ ] MyOrders → nút "Hủy đơn" xuất hiện khi PROCESSING
[ ] Phân trang MyOrders hoạt động
[ ] Notification Service khởi động không lỗi khi có SMTP env
[ ] Gửi email thật khi tạo đơn (kiểm tra hộp thư)
[ ] Payment quá 30 phút → tự chuyển PAYMENT_FAILED (test bằng cách đổi threshold thành 1 phút)
```

---

---

# PHASE 3 — Tính năng nâng cao
> **Mục tiêu:** Nâng tầm sản phẩm lên production-grade với các tính năng quan trọng cho e-commerce.  
> **Ước tính:** 15–25 ngày làm việc

---

## Task 3.1 — Hệ thống đánh giá sản phẩm (Product Reviews) 🔴

### Architecture Decision
Reviews sẽ được thêm vào **Inventory_Service** (không tạo service mới) vì liên quan trực tiếp đến Product data. Rating trung bình sẽ được tính toán và lưu vào `Product.rating`.

### Backend — Inventory_Service

#### [NEW] `Review.java` (Entity)
**Đường dẫn:** `Inventory_Service/src/main/java/com/example/inventory/model/Review.java`

```java
@Entity
@Table(name = "reviews", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "user_id"}))
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "product_id", nullable = false)
    private String productId;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "username", nullable = false)
    private String username;
    
    @Column(name = "rating", nullable = false)     // 1–5
    private Integer rating;
    
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
    // getters, setters...
}
```

#### [NEW] `ReviewRepository.java`

```java
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductIdOrderByCreatedAtDesc(String productId);
    boolean existsByProductIdAndUserId(String productId, Long userId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.productId = :productId")
    Double getAverageRating(@Param("productId") String productId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.productId = :productId")
    Long countByProductId(@Param("productId") String productId);
}
```

#### [NEW] `ReviewController.java`

```java
@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ReviewController {
    
    // GET /api/products/{productId}/reviews → danh sách review
    @GetMapping
    public ResponseEntity<?> getReviews(@PathVariable String productId) { ... }
    
    // POST /api/products/{productId}/reviews → tạo review (cần login)
    // Validation: user phải có đơn PAID với sản phẩm này (optional strictness)
    @PostMapping
    public ResponseEntity<?> createReview(
        @PathVariable String productId,
        @RequestBody ReviewRequest request,
        @RequestHeader("X-User-Id") String userId,
        @RequestHeader("X-User-Email") String userEmail
    ) { ... }
}
```

#### Logic cập nhật rating:
Sau mỗi review mới, gọi `updateProductRating(productId)`:
```java
private void updateProductRating(String productId) {
    Double avg = reviewRepository.getAverageRating(productId);
    Long count = reviewRepository.countByProductId(productId);
    productRepository.findByProductId(productId).ifPresent(p -> {
        p.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
        p.setNumReviews(count.intValue());
        productRepository.save(p);
    });
}
```

### Frontend

#### [MODIFY] `Product_Detail.js`

Thêm section Reviews bên dưới nút mua:
```jsx
// State:
const [reviews, setReviews] = useState([]);
const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
const [reviewSubmitting, setReviewSubmitting] = useState(false);

// Hiển thị danh sách review + form gửi đánh giá
// StarRating component: 5 ô ★ có thể click
```

**Star Rating Component** (inline trong Product_Detail.js):
```jsx
function StarRating({ value, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(star => (
                <span 
                    key={star}
                    onClick={() => onChange && onChange(star)}
                    style={{ 
                        fontSize: 24, cursor: onChange ? 'pointer' : 'default',
                        color: star <= value ? '#f59e0b' : '#d1d5db'
                    }}
                >★</span>
            ))}
        </div>
    );
}
```

---

## Task 3.2 — Giỏ hàng (Shopping Cart) 🔴

### Architecture Decision
Cart lưu trong **localStorage** (không cần backend riêng) — phù hợp MVP, đơn giản, không cần service mới. Khi checkout, tạo nhiều đơn hàng hoặc gộp vào 1 đơn.

### Frontend

#### [NEW] `src/context/CartContext.js`

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.product_id);
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
    };
    
    const removeFromCart = (productId) => 
        setCart(prev => prev.filter(i => i.product_id !== productId));
    
    const updateQuantity = (productId, quantity) =>
        setCart(prev => prev.map(i => 
            i.product_id === productId ? { ...i, quantity } : i));
    
    const clearCart = () => setCart([]);
    
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = cart.reduce((sum, i) => 
        sum + (i.discount_price || i.price) * i.quantity, 0);

    return (
        <CartContext.Provider value={{ 
            cart, addToCart, removeFromCart, updateQuantity, 
            clearCart, totalItems, totalPrice 
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
```

#### [NEW] `src/pages/CartPage.js`

Trang giỏ hàng với danh sách items, update quantity, remove, checkout button.

#### [MODIFY] `Product_Detail.js`

Thêm nút "Thêm vào giỏ" bên cạnh "Mua ngay":
```jsx
import { useCart } from '../context/CartContext';
const { addToCart } = useCart();

<button className="btn btn-ghost" onClick={() => {
    addToCart(product, Number(quantity));
    alert(`Đã thêm ${product.name} vào giỏ!`);
}}>
    🛒 Thêm vào giỏ
</button>
```

#### [MODIFY] `Navbar.js`

Hiển thị badge số lượng item trong giỏ:
```jsx
import { useCart } from '../context/CartContext';
const { totalItems } = useCart();

// Trong navbar:
<button onClick={() => navigate('/cart')}>
    🛒 {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
</button>
```

#### [MODIFY] `App.js`

Wrap toàn bộ app trong `CartProvider`:
```jsx
import { CartProvider } from './context/CartContext';

function App() {
    return (
        <CartProvider>
            <Router><AppRoutes /></Router>
        </CartProvider>
    );
}
```

### Backend — Order_Service

#### [MODIFY] `CreateOrderRequest.java`

Hỗ trợ mua nhiều sản phẩm (batch order):
```java
// Option A: tạo nhiều đơn 1 lần - đơn giản nhất
// POST /api/orders/batch → body: [ {product_id, quantity}, ... ]
// Tạo từng đơn, trả về danh sách orderId
```

#### [NEW] Endpoint batch order trong `OrderController.java`:
```java
@PostMapping("/batch")
public ResponseEntity<?> createBatchOrders(
    @RequestBody List<CreateOrderRequest> requests,
    @RequestHeader("X-User-Id") String xUserId,
    @RequestHeader("X-User-Email") String xUserEmail
) { ... }
```

---

## Task 3.3 — Nâng cấp Dashboard Báo cáo Admin (Charts) 🟡

### Frontend

#### [MODIFY] `AdminPanel.js` — tab Reports

Thêm thư viện Chart.js qua CDN hoặc `npm install chart.js react-chartjs-2`.

**Hoặc** sử dụng thư viện nhẹ hơn: `npm install recharts`

##### Biểu đồ 1: Doanh thu theo ngày/tuần/tháng (Line Chart)
```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Cần thêm API backend trả dữ liệu theo ngày:
// GET /api/orders/admin/stats/daily?days=30
// Response: [{date: "2026-04-01", revenue: 1500000}, ...]
```

##### Biểu đồ 2: Top sản phẩm (Bar Chart — đã có data từ `topProducts`)
```jsx
import { BarChart, Bar, Cell } from 'recharts';
```

##### Biểu đồ 3: Tỉ lệ trạng thái đơn (Pie Chart — đã có data từ `statusStats`)
```jsx
import { PieChart, Pie, Cell, Legend } from 'recharts';
```

### Backend — Order_Service (cần cho Line chart)

#### [NEW] Query lấy doanh thu theo ngày trong `OrderRepository.java`:
```java
@Query(value = """
    SELECT DATE(created_at) as date, SUM(total_price) as revenue
    FROM orders
    WHERE status IN ('PAID', 'DELIVERED') 
      AND created_at >= :since
    GROUP BY DATE(created_at)
    ORDER BY date ASC
    """, nativeQuery = true)
List<Map<String, Object>> getDailyRevenue(@Param("since") LocalDateTime since);
```

#### [MODIFY] `OrderApplicationService.getAdminStats()`:
```java
// Thêm vào map stats:
stats.put("daily_chart", orderRepository.getDailyRevenue(
    LocalDateTime.now().minusDays(30)
));
// Thêm inventory alert:
// stats.put("low_stock_products", ...) // cần HTTP call sang Inventory
```

---

## Task 3.4 — Wishlist / Yêu thích sản phẩm 🟢

### Architecture Decision
Wishlist lưu trong **localStorage** (giống Cart) — đơn giản, không cần backend.

### Frontend

#### [NEW] `src/context/WishlistContext.js`

Tương tự CartContext nhưng chỉ lưu productId list:
```jsx
// addToWishlist(productId), removeFromWishlist(productId), isWishlisted(productId)
```

#### [MODIFY] `Dashboard.js` — Product Card

Thêm nút ❤️ góc trên phải mỗi card:
```jsx
import { useWishlist } from '../context/WishlistContext';
const { isWishlisted, addToWishlist, removeFromWishlist } = useWishlist();

<div className="product-card__wishlist" 
     onClick={(e) => {
         e.stopPropagation();
         isWishlisted(p.product_id)
             ? removeFromWishlist(p.product_id)
             : addToWishlist(p.product_id);
     }}
     style={{ position: 'absolute', top: 8, right: 8 }}>
    {isWishlisted(p.product_id) ? '❤️' : '🤍'}
</div>
```

#### [NEW] `src/pages/WishlistPage.js`

Trang hiển thị danh sách yêu thích.

---

## Task 3.5 — Mã giảm giá (Coupon/Voucher) 🟢

### Backend — Order_Service

#### [NEW] `Coupon.java` (Entity)
```java
@Entity @Table(name = "coupons")
public class Coupon {
    @Id @GeneratedValue private Long id;
    @Column(unique = true) private String code;       // "SUMMER20"
    private CouponType type;                          // PERCENT | FIXED
    private Double value;                             // 20 (%) hoặc 50000 (VNĐ)
    private Double minOrderValue;                     // Đơn tối thiểu
    private Integer maxUsage;                         // Tổng lần dùng
    private Integer usedCount;
    private LocalDateTime expiresAt;
    private Boolean isActive;
}
```

#### [NEW] `CouponController.java` — endpoint:
- `POST /api/coupons/validate` → kiểm tra coupon hợp lệ, trả về discount amount
- `GET /api/admin/coupons` → quản lý coupon (Admin)
- `POST /api/admin/coupons` → tạo coupon mới

### Frontend

#### [MODIFY] `Product_Detail.js`

Thêm input nhập mã giảm giá trước nút Mua:
```jsx
const [couponCode, setCouponCode] = useState('');
const [couponDiscount, setCouponDiscount] = useState(0);

const validateCoupon = async () => {
    const res = await axios.post(`${API_GATEWAY}/api/coupons/validate`, {
        code: couponCode,
        order_value: (product.discount_price || product.price) * quantity
    }, { headers: { Authorization: `Bearer ${token}` } });
    setCouponDiscount(res.data.discount_amount);
};
```

---

## Task 3.6 — Refresh Token & Auto Re-login 🟡

> **Vấn đề:** JWT hiện tại hết hạn sau 1 giờ (hardcode trong `JwtService.java`). Người dùng bị kick ra mà không có cảnh báo.

### Backend — Auth_Service

#### [MODIFY] `JwtService.java`

Thêm `generateRefreshToken()` với thời hạn 7 ngày.

#### [MODIFY] `AuthController.java`

Thêm endpoint `POST /auth/refresh-token`:
```java
@PostMapping("/refresh-token")
public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
    String refreshToken = body.get("refreshToken");
    // Validate refresh token → generate new access token
    // Return: { accessToken, refreshToken }
}
```

### Frontend

#### [NEW] `src/api.js` (Axios Interceptor)

Thêm interceptor tự động refresh token khi nhận 401:
```jsx
import axios from 'axios';
import { API_GATEWAY } from './config';

const api = axios.create({ baseURL: API_GATEWAY });

api.interceptors.response.use(
    response => response,
    async error => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post(`${API_GATEWAY}/auth/refresh-token`, 
                    { refreshToken });
                localStorage.setItem('accessToken', res.data.accessToken);
                original.headers.Authorization = `Bearer ${res.data.accessToken}`;
                return api(original);
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
```

Sau đó thay toàn bộ `import axios from 'axios'` thành `import api from '../api'` trong các page.

---

## Verification Plan — Phase 3

```
✅ Checklist Phase 3:
[ ] GET /api/products/{id}/reviews → danh sách review đúng
[ ] POST review → rating trung bình cập nhật trên product
[ ] Không thể review cùng SP 2 lần (unique constraint)
[ ] Giỏ hàng persist khi refresh trang (localStorage)
[ ] Checkout từ giỏ hàng → tạo đơn thành công
[ ] Nút ❤️ wishlist toggle hoạt động
[ ] Nhập mã coupon hợp lệ → giảm giá đúng
[ ] Nhập mã coupon hết hạn → thông báo lỗi
[ ] Admin Reports → chart doanh thu theo ngày hiển thị
[ ] Token hết hạn → tự refresh, không redirect về login
[ ] Refresh token hết hạn → redirect về login
```

---

---

# 📊 Timeline tổng hợp

```
Tháng 4 (còn lại):   Phase 1 — Tuần 4
  Ngày 1–2:  Task 1.1 (product_name) + Task 1.2 (auth/me + Profile)
  Ngày 3:    Task 1.3 (Route Guard)
  Ngày 4:    Task 1.4 (Category Dropdown)  
  Ngày 5:    Testing + Fix bugs Phase 1

Tháng 5:             Phase 2
  Tuần 1:    Task 2.1 (Cancel Order) + Task 2.2 (Phân trang)
  Tuần 2:    Task 2.3 (SMTP) + Task 2.4 (Payment Timeout)
  Tuần 3:    Task 2.5 (HTML Email) + Testing Phase 2

Tháng 5–6:           Phase 3
  Tuần 1–2:  Task 3.1 (Reviews) — phức tạp nhất Phase 3
  Tuần 2–3:  Task 3.2 (Cart)
  Tuần 3:    Task 3.3 (Charts nâng cao) + Task 3.6 (Refresh Token)
  Tuần 4:    Task 3.4 (Wishlist) + Task 3.5 (Coupon)
  Tuần 5:    E2E Testing + Polish
```

---

# 🏁 Thứ tự thực hiện được khuyến nghị

```
1. Task 1.1  ✓ Dễ, impact cao, chỉ sửa 2 file
2. Task 1.2  ✓ Dễ, cải thiện UX ngay
3. Task 1.3  ✓ Cần làm trước khi demo cho người khác
4. Task 1.4  ✓ Sửa UX, logic đã sẵn ở backend
5. Task 2.3  ✓ Cấu hình SMTP — cần environment thật
6. Task 2.1  ✓ Cancel order — nghiệp vụ quan trọng
7. Task 2.4  ✓ Timeout — tránh đơn zombie
8. Task 3.6  ✓ Refresh token — production necessity
9. Task 3.2  ✓ Cart — feature killer của e-commerce
10. Task 3.1 ✓ Reviews — social proof
11. Task 3.3 ✓ Charts — báo cáo đẹp hơn
12. Task 3.4 ✓ Wishlist — nice-to-have
13. Task 3.5 ✓ Coupon — marketing tool
14. Task 2.2 ✓ Phân trang MyOrders — QoL
15. Task 2.5 ✓ HTML Email — polish
```
