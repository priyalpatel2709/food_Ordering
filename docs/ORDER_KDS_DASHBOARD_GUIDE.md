# 📊 Order Management, KDS & Dashboard Guide

This guide covers the operational side of the restaurant: placing orders, managing the kitchen, and viewing analytics.

---

## 1. 🛒 Order Placement
- **Standard Order:** `POST /api/v1/orders/`
- **Atomic Order with Payment:** `POST /api/v1/orders/create-with-payment`
- **Dine-In (Staff-Side):**
  - `GET /api/v1/orders/tables` - See live table status.
  - `POST /api/v1/orders/dine-in` - Open a table.
  - `PUT /api/v1/orders/dine-in/:orderId/items` - Add items to a table.
  - `POST /api/v1/orders/dine-in/:orderId/pay` - Process checkout.

---

## 2. 👨‍🍳 Kitchen Display System (KDS)
The KDS is used by chefs to see and update order progress.

- **Get KDS Orders:** `GET /api/v1/kds/` (Filtered by active statuses).
- **Update Item Status:** `PATCH /api/v1/kds/item/:orderId/:itemId`
  - Body: `{ "status": "preparing" | "ready" | "served" }`
- **Update Order KDS Status:** `PATCH /api/v1/kds/order/:orderId`
  - Body: `{ "kdsStatus": "start" | "prepared" }`

### ⚙️ KDS Workflow Configuration
Each restaurant can define its own custom preparation workflow.

- **Get Active Workflow:** `GET /api/v1/kds/config`
  - Returns the list of statuses currently configured (e.g., `["new", "started", "cooking", "ready"]`).
- **Update Workflow (Manager/Admin):** `PUT /api/v1/restaurant/:id`
  - Payload: `{ "kdsConfiguration": { "workflow": ["new", "started", "ready"] } }`

---

## 3. 📈 Restaurant Dashboard
- **Live Stats:** `GET /api/v1/restaurant/dashboard/stats`
  - Includes Sales, Top Items, Source (Staff vs QR), and Peak Hours.
- **Export Report:** `GET /api/v1/restaurant/dashboard/export`
  - Downloads a PDF report of the current analytics.

---

## ⚡ Real-time Connectivity (Socket.io)
The system uses Socket.io to keep screens updated without refreshing.
- **Join KDS Room**: Emit `join_restaurant` with your `restaurantId`.
- **Listen for Updates**: Handle the `kds_update` event.
- **Group Ordering**: Use the `join_group` and `group_cart_updated` events for collaborative dine-in carts.

---

## 💡 Frontend Architecture Tips:
- **KDS Screen**: Use a `StreamBuilder` or `Socket.io` listener to make the kitchen tickets pop up instantly.
- **Dashboard Charts**: Use the `peakHours` array from the stats API to draw a bar chart showing which hours are busiest.
- **QR Scanning**: Use the `/api/v1/customer/dine-in/scan` endpoint (refer to previous guides) to verify a table before opening the menu.
