# Service Kho Spring Boot

Inventory service for product catalog, stock reservation, and stock deduction from order events.

## Refactored Structure

```
Inventory_Service
├── src/main/java/com/example/inventory
│   ├── controller
│   │   └── ProductController.java
│   ├── dto
│   ├── model
│   │   └── Product.java
│   ├── repository
│   │   └── ProductRepository.java
│   └── service
│       ├── JwtAuthService.java
│       ├── EventIdempotencyService.java
│       ├── OrderKafkaConsumer.java
│       ├── StockReservationService.java
│       ├── ProductCatalogService.java
│       ├── ProductInfoCacheService.java
│       └── StockCheckService.java
├── src/main/resources
│   ├── application.yml
│   └── data.sql
└── src/test/java/com/example/inventory
    └── InventoryServiceApplicationTests.java
```

## Responsibility Split

- ProductController: HTTP endpoints and request validation at API boundary.
- ProductCatalogService: product CRUD and stock sync to Redis cache key stock:{productId}.
- StockCheckService: orchestrates reserve flow (cache-first then DB fallback).
- ProductInfoCacheService: read/write product info cache key info:{productId}.
- StockReservationService: atomic Redis Lua stock reservation.
- OrderKafkaConsumer: consume order topic and persist stock deduction with idempotency lock.
- JwtAuthService: parse bearer token and extract authenticated user.
- EventIdempotencyService: Redis-based processing lock and processed marker.

## Run

Prerequisites:
- Java 17+
- Maven
- MySQL, Redis, Kafka (or run from docker-compose in project root)

Commands:
```bash
mvn clean install
mvn spring-boot:run
```

Default port: 8080.

## Architecture Note

Order orchestration has been moved to Order_Service.
Inventory_Service is now focused on:
- Product catalog APIs.
- Reserve/check stock APIs.
- Order event consumption to decrement stock in DB.