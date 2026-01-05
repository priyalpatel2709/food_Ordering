# Refund Implementation & Dashboard Analytics Update Plan

## 1. Overview
This document details the implementation plan for the **Refund Feature** and necessary updates to the **Restaurant Dashboard** to reflect refund statistics accurately.

## 2. Data Model & Schema

### 2.1 Refund Model (`models/order/refundModel.js`)
*Status: Existing*
- The model helps track individual refund transactions.
- **Fields**: `amount`, `reason`, `orderId`, `processedBy`, `processedAt`.

### 2.2 Order Model (`models/order/orderModel.js`)
*Status: Requires Update*
- Currently has:
  ```javascript
  refunds: {
    history: [{ type: mongoose.Schema.Types.ObjectId, ref: "Refund" }],
    remainingCharge: { type: Number, min: 0, default: 0 },
  }
  ```
- **Issue**: `remainingCharge` is ambiguous. In the dashboard, it is summed as `totalRefunds`, implying it holds the *refunded amount*.
- **Action**: Rename `remainingCharge` to `totalRefundedAmount` to strictly represent the total amount refunded for that order.
- **New Structure**:
  ```javascript
  refunds: {
    history: [{ type: mongoose.Schema.Types.ObjectId, ref: "Refund" }],
    totalRefundedAmount: { type: Number, min: 0, default: 0 },
  }
  ```

## 3. Backend Implementation

### 3.1 New API Endpoint: Process Refund
**Endpoint**: `POST /api/v1/orders/:orderId/refund`

**Controller Logic (`controllers/order/orderController.js`)**:
1.  **Validation**:
    -   Check if Order exists.
    -   Check if user has permission.
    -   Compare `refundAmount` with `order.payment.totalPaid`. Ensure `(totalRefundedAmount + newAmount) <= totalPaid`.
2.  **Creation**:
    -   Create new `Refund` document.
3.  **Update Order**:
    -   `$push`: `refunds.history` -> new Refund ID.
    -   `$inc`: `refunds.totalRefundedAmount` -> `refundAmount`.
    -   Update `payment.paymentStatus` to `REFUNDED` (if full) or `PARTIALLY_REFUNDED`.

### 3.2 Dashboard Statistics (`controllers/restaurant/dashboardController.js`)

**Goal**: Reflect refunds in financial KPIs and add breakdown.

**Updates to Aggregation Pipeline**:
1.  **KPIs**:
    -   `totalRefunds`: Sum of `$refunds.totalRefundedAmount`.
    -   `netSales`: Update calculation.
        -   *Definition*: Gross Sales - Refunds - Taxes.
        -   Logic: `$subtract: ["$subtotal", "$refunds.totalRefundedAmount"]`.
2.  **New Section: Refund Analysis**:
    -   **Refunds by Reason**: Group by `refunds.reason` (requires lookup on Refund model or embedding reason in Order, but lookup is better).
    -   *Simplified V1*: Since `Order` doesn't store refund reasons directly (only IDs), we might need a separate aggregation on the `Refund` collection or a `$lookup`.
    -   *Approach*: Perform a separate aggregation on `Refund` model for detailed breakdown, or just track total amount in the main Order aggregation.

## 4. Frontend & Usage
- **Order Details Page**: Add "Issue Refund" button.
    -   Opens modal -> Input Amount & Reason.
    -   Validates amount <= refundable balance.
- **Dashboard**:
    -   Show "Total Refunds" card (Red color indicator).
    -   Adjust "Net Sales" to be accurate.

## 5. Action Items (summary)
1.  [ ] Rename `remainingCharge` to `totalRefundedAmount` in `orderModel.js`.
2.  [ ] Implement `processRefund` function in `orderController.js`.
3.  [ ] Add route in `routes/orderRoutes.js`.
4.  [ ] Update `dashboardController.js` to correctly calculate `netSales` and `totalRefunds`.
