# Kitchen Display System (KDS) Feature Guide

This guide details the API endpoints and frontend implementation strategy for the dynamic Kitchen Display System.

## 1. API Endpoints & cURL Examples

**Base URL**: `http://localhost:2580/api/v1/kds`
**Headers Required**:
*   `Authorization`: `Bearer <YOUR_JWT_TOKEN>` (Login as staff/manager/admin)
*   `x-restaurant-id`: `<RESTAURANT_ID>` (e.g., `Users` or specific tenant ID)

### A. Get KDS Configuration (Workflow)
Fetches the dynamic workflow states (e.g., `["new", "start", "prepared", "ready"]`) for the restaurant.

```bash
curl --location 'http://localhost:2580/api/v1/kds/config' \
--header 'Authorization: Bearer <YOUR_TOKEN>' \
--header 'x-restaurant-id: Users'
```

**Response Example:**
```json
{
    "status": "success",
    "data": {
        "workflow": ["new", "start", "prepared", "ready"]
    }
}
```

### B. Get Active KDS Orders
Fetches all orders that are NOT completed, served, or canceled. Sorted by creation time (FIFO).

```bash
curl --location 'http://localhost:2580/api/v1/kds' \
--header 'Authorization: Bearer <YOUR_TOKEN>' \
--header 'x-restaurant-id: Users'
```

### C. Update Item Status
Updates the status of a specific item within an order. This will automatically recalculate the overall order status.

*   **:orderId**: The `_id` of the order.
*   **:itemId**: The `_id` of the item inside `orderItems` (NOT the `item` reference ID, but the subdocument ID).

```bash
curl --location --request PATCH 'http://localhost:2580/api/v1/kds/<ORDER_ID>/items/<ITEM_ID>/status' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <YOUR_TOKEN>' \
--header 'x-restaurant-id: Users' \
--data '{
    "status": "prepared"
}'
```

---

## 2. Frontend Implementation Guide (Flutter/Web)

### Step 1: Initialize & Config
1.  **On Page Load**: Call `GET /api/v1/kds/config`.
2.  **Store Workflow**: Save the `workflow` array (e.g., `["new", "start", "prepared", "ready"]`).
3.  **Generate Columns**: Dynamically create UI columns based on this array.
    *   *Column 1*: "New"
    *   *Column 2*: "Start"
    *   ...etc.

### Step 2: Fetch & Organize Orders
1.  **Poll Orders**: Call `GET /api/v1/kds` every 10-30 seconds (or use a refresh button).
2.  **Group/Filter**:
    *   The API returns *orders*. An order acts as a container.
    *   **Display Logic**: You can display the Order Card in the column corresponding to its `kdsStatus`.
    *   **Alternative Item View**: If you want a view per *item*, you flatten the list: `Order -> [Item1, Item2]`. Display each item in the column matching its `item.itemStatus`.

### Step 3: The Order Card Component
Each card should display:
*   **Header**: Table # (if dine-in) or Order # (if delivery). Time elapsed (e.g., "5 mins ago").
*   **Items List**:
    *   List all items in the order.
    *   Show current status of each item.
    *   **Action**: Clicking an item should advance it to the next state or open a status selector.
*   **Overall Action**: A button to advance the whole order (optional, requires a new API endpoint if you want bulk update, or just loop through items).

### Step 4: Updating Status (Interactivity)
When a chef clicks an item or drags it to a new column:
1.  Identify the **next state** in the workflow array.
    *   *Current*: "new" -> *Next*: "start"
2.  Call `PATCH /api/v1/kds/:orderId/items/:itemId/status` with the new status.
3.  **Optimistic UI**: Immediately update the UI to show the new status while waiting for the API response.
4.  **Handle Response**: If the order's overall `kdsStatus` changes in the backend response, move the entire Order Card to the new column.

### Example State Management Strategy
1. **Config Provider**: Fetch and store the workflow configuration once on mount.
2. **Orders Stream**: Create a polling mechanism (e.g., Stream or periodic Timer) that calls the fetch orders API every 15-30 seconds.
3. **UI State**: The UI should reactively listen to this stream and rebuild the columns when new data arrives.

### Dynamic updates
Since the backend logic `min(item_statuses)` determines the order status:
*   If an order has 2 items: 1 "new", 1 "ready".
*   The Order Status will likely be "start" or "new" (depending on logic).
*   The frontend should trust the `kdsStatus` returned from the `PATCH` response to decide where to place the order card.
