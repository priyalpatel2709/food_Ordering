# Abacus POS Style Implementation - API Documentation

This document describes the new features and API endpoints implemented for the Food Ordering system, inspired by Abacus POS functionalities.

---

## 1. Table Management (Dine-In)

The system now uses a dedicated `Table` model for precise status tracking and management.

### **Table Statuses**

- `available`: Table is free.
- `occupied`: Table is selected but no items are added yet.
- `ongoing`: Order is in progress (items added).
- `reserved`: Table is booked.
- `cleaning`: Table is being prepared for the next guest.

### **API Endpoints**

#### **Get All Tables Status**

`GET /api/v1/orders/tables`

- **Description**: Returns all tables with their current status, active order details, and customer name.
- **Frontend Usage**: Use this to render the "Table Grid" view.

#### **Create Dine-In Order**

`POST /api/v1/orders/dine-in`

- **Body**: `{ "tableNumber": "5", "orderItems": [...] }`
- **Description**: Starts a new session for a table. If `orderItems` is empty, table status becomes `occupied`. If items are provided, status becomes `ongoing`.

#### **Add Items to Active Table**

`PUT /api/v1/orders/dine-in/:orderId/items`

- **Body**: `{ "items": [{ "item": "ID", "quantity": 1, ... }] }`
- **Description**: Appends items to an existing dind-in order.

#### **Release Table (Checkout)**

`POST /api/v1/orders/dine-in/:orderId/pay`

- **Body**: `{ "amount": 50.00, "method": "cash" }`
- **Description**: Processes payment. If the balance becomes 0, the order status becomes `completed` and the table status resets to `available`.

---

## 2. Order & Payment Enhancements

### **Item Notes & Discounts**

Individual items can now have specific notes and discounts.

#### **Schema Update (`orderItems`)**

```json
{
  "item": "ObjectId",
  "quantity": 2,
  "price": 15.0,
  "itemNote": "Extra spicy, no onions",
  "itemDiscount": {
    "discountId": "ObjectId",
    "amount": 2.0
  }
}
```

### **Split & Item-wise Payments**

#### **Pay for Specific Item**

`POST /api/v1/payment/payForItem`

- **Body**:
  ```json
  {
    "orderId": "65b...",
    "itemIndex": 0,
    "amount": 15.0,
    "method": "credit"
  }
  ```
- **Description**: Tracks payment for a specific line item. Useful for "Split by Item" scenarios.

#### **Get Bill for Payment Page**

`GET /api/v1/payment/bill/:orderId`

- **Description**: Returns a clean JSON object with items, subtotal, tax, discount, total, amount paid, and balance due. Perfect for the "Final Bill" screen.

---

## 3. Reporting & Dashboard

### **Day-by-Day Sales Report**

`GET /api/v1/dashboard/report/daily?startDate=2024-01-01&endDate=2024-01-31`

- **Description**: Aggregates sales data grouped by date.
- **Frontend Usage**: Use this to render sales charts/graphs.

---

## 4. Menu & Category Enhancements

### **Category Customization**

- **Color**: Each category has a `color` field (hex string) for UI branding.
- **Display Order**: Change the sequence of categories in the menu.

#### **Reorder Categories (Bulk)**

`POST /api/v1/category/reorder`

- **Body**:
  ```json
  {
    "orders": [
      { "id": "cat_1", "displayOrder": 1 },
      { "id": "cat_2", "displayOrder": 2 }
    ]
  }
  ```

### **Item Inventory & Popularity**

- **Inventory Tracking**: `inventoryQuantity` field added to items.
- **Popular Tag**: `isPopular` (Boolean) to highlight top-selling items.
- **Frontend**: Check these fields in the `currentMenu` response to show "Out of Stock" or "Popular" badges.

---

## 5. Printing Integration (Backend Service)

A new `printService.js` is available to generate:

1. **Thermal Receipt (PDF)**: 80mm format suitable for Epson/Star printers.
2. **Raw ESC/POS Text**: For direct thermal printing.

---

## 6. Frontend Example (Axios)

### **Fetching Table Grid**

```javascript
const getTables = async () => {
  const response = await axios.get("/api/v1/orders/tables");
  return response.data.data.tables; // [{ tableNumber: "1", status: "ongoing", amount: 45.0, ... }]
};
```

### **Processing Item-wise Payment**

```javascript
const payItem = async (orderId, idx, price) => {
  await axios.post("/api/v1/payment/payForItem", {
    orderId,
    itemIndex: idx,
    amount: price,
    method: "cash",
  });
};
```

### **Updating Category Order**

```javascript
const updateOrder = async (newOrderArray) => {
  await axios.post("/api/v1/category/reorder", { orders: newOrderArray });
};
```
