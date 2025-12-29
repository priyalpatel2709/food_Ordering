# Test Cases for Create Order with Payment Endpoint

## Test Data Setup

### Prerequisites
1. Have a valid JWT token
2. Have valid item IDs from your menu
3. Have valid tax IDs (optional)
4. Have valid discount IDs (optional)
5. Restaurant ID

---

## Test Case 1: Minimal Valid Order (Cash Payment)

### Request
```json
POST /api/v1/orders/create-with-payment
Headers:
  Authorization: Bearer <your_token>
  Content-Type: application/json
  X-Restaurant-Id: restaurant_123

Body:
{
  "restaurantId": "restaurant_123",
  "contactName": "John Doe",
  "contactPhone": "1234567890",
  "orderItems": [
    {
      "item": "REPLACE_WITH_VALID_ITEM_ID",
      "quantity": 1
    }
  ],
  "payment": {
    "method": "cash"
  }
}
```

### Expected Result
✅ Status: 201 Created  
✅ Order created with status "confirmed"  
✅ Payment status "paid"  
✅ Balance due: 0

---

## Test Case 2: Order with Multiple Items and Modifiers

### Request
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Jane Smith",
  "contactPhone": "9876543210",
  "contactEmail": "jane@example.com",
  "orderNote": "Please make it extra spicy",
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 2,
      "specialInstructions": "No onions",
      "modifiers": [
        {
          "name": "Extra Cheese",
          "price": 2.50
        },
        {
          "name": "Large Size",
          "price": 3.00
        }
      ]
    },
    {
      "item": "ITEM_ID_2",
      "quantity": 1,
      "specialInstructions": "Well done"
    }
  ],
  "payment": {
    "method": "credit",
    "transactionId": "stripe_txn_123456",
    "gateway": "stripe",
    "notes": "Paid via Stripe"
  }
}
```

### Expected Result
✅ Status: 201 Created  
✅ Subtotal includes modifier prices  
✅ Total item count: 3  
✅ Payment recorded with transaction ID

---

## Test Case 3: Delivery Order with Address

### Request
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Bob Johnson",
  "contactPhone": "5551234567",
  "isDeliveryOrder": true,
  "deliveryCharge": 5.00,
  "deliveryTipCharge": 3.00,
  "deliveryAddress": {
    "street": "123 Main Street, Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "addressType": "home",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 2
    }
  ],
  "payment": {
    "method": "online",
    "transactionId": "razorpay_123",
    "gateway": "razorpay"
  }
}
```

### Expected Result
✅ Status: 201 Created  
✅ Delivery charge added to total  
✅ Delivery tip added to total  
✅ Address saved correctly

---

## Test Case 4: Order with Taxes and Discounts

### Request
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Alice Williams",
  "contactPhone": "5559876543",
  "tax": ["TAX_ID_1", "TAX_ID_2"],
  "discount": ["DISCOUNT_ID_1"],
  "restaurantTipCharge": 5.00,
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 3
    }
  ],
  "payment": {
    "method": "wallet",
    "transactionId": "wallet_txn_789",
    "gateway": "paytm"
  }
}
```

### Expected Result
✅ Status: 201 Created  
✅ Tax breakdown includes all taxes  
✅ Discount applied correctly  
✅ Restaurant tip added to total

---

## Test Case 5: Scheduled Order

### Request
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Charlie Brown",
  "contactPhone": "5551112222",
  "isScheduledOrder": true,
  "scheduledTime": "2025-12-25T18:00:00Z",
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 1
    }
  ],
  "payment": {
    "method": "upi",
    "transactionId": "upi_ref_456"
  }
}
```

### Expected Result
✅ Status: 201 Created  
✅ Scheduled time saved  
✅ Order marked as scheduled

---

## Test Case 6: Dine-in Order

### Request
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "David Lee",
  "contactPhone": "5553334444",
  "tableNumber": "A5",
  "serverName": "Sarah Johnson",
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 2
    }
  ],
  "payment": {
    "method": "debit",
    "transactionId": "debit_card_123"
  }
}
```

### Expected Result
✅ Status: 201 Created  
✅ Table number saved  
✅ Server name saved

---

## Error Test Cases

### Test Case 7: Missing Required Fields
```json
{
  "restaurantId": "restaurant_123",
  "orderItems": []
}
```
❌ Expected: 400 Bad Request  
❌ Error: Validation error - missing contactName, contactPhone, payment

---

### Test Case 8: Invalid Payment Method
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Test User",
  "contactPhone": "1234567890",
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 1
    }
  ],
  "payment": {
    "method": "bitcoin"
  }
}
```
❌ Expected: 400 Bad Request  
❌ Error: Invalid payment method

