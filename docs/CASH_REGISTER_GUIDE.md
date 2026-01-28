# Cash Register Management Module - Frontend Integration Guide

This guide provides the API specifications and implementation details for the Cash Register Management module, designed for integration with the Flutter POS application.

## Overview
The Cash Register module tracks all cash movements within a restaurant. It consists of **Registers** (the physical hardware/drawer) and **Sessions** (the shift or daily timeframe during which transactions occur).

---

## 1. Core Concepts

### Cash Register
A persistent entity representing a physical cash drawer.
*   **Status**: `open` (in use), `closed` (not in use).
*   **Current Session**: The ID of the active shift session.

### Cash Session
A single shift started by an employee. 
*   **Theoretical Balance**: Calculated as `Opening Balance + Sales + Pay-ins - Refunds - Pay-outs`.
*   **Actual Cash**: The physical amount counted by the staff at closing.
*   **Difference**: Shortage or overage (`Actual - Theoretical`).

---

## 2. API Reference

### Base URL: `/api/v1/cash-register`

| Endpoint | Method | Description | Permission |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | List all registers for the restaurant | `CASH_REGISTER.READ` |
| `/` | `POST` | Create a new cash register | `CASH_REGISTER.CREATE` |
| `/:id/open` | `POST` | Start a new cash session (Open Shift) | `CASH_REGISTER.UPDATE` |
| `/:id/transaction` | `POST` | Log a manual cash movement (Pay-in/Pay-out) | `CASH_REGISTER.UPDATE` |
| `/:id/close` | `POST` | End a cash session (Close Shift) | `CASH_REGISTER.UPDATE` |

---

## 3. Implementation Details

### A. List Registers
Used to see the current status of all drawers.
**Request:** `GET /api/v1/cash-register`
**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "register_id_123",
      "name": "Main Counter",
      "status": "open",
      "currentSession": {
        "openingBalance": 100.0,
        "totalSales": 500.5,
        "status": "open"
      }
    }
  ]
}
```

### B. Open Shift (Start Session)
Called when a cashier starts their shift.
**Request:** `POST /api/v1/cash-register/register_id/open`
**Body:**
```json
{
  "openingBalance": 100.00,
  "notes": "Shift start with base float"
}
```

### C. Manual Transactions (Pay-In / Pay-Out)
Used for non-order movements like picking up change or paying a small cleaning bill.
**Request:** `POST /api/v1/cash-register/register_id/transaction`
**Body:**
```json
{
  "type": "pay_out", // values: cash_in, cash_out, pay_in, pay_out
  "amount": 20.00,
  "reason": "Cleaning supplies"
}
```

### D. Close Shift (Reconciliation)
Called at the end of the shift. The user must input the actual cash they see in the drawer.
**Request:** `POST /api/v1/cash-register/register_id/close`
**Body:**
```json
{
  "actualCash": 580.50,
  "notes": "Everything matched perfectly"
}
```
**Response includes calculation:**
```json
{
  "status": "success",
  "data": {
    "expectedBalance": 580.50,
    "actualCash": 580.50,
    "difference": 0.00,
    "session": { ... }
  }
}
```

---

## 4. Automatic Order Integration

When performing a checkout in the POS, if the payment method selected is **Cash**, the backend automatically records the sale in the active session.

### Flutter Checkout Example:
When calling `POST /api/v1/orders/create-with-payment`, include the `cashRegisterId` if you want to target a specific drawer:

```json
{
  "orderItems": [...],
  "payment": {
    "method": "cash",
    "amount": 45.99
  },
  "cashRegisterId": "id_of_the_open_drawer" // Optional: defaults to first open drawer
}
```

---

## 5. Error Handling

*   **400 Bad Request**: "Register is already open" (if trying to open an open shift).
*   **400 Bad Request**: "Register is not open" (if trying to add transactions to a closed drawer).
*   **404 Not Found**: "Register not found".

---

## 6. Permissions Requirements

Ensure the user token has the following permissions assigned:
*   `CASH_REGISTER.READ` - To view the status.
*   `CASH_REGISTER.CREATE` - To setup new registers.
*   `CASH_REGISTER.UPDATE` - To open/close shifts and add transactions.
