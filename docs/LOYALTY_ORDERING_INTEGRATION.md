# Loyalty Integration with Ordering System

## Overview
This guide shows how to integrate the Customer Loyalty & Marketing system with your ordering workflow to automatically track customers, award points, and apply discounts.

## Automatic Integration

### 1. Order Completion → Loyalty Points
When an order is completed and paid, loyalty points are **automatically awarded**.

**Location**: `controllers/order/dineInController.js` (completeDineInCheckout)

```javascript
// After order is saved and marked as COMPLETED
const { awardLoyaltyPoints } = require("../../middleware/loyaltyMiddleware");

const loyaltyCustomer = await awardLoyaltyPoints(
  savedOrder,
  req.restaurantDb,
  req.restaurantId
);
```

**What Happens Automatically:**
1. ✅ Finds or creates customer profile using phone/email
2. ✅ Awards points (1 point per $1 spent)
3. ✅ Records visit and updates statistics
4. ✅ Tracks favorite items
5. ✅ Auto-upgrades loyalty tier if thresholds met
6. ✅ Auto-tags customer (high-value, frequent-visitor, etc.)

### 2. Required Order Fields
Ensure your order includes customer contact info:

```javascript
{
  "contactPhone": "+1234567890",  // Primary identifier
  "contactEmail": "customer@example.com",  // Secondary identifier
  "contactName": "John Doe",
  // ... rest of order fields
}
```

## Manual Integration Options

### Option 1: Lookup Customer Before Order
Display customer loyalty info during order creation:

```javascript
const { getCustomerLoyaltyInfo } = require("../../middleware/loyaltyMiddleware");

// In your order creation endpoint
const customerInfo = await getCustomerLoyaltyInfo(
  phoneNumber,  // or email or customer ID
  req.restaurantDb,
  req.restaurantId
);

if (customerInfo) {
  console.log(`Customer: ${customerInfo.name}`);
  console.log(`Tier: ${customerInfo.tier}`);
  console.log(`Available Points: ${customerInfo.points.current}`);
  console.log(`Available Discount: $${customerInfo.points.availableDiscount}`);
  console.log(`Favorite Items:`, customerInfo.favoriteItems);
  console.log(`Allergies:`, customerInfo.allergies);
}
```

**Response Example:**
```json
{
  "id": "65f1a2b3c4d5e6f7g8h9i0j1",
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "tier": "gold",
  "points": {
    "current": 1250,
    "lifetime": 2500,
    "availableDiscount": "12.50"
  },
  "visitStats": {
    "totalVisits": 15,
    "totalSpent": 750.00,
    "averageOrderValue": 50.00,
    "lastVisit": "2026-01-20T10:30:00Z"
  },
  "favoriteItems": [
    { "itemId": "...", "orderCount": 5 }
  ],
  "dietaryRestrictions": ["vegetarian"],
  "allergies": ["peanuts"],
  "notes": ["Prefers window seating"]
}
```

### Option 2: Apply Loyalty Points Discount
Allow customers to redeem points during checkout:

```javascript
const { applyLoyaltyDiscount } = require("../../middleware/loyaltyMiddleware");

// In your checkout/payment endpoint
const { loyaltyCustomerId, pointsToRedeem } = req.body;

const result = await applyLoyaltyDiscount(
  loyaltyCustomerId,
  pointsToRedeem,
  req.restaurantDb,
  req.restaurantId
);

if (result.success) {
  // Apply discount to order
  order.discount.discounts.push({
    discountId: null, // Loyalty discount
    discountAmount: result.discountAmount,
    discountType: "loyalty_points",
    pointsRedeemed: result.pointsRedeemed,
  });
  
  // Recalculate order totals
  await recalculateOrderTotals(order, req.restaurantDb);
  
  console.log(result.message);
  // "Redeemed 500 points for $5.00 discount"
  console.log(`Remaining points: ${result.remainingPoints}`);
} else {
  console.error(result.error);
  // "Insufficient points. Available: 250"
}
```

## Complete Order Flow with Loyalty

### Step 1: Customer Lookup (Optional)
```http
POST /api/v1/orders/lookup-customer
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "John Doe",
    "tier": "gold",
    "points": {
      "current": 1250,
      "availableDiscount": "12.50"
    },
    "favoriteItems": [...],
    "notes": ["Allergic to peanuts"]
  }
}
```

### Step 2: Create Order with Customer Info
```http
POST /api/v1/orders/dine-in
Content-Type: application/json

{
  "tableNumber": "5",
  "contactPhone": "+1234567890",
  "contactEmail": "john@example.com",
  "contactName": "John Doe",
  "items": [
    {
      "item": "ITEM_ID",
      "quantity": 2,
      "modifiers": []
    }
  ]
}
```

### Step 3: Apply Loyalty Discount (Optional)
```http
POST /api/v1/orders/:orderId/apply-loyalty-discount
Content-Type: application/json

{
  "loyaltyCustomerId": "CUSTOMER_ID",
  "pointsToRedeem": 500
}
```

### Step 4: Complete Payment
```http
POST /api/v1/customer/dine-in/:orderId/checkout
Content-Type: application/json

{
  "payment": {
    "method": "card",
    "amount": 45.99,
    "transactionId": "TXN123"
  }
}
```

**Automatic Actions:**
- ✅ Order marked as COMPLETED
- ✅ Loyalty points awarded (45 points)
- ✅ Visit recorded
- ✅ Favorite items updated
- ✅ Tier upgraded if threshold met

## Frontend Integration Examples

### React/JavaScript Example

```javascript
// 1. Lookup customer when phone is entered
const lookupCustomer = async (phone) => {
  const response = await fetch('/api/v1/loyalty/customers/' + phone, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Restaurant-Id': restaurantId
    }
  });
  
  if (response.ok) {
    const { data } = await response.json();
    
    // Display customer info
    setCustomerInfo({
      name: data.name,
      tier: data.tier,
      availablePoints: data.points.current,
      availableDiscount: data.points.availableDiscount,
      allergies: data.allergies,
      notes: data.notes
    });
    
    // Show favorite items
    setFavoriteItems(data.favoriteItems);
  }
};

// 2. Apply loyalty discount
const applyLoyaltyDiscount = async (customerId, points) => {
  const response = await fetch(`/api/v1/loyalty/customers/${customerId}/redeem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restaurant-Id': restaurantId
    },
    body: JSON.stringify({ points })
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    // Update order total
    const discountAmount = points / 100;
    setOrderTotal(orderTotal - discountAmount);
    setRemainingPoints(result.data.currentPoints);
  }
};

