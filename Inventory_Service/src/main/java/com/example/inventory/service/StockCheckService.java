package com.example.inventory.service;

import com.example.inventory.dto.CheckStockRequest;
import com.example.inventory.dto.CheckStockResponse;
import com.example.inventory.dto.ProductInfoCache;
import com.example.inventory.model.Product;
import com.example.inventory.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
/**
 * Service điều phối luồng kiểm tra và giữ chỗ tồn kho.
 * Ưu tiên lấy từ Redis trước, fallback DB khi cache chưa sẵn sàng.
 */
public class StockCheckService {

    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final ProductRepository productRepository;
    private final StockReservationService stockReservationService;
    private final ProductInfoCacheService productInfoCacheService;

    public StockCheckService(
            ProductRepository productRepository,
            StockReservationService stockReservationService,
            ProductInfoCacheService productInfoCacheService
    ) {
        this.productRepository = productRepository;
        this.stockReservationService = stockReservationService;
        this.productInfoCacheService = productInfoCacheService;
    }

    /**
     * Thực hiện kiểm tra/giữ chỗ tồn kho cho một yêu cầu mua hàng.
     *
     * Input:
     * - request: gồm productId và quantity.

     * Output:
     * - CheckStockResponse cho biết kết quả và thông điệp.
     */
    public CheckStockResponse checkStock(CheckStockRequest request) {
        if (!isValidCheckStockRequest(request)) {
            return new CheckStockResponse(false, "Dữ liệu kiểm tra kho không hợp lệ");
        }

        String productId = request.getProductId();
        int quantity = request.getQuantity();

        CheckStockResponse cacheResponse = tryReserveFromCache(productId, quantity);
        if (cacheResponse != null) {
            return cacheResponse;
        }

        return tryReserveFromDatabase(productId, quantity);
    }

    /**
     * Kiểm tra dữ liệu đầu vào cho API check stock.
     */
    private boolean isValidCheckStockRequest(CheckStockRequest request) {
        return request.getProductId() != null
                && !request.getProductId().isBlank()
                && request.getQuantity() != null
                && request.getQuantity() > 0;
    }

    /**
     * Giữ chỗ từ Redis nếu đã có cache thông tin sản phẩm và stock key.
     *
     * Output:
     * - Trả về CheckStockResponse khi xác định được kết quả.
     * - Trả về null để báo luồng gọi tiếp tục fallback DB.
     */
    private CheckStockResponse tryReserveFromCache(String productId, int quantity) {
        Optional<ProductInfoCache> optionalInfo = productInfoCacheService.get(productId);
        if (optionalInfo.isEmpty()) {
            return null;
        }

        StockReservationService.ReservationResult reserveResult = stockReservationService.reserve(productId, quantity);
        if (reserveResult == StockReservationService.ReservationResult.SUCCESS) {
            return new CheckStockResponse(true, "Đã giữ chỗ thành công (Redis)");
        }

        if (reserveResult == StockReservationService.ReservationResult.NOT_ENOUGH) {
            return new CheckStockResponse(false, "Hết hàng rồi (Redis)");
        }

        if (reserveResult == StockReservationService.ReservationResult.CACHE_MISS) {
            return null;
        }

        return null;
    }

    /**
     * Fallback sang DB khi cache miss, sau đó nạp lại cache và thử reserve lại trên Redis.
     */
    private CheckStockResponse tryReserveFromDatabase(String productId, int quantity) {
        Optional<Product> optionalProduct = productRepository.findByProductId(productId);
        if (optionalProduct.isEmpty()) {
            return new CheckStockResponse(false, "Không tìm thấy sản phẩm");
        }

        Product product = optionalProduct.get();
        if (product.getStock() < quantity) {
            return new CheckStockResponse(false, "Kho không đủ hàng (DB)");
        }

        stockReservationService.setStockIfAbsent(productId, product.getStock(), CACHE_TTL);
        productInfoCacheService.set(productId, product.getName(), product.getPrice(), CACHE_TTL);

        StockReservationService.ReservationResult reserveResult = stockReservationService.reserve(productId, quantity);
        if (reserveResult == StockReservationService.ReservationResult.SUCCESS) {
            return new CheckStockResponse(true, "Đã giữ chỗ thành công (DB)");
        }

        if (reserveResult == StockReservationService.ReservationResult.NOT_ENOUGH) {
            return new CheckStockResponse(false, "Kho không đủ hàng (Redis)");
        }

        return new CheckStockResponse(false, "Không thể giữ chỗ sản phẩm");
    }
}