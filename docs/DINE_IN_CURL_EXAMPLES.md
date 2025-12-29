# Dine-In Feature cURL Examples

Use these examples to test the new Dine-In endpoints.

**Prerequisites:**
- Replace `YOUR_TOKEN` with a valid JWT token.
- Replace `RESTAURANT_ID` with your restaurant's ID (e.g., `rest_123`).
- Replace `ITEM_ID` with a valid item ID from your menu.
- Replace `ORDER_ID` with the ID of an order created in previous steps.

---

## 1. Get Tables Status
Check the availability and current order status of all tables.

```bash
curl -X GET "http://localhost:25/api/v1/orders/tables" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Restaurant-Id: RESTAURANT_ID"
```

---

## 2. Create Dine-In Order (Open Table)
Open a table by creating a new order. You can optionally add initial items.

**With Items:**
```bash
curl -X POST "http://localhost:25/api/v1/orders/dine-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Restaurant-Id: RESTAURANT_ID" \
  -d '{
    "tableNumber": "5",
    "items": [
      {
        "item": "ITEM_ID",
        "quantity": 2,
        "specialInstructions": "No onions"
      }
    ]
  }'
```

**Empty Table (Just Occupy):**
```bash
curl -X POST "http://localhost:25/api/v1/orders/dine-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Restaurant-Id: RESTAURANT_ID" \
  -d '{
    "tableNumber": "3"
  }'
```

---

## 3. Add Items to Order
Add more items to an ongoing dine-in order.

```bash
curl -X PUT "http://localhost:25/api/v1/orders/dine-in/ORDER_ID/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Restaurant-Id: RESTAURANT_ID" \
  -d '{
    "items": [
      {
        "item": "ITEM_ID",
        "quantity": 1,
        "modifiers": [
           { "name": "Extra Spicy", "price": 0.50 }
        ]
      }
    ]
  }'
```

---

## 4. Complete & Pay (Close Table)
Process the final payment. This marks the order as `COMPLETED` and frees up the table.

```bash
curl -X POST "http://localhost:25/api/v1/orders/dine-in/ORDER_ID/pay" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Restaurant-Id: RESTAURANT_ID" \
  -d '{
    "payment": {
      "method": "cash",
      "amount": 25.50,
      "notes": "Customer gave exact change"
    }
  }'
```
