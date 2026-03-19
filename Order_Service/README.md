# Order_Service

Order orchestration service.

Responsibilities:
- Create order records.
- Call Inventory_Service to reserve stock.
- Publish `order` and `send-email-topic-v2` events after successful reservation.
