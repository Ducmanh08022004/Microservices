package com.example.inventory.controller;

import com.example.inventory.dto.CreateProductRequest;
import com.example.inventory.model.Category;
import com.example.inventory.repository.CategoryRepository;
import com.example.inventory.service.ProductCatalogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/seed")
public class DataSeederController {

    private final ProductCatalogService productCatalogService;
    private final CategoryRepository categoryRepository;
    private final com.example.inventory.repository.ProductRepository productRepository;
    private final com.cloudinary.Cloudinary cloudinary;
    private final Random random = new Random();

    @Autowired
    public DataSeederController(ProductCatalogService productCatalogService, 
                                CategoryRepository categoryRepository,
                                com.example.inventory.repository.ProductRepository productRepository,
                                com.cloudinary.Cloudinary cloudinary) {
        this.productCatalogService = productCatalogService;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.cloudinary = cloudinary;
    }

    @GetMapping("/sync-cloudinary")
    public ResponseEntity<?> syncCloudinary() {
        List<com.example.inventory.model.Product> products = productRepository.findAll();
        int updatedCount = 0;
        
        for (com.example.inventory.model.Product product : products) {
            String currentUrl = product.getImageUrl();
            // Chỉ up lên nếu ảnh chưa phải là của cloudinary
            if (currentUrl != null && !currentUrl.contains("cloudinary.com") && currentUrl.startsWith("http")) {
                try {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> uploadResult = (Map<String, Object>) cloudinary.uploader().upload(currentUrl, com.cloudinary.utils.ObjectUtils.asMap(
                        "folder", "products"
                    ));
                    String newUrl = (String) uploadResult.get("secure_url");
                    product.setImageUrl(newUrl);
                    productRepository.save(product);
                    updatedCount++;
                } catch (Exception e) {
                    System.err.println("Lỗi upload SP " + product.getProductId() + ": " + e.getMessage());
                }
            }
        }
        return ResponseEntity.ok(Map.of("message", "Đã đồng bộ thành công " + updatedCount + " ảnh lên Cloudinary."));
    }

    private static class ProductTemplate {
        String name;
        String brand;
        String category;
        String imgKeyword;

        public ProductTemplate(String name, String brand, String category, String imgKeyword) {
            this.name = name;
            this.brand = brand;
            this.category = category;
            this.imgKeyword = imgKeyword;
        }
    }

    @PostMapping("/products")
    public ResponseEntity<?> seedProducts(@RequestParam(defaultValue = "1000") int count) {
        try {
            // 1. Data Templates
            List<ProductTemplate> templates = Arrays.asList(
                // Electronics
                new ProductTemplate("iPhone 15 Pro Max", "Apple", "Electronics", "iphone,smartphone"),
                new ProductTemplate("MacBook Pro M3", "Apple", "Electronics", "laptop,macbook"),
                new ProductTemplate("Galaxy S24 Ultra", "Samsung", "Electronics", "samsung,phone"),
                new ProductTemplate("Sony WH-1000XM5", "Sony", "Electronics", "headphones"),
                new ProductTemplate("Dell XPS 15", "Dell", "Electronics", "laptop,dell"),
                new ProductTemplate("PlayStation 5", "Sony", "Electronics", "console,ps5"),
                new ProductTemplate("iPad Air", "Apple", "Electronics", "tablet,ipad"),
                new ProductTemplate("Logitech MX Master 3S", "Logitech", "Electronics", "mouse,tech"),
                
                // Fashion
                new ProductTemplate("Nike Air Max 270", "Nike", "Fashion", "shoes,nike"),
                new ProductTemplate("Adidas Ultraboost", "Adidas", "Fashion", "sneakers,adidas"),
                new ProductTemplate("Classic White T-Shirt", "Uniqlo", "Fashion", "tshirt,clothing"),
                new ProductTemplate("Denim Jeans 501", "Levi's", "Fashion", "jeans,denim"),
                new ProductTemplate("Running Shorts", "Nike", "Fashion", "shorts,sportswear"),
                new ProductTemplate("Leather Handbag", "Gucci", "Fashion", "handbag,luxury"),
                new ProductTemplate("Winter Down Jacket", "The North Face", "Fashion", "jacket,winter"),
                
                // Home & Garden
                new ProductTemplate("Comfy Velvet Sofa", "IKEA", "Home & Garden", "sofa,furniture"),
                new ProductTemplate("Wooden Dining Table", "IKEA", "Home & Garden", "table,interior"),
                new ProductTemplate("Smart LED Bulb", "Philips", "Home & Garden", "lightbulb,smart"),
                new ProductTemplate("Ceramic Plant Pot", "Gardenia", "Home & Garden", "plant,decor"),
                new ProductTemplate("Non-stick Frying Pan", "Tefal", "Home & Garden", "pan,kitchen"),
                new ProductTemplate("Robot Vacuum Cleaner", "Xiaomi", "Home & Garden", "robot,vacuum"),
                
                // Beauty & Health
                new ProductTemplate("Advanced Night Repair", "Estee Lauder", "Beauty & Health", "skincare,serum"),
                new ProductTemplate("Matte Lipstick", "MAC", "Beauty & Health", "lipstick,makeup"),
                new ProductTemplate("Moisturizing Cream", "Nivea", "Beauty & Health", "cream,beauty"),
                new ProductTemplate("Electric Toothbrush", "Oral-B", "Beauty & Health", "toothbrush"),
                new ProductTemplate("Hair Dryer Pro", "Dyson", "Beauty & Health", "hairdryer"),
                
                // Sports
                new ProductTemplate("Yoga Mat Eco-friendly", "Lululemon", "Sports", "yogamat"),
                new ProductTemplate("Adjustable Dumbbells", "Bowflex", "Sports", "dumbbells,gym"),
                new ProductTemplate("Basketball Official Size", "Spalding", "Sports", "basketball"),
                new ProductTemplate("Tennis Racket Pro", "Wilson", "Sports", "tennis,racket"),
                new ProductTemplate("Mountain Bike 21-Speed", "Giant", "Sports", "bicycle,mtb")
            );

            // 2. Pre-load categories
            Map<String, Category> catMap = new HashMap<>();
            for (ProductTemplate t : templates) {
                if (!catMap.containsKey(t.category)) {
                    Category cat = categoryRepository.findByName(t.category).orElseGet(() -> {
                        Category newCat = new Category();
                        newCat.setName(t.category);
                        newCat.setDescription("All items related to " + t.category);
                        return categoryRepository.save(newCat);
                    });
                    catMap.put(t.category, cat);
                }
            }

            // 3. Spawning
            int createdCount = 0;
            String[] colors = {"Black", "White", "Silver", "Space Gray", "Ocean Blue", "Pure Red", "Sand", "Midnight"};
            String[] editions = {"Standard Edition", "Premium Pro", "Limited Edition", "V2.0", "New Model 2024", "Classic", "Plus"};

            for (int i = 0; i < count; i++) {
                ProductTemplate t = templates.get(random.nextInt(templates.size()));
                Category cat = catMap.get(t.category);
                
                String color = colors[random.nextInt(colors.length)];
                String edition = editions[random.nextInt(editions.length)];
                
                String fullName = t.name + " (" + color + ", " + edition + ")";
                String productId = "PROD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                String sku = t.brand.substring(0, Math.min(t.brand.length(), 3)).toUpperCase() + "-" + (random.nextInt(90000) + i);
                
                double price = 15 + (random.nextDouble() * 1200);
                price = Math.round(price * 100.0) / 100.0;
                double discountPrice = price * (0.8 + (random.nextDouble() * 0.15));
                discountPrice = Math.round(discountPrice * 100.0) / 100.0;

                // Build specific Image URL
                String imageUrl = "https://loremflickr.com/640/480/" + t.imgKeyword + "?random=" + (i + random.nextInt(5000));
                
                CreateProductRequest request = new CreateProductRequest();
                request.setProductId(productId);
                request.setName(fullName);
                request.setStock(10 + random.nextInt(300));
                request.setPrice(price);
                request.setImageUrl(imageUrl);
                request.setDescription("Sản phẩm " + fullName + " chính hãng từ " + t.brand + ". " + 
                                     "Đây là dòng " + t.name + " thế hệ mới với nhiều cải tiến về tính năng và thiết kế.");
                request.setCategoryId(cat.getId());
                request.setBrand(t.brand);
                request.setSku(sku);
                request.setDiscountPrice(discountPrice);
                request.setStatus("IN_STOCK");
                request.setRating(4.0 + (random.nextDouble() * 1.0));
                request.setNumReviews(random.nextInt(1000));
                
                try {
                    productCatalogService.createProduct(request);
                    createdCount++;
                } catch (Exception ignored) {}
            }

            Map<String, Object> result = new HashMap<>();
            result.put("message", "Đã tạo thành công " + createdCount + " sản phẩm thực tế.");
            result.put("count", createdCount);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(Map.of("error", "Lỗi Seeder: " + e.getMessage()));
        }
    }
}