---

### Test Case 9: Invalid Item ID
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Test User",
  "contactPhone": "1234567890",
  "orderItems": [
    {
      "item": "invalid_item_id_123",
      "quantity": 1
    }
  ],
  "payment": {
    "method": "cash"
  }
}
```
❌ Expected: 400 Bad Request  
❌ Error: Some items in your order don't exist

---

### Test Case 10: No Authentication
```json
Request without Authorization header
```
❌ Expected: 401 Unauthorized  
❌ Error: Not authorized, no token provided

---

### Test Case 11: Delivery Order Without Address
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Test User",
  "contactPhone": "1234567890",
  "isDeliveryOrder": true,
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 1
    }
  ],
  "payment": {
    "method": "cash"
  }
}
```
❌ Expected: 400 Bad Request  
❌ Error: Validation error - deliveryAddress is required

---

### Test Case 12: Scheduled Order Without Time
```json
{
  "restaurantId": "restaurant_123",
  "contactName": "Test User",
  "contactPhone": "1234567890",
  "isScheduledOrder": true,
  "orderItems": [
    {
      "item": "ITEM_ID_1",
      "quantity": 1
    }
  ],
  "payment": {
    "method": "cash"
  }
}
```
❌ Expected: 400 Bad Request  
❌ Error: Validation error - scheduledTime is required

---

## Testing with Postman

### Environment Variables
```
base_url = http://localhost:25
api_version = v1
token = <your_jwt_token>
restaurant_id = restaurant_123
item_id_1 = <valid_item_id>
item_id_2 = <valid_item_id>
tax_id_1 = <valid_tax_id>
discount_id_1 = <valid_discount_id>
```

### Pre-request Script (Optional)
```javascript
// Auto-generate phone number
pm.environment.set("random_phone", Math.floor(1000000000 + Math.random() * 9000000000));

// Auto-generate transaction ID
pm.environment.set("transaction_id", "txn_" + Date.now());
```

### Test Script (Postman)
```javascript
// Test successful order creation
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has success status", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.eql("success");
});

pm.test("Order ID is generated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.order.orderId).to.exist;
});

pm.test("Payment status is paid", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.order.payment.paymentStatus).to.eql("paid");
});

pm.test("Balance due is zero", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.order.payment.balanceDue).to.eql(0);
});

pm.test("Order status is confirmed", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.order.orderStatus).to.eql("confirmed");
});

// Save order ID for future tests
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("last_order_id", jsonData.data.order._id);
}
```

---

## Testing with cURL

### Basic Test
```bash
curl -X POST http://localhost:25/api/v1/orders/create-with-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-Id: restaurant_123" \
  -d '{
    "restaurantId": "restaurant_123",
    "contactName": "Test User",
    "contactPhone": "1234567890",
    "orderItems": [
      {
        "item": "ITEM_ID",
        "quantity": 1
      }
    ],
    "payment": {
      "method": "cash"
    }
  }'
```

### With Pretty Print
```bash
curl -X POST http://localhost:25/api/v1/orders/create-with-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-Id: restaurant_123" \
  -d @test-order.json | jq '.'
```

---

## Performance Testing

### Load Test (using Apache Bench)
```bash
ab -n 100 -c 10 -T 'application/json' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Restaurant-Id: restaurant_123" \
  -p test-order.json \
  http://localhost:25/api/v1/orders/create-with-payment
```

### Expected Performance
- Response time: < 500ms
- Success rate: > 99%
- Concurrent requests: Handle 10+ simultaneous orders

---

## Checklist for Testing

- [ ] Test with valid data
- [ ] Test with missing required fields
- [ ] Test with invalid payment methods
- [ ] Test with invalid item IDs
- [ ] Test without authentication
- [ ] Test with unavailable items
- [ ] Test delivery orders with/without address
- [ ] Test scheduled orders with/without time
- [ ] Test with taxes and discounts
- [ ] Test with modifiers
- [ ] Test price calculations
- [ ] Test order ID generation
- [ ] Test payment status updates
- [ ] Test order status updates
- [ ] Verify audit logs
- [ ] Test concurrent requests
- [ ] Test database rollback on errors

---

## Notes

- Replace `ITEM_ID`, `TAX_ID`, `DISCOUNT_ID` with actual IDs from your database
- Ensure items are available before testing
- Check database after each test to verify data integrity
- Monitor logs for any errors or warnings
- Test with different payment methods
- Verify all calculations are correct
