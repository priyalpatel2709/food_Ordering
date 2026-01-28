# Payment Status Management Guide

This document explains all payment-related statuses in the system and when to use them.

## Payment Status (Order Level)
These statuses describe the overall payment state of an order (`order.payment.paymentStatus`):

| Status | Value | Description | When to Use |
|--------|-------|-------------|-------------|
| **PENDING** | `"pending"` | No payment received yet | Order created but not paid |
| **PARTIALLY_PAID** | `"partially_paid"` | Some payment received, balance remaining | Split bills, installments, or group payments |
| **PAID** | `"paid"` | Full payment received | `totalPaid >= orderFinalCharge` |
| **REFUNDED** | `"refunded"` | Full amount refunded | Order cancelled after payment |
| **FAILED** | `"failed"` | Payment attempt failed | Payment gateway errors |

---

## Transaction Status (Individual Payment Level)
These statuses track each payment record in `order.payment.history[].status`:

| Status | Value | Description | When to Use |
|--------|-------|-------------|-------------|
| **PENDING** | `"pending"` | Transaction initiated but not completed | UPI/Card payment in progress |
| **COMPLETE** | `"complete"` | Transaction successful | Payment successfully processed |
| **FAILED** | `"failed"` | Transaction failed | Payment gateway rejected |
| **REFUNDED** | `"refunded"` | Transaction fully refunded | Full refund processed for this transaction |
| **PARTIALLY_REFUNDED** | `"partially_refunded"` | Transaction partially refunded | Partial refund processed (e.g., one item) |
| **PARTIALLY_PAID** | `"partially_paid"` | (Reserved for future use) | Currently not used at transaction level |

---

## Payment Flow Examples

### Example 1: Simple Cash Payment
```javascript
order.payment = {
  history: [
    {
      method: "cash",
      status: "complete",  // Transaction status
      amount: 50.00
    }
  ],
  totalPaid: 50.00,
  balanceDue: 0,
  paymentStatus: "paid"  // Order-level status
}
```

### Example 2: Split Payment (Table Share)
```javascript
order.payment = {
  history: [
    {
      method: "upi",
      status: "complete",
      amount: 25.00,
      notes: "Person 1"
    },
    {
      method: "cash",
      status: "complete",
      amount: 25.00,
      notes: "Person 2"
    }
  ],
  totalPaid: 50.00,
  balanceDue: 0,
  paymentStatus: "paid"
}
```

### Example 3: Partial Payment Scenario
```javascript
// Step 1: First payment
order.payment = {
  history: [
    {
      method: "cash",
      status: "complete",
      amount: 30.00
    }
  ],
  totalPaid: 30.00,
  balanceDue: 20.00,  // orderFinalCharge = 50.00
  paymentStatus: "partially_paid"
}

// Step 2: Second payment
order.payment.history.push({
  method: "upi",
  status: "complete",
  amount: 20.00
});
order.payment.totalPaid = 50.00;
order.payment.balanceDue = 0;
order.payment.paymentStatus = "paid";
```

### Example 4: Refund Scenario
```javascript
// Original payment
order.payment = {
  history: [
    {
      method: "upi",
      status: "complete",
      amount: 50.00,
      transactionId: "TXN123"
    }
  ],
  totalPaid: 50.00,
  balanceDue: 0,
  paymentStatus: "paid"
}

// After partial refund (e.g., one item returned)
order.payment.history[0].status = "partially_refunded";
order.payment.paymentStatus = "partially_paid";  // Or remain "paid" if no balance due
```

---

## Automatic Status Updates

The system automatically updates `paymentStatus` based on calculations:

```javascript
// In processPayment controller
if (order.payment.balanceDue === 0) {
  order.payment.paymentStatus = "paid";
} else {
  order.payment.paymentStatus = "partially_paid";
}
```

---

## Using in Controllers

### Setting Transaction Status
```javascript
// When processing payment
order.payment.history.push({
  method: "cash",
  status: TRANSACTION_STATUS.COMPLETE,  // Use constant
  amount: 50.00
});
```

### Checking Payment Status
```javascript
if (order.payment.paymentStatus === PAYMENT_STATUS.PAID) {
  // Mark order as completed
  order.orderStatus = ORDER_STATUS.COMPLETED;
}
```

---

## Constants Reference

Import from `utils/const.js`:
```javascript
const { PAYMENT_STATUS, TRANSACTION_STATUS } = require("../../utils/const");
```

**PAYMENT_STATUS values:**
- `PENDING`, `PAID`, `PARTIALLY_PAID`, `REFUNDED`, `FAILED`

**TRANSACTION_STATUS values:**
- `PENDING`, `COMPLETE`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `PARTIALLY_PAID`
