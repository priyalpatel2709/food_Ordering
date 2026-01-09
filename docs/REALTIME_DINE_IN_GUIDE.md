# Real-Time Dine-In Implementation Guide

This guide explains how the frontend should integrate with the real-time Socket.io service to handle live updates for Dine-In tables and orders.

## 1. Connection & Rooms

### Subscription Scenarios

| Scenario | Room Type | Join Event |
| :--- | :--- | :--- |
| **Table Grid View** | Restaurant | `join_restaurant` |
| **Table Details Page** | Specific Table | `join_table` |
| **Customer Interface**| Group Room | `join_group` |

**Room Naming Convention (Handled by Backend):**
- Restaurant: `restaurant_{id}`
- Table: `table:restaurant_{id}:{tableNumber}`
- Group: `group:restaurant_{id}:{tableNumber}`

*The backend helpers automatically handle both `123` and `restaurant_123` formats.*

---

## 2. Event Reference

### A. General Table Status (Grid View)
**Room:** `restaurant_{id}`  
**Event:** `table_status_updated`  
**Description:** Triggered whenever a table status changes (Available -> Occupied -> Ongoing -> Completed).

**Payload:**
```json
{
  "tableNumber": "5",
  "status": "ongoing", 
  "orderId": "658af...",
  "amount": 125.50,
  "itemCount": 4,
  "customerName": "John Doe",
  "updatedAt": "2024-01-09T..."
}
```

---

### B. Detailed Order Updates (Table Details View)
**Room:** `table:restaurant_{id}:{tableNumber}` OR `group:restaurant_{id}:{tableNumber}`  
**Event:** `table_order_updated` OR `group_cart_updated`  
**Description:** Triggered when items are added/removed or order status/payments are updated. The backend now sends **BOTH** events to ensure compatibility.

**Payload:**
```json
{
  "operationType": "update",
  "order": {
    "_id": "658af...",
    "tableNumber": "5",
    "orderItems": [
      {
        "item": { "name": "Burger", "price": 10.99, ... },
        "quantity": 2,
        ...
      }
    ],
    "orderStatus": "confirmed",
    "payment": { "totalPaid": 21.98, "balanceDue": 0, ... }
    ...
  }
}
```

---

### C. Order Deletion
**Room:** `restaurant_{id}`  
**Event:** `order_deleted`  
**Description:** Triggered when a pending order is removed.

**Payload:**
```json
{
  "orderId": "658af..."
}
```

---

## 3. Frontend Tips
1.  **Populated Data**: The backend now populates `orderItems.item` before emitting. You don't need to re-fetch the item list on every update.
2.  **Universal Listeners**: Staff should listen for `table_order_updated`. Customers should listen for `group_cart_updated`. The backend now emits both simultaneously when changes occur, keeping everyone in sync.
3.  **Payment Sync**: Use the `table_order_updated` event to show "PAID" or "COMPLETED" status overlays on the table details page instantly.