// 3. Complete order (points awarded automatically)
const completeOrder = async (orderId, paymentInfo) => {
  const response = await fetch(`/api/v1/customer/dine-in/${orderId}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Restaurant-Id': restaurantId
    },
    body: JSON.stringify({ payment: paymentInfo })
  });
  
  // Points are automatically awarded on backend
  const { data } = await response.json();
  console.log('Order completed:', data);
};
```

### Flutter/Dart Example

```dart
// 1. Lookup customer
Future<CustomerLoyaltyInfo?> lookupCustomer(String phone) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/v1/loyalty/customers/$phone'),
    headers: {
      'Authorization': 'Bearer $token',
      'X-Restaurant-Id': restaurantId,
    },
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body)['data'];
    return CustomerLoyaltyInfo.fromJson(data);
  }
  return null;
}

// 2. Apply loyalty discount
Future<bool> applyLoyaltyDiscount(String customerId, int points) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/v1/loyalty/customers/$customerId/redeem'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
      'X-Restaurant-Id': restaurantId,
    },
    body: jsonEncode({'points': points}),
  );

  if (response.statusCode == 200) {
    final result = jsonDecode(response.body);
    final discountAmount = points / 100;
    // Update UI with discount
    return true;
  }
  return false;
}

// 3. Complete order
Future<void> completeOrder(String orderId, PaymentInfo payment) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/v1/customer/dine-in/$orderId/checkout'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
      'X-Restaurant-Id': restaurantId,
    },
    body: jsonEncode({'payment': payment.toJson()}),
  );

  // Points automatically awarded on backend
  if (response.statusCode == 200) {
    print('Order completed successfully');
  }
}
```

## UI/UX Recommendations

### 1. Customer Lookup Screen
```
┌─────────────────────────────────────┐
│ Enter Customer Phone Number         │
│ ┌─────────────────────────────────┐ │
│ │ +1 (234) 567-8900              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ John Doe - Gold Member            │
│ 💎 1,250 points ($12.50 available)  │
│ ⭐ Favorite: Margherita Pizza       │
│ ⚠️  Allergic to peanuts             │
└─────────────────────────────────────┘
```

### 2. Checkout Screen with Loyalty
```
┌─────────────────────────────────────┐
│ Order Total: $45.99                 │
│                                     │
│ Available Loyalty Points: 1,250     │
│ (Worth $12.50)                      │
│                                     │
│ Redeem Points:                      │
│ ┌───────────┐                       │
│ │ 500       │ [Apply]               │
│ └───────────┘                       │
│                                     │
│ Discount: -$5.00                    │
│ ─────────────────────────────────   │
│ Final Total: $40.99                 │
│                                     │
│ [Complete Payment]                  │
└─────────────────────────────────────┘
```

### 3. Post-Order Confirmation
```
┌─────────────────────────────────────┐
│ ✓ Order Completed!                  │
│                                     │
│ You earned: +40 points              │
│ New balance: 790 points ($7.90)     │
│                                     │
│ Tier Progress:                      │
│ ████████░░ 80% to Platinum          │
│ (200 more points needed)            │
└─────────────────────────────────────┘
```

## Best Practices

### 1. Always Include Customer Contact
```javascript
// ✅ Good
const order = {
  contactPhone: "+1234567890",
  contactEmail: "customer@example.com",
  contactName: "John Doe",
  // ... other fields
};

// ❌ Bad (no loyalty tracking)
const order = {
  // Missing contact info
  items: [...]
};
```

### 2. Handle Loyalty Failures Gracefully
```javascript
try {
  await awardLoyaltyPoints(order, db, restaurantId);
} catch (error) {
  logger.error("Loyalty error:", error);
  // Don't fail the order if loyalty fails
  // Continue with order completion
}
```

### 3. Validate Points Before Redemption
```javascript
// Check if customer has enough points
if (pointsToRedeem > customer.loyaltyPoints.current) {
  return res.status(400).json({
    error: `Insufficient points. Available: ${customer.loyaltyPoints.current}`
  });
}
```

### 4. Show Tier Benefits
```javascript
const tierBenefits = {
  bronze: "Earn 1 point per $1",
  silver: "Earn 1.2 points per $1 + 5% birthday discount",
  gold: "Earn 1.5 points per $1 + 10% birthday discount",
  platinum: "Earn 2 points per $1 + 15% discount + priority seating",
  vip: "Earn 3 points per $1 + 20% discount + exclusive menu"
};
```

## Troubleshooting

### Issue: Points not awarded
**Check:**
1. Order has `contactPhone` or `contactEmail`
2. Order status is `COMPLETED`
3. Check server logs for errors

### Issue: Customer not found
**Solution:**
```javascript
// Customer is auto-created if doesn't exist
// Ensure phone/email is provided in order
```

### Issue: Points redemption fails
**Check:**
1. Customer has sufficient points
2. Customer ID is correct
3. Points value is positive number

## Summary

The loyalty system integrates seamlessly with your ordering flow:

1. **Automatic**: Points awarded when order completes
2. **Optional**: Lookup customer info before ordering
3. **Optional**: Apply loyalty discount during checkout
4. **Automatic**: Customer profile created if doesn't exist
5. **Automatic**: Tier upgrades and auto-tagging

No complex integration required - just ensure orders include customer contact information!
