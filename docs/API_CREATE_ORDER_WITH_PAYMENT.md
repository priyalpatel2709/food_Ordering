# Create Order with Payment API

## Endpoint
**POST** `/api/v1/orders/create-with-payment`

## Description
Creates a new order and processes payment in a single atomic transaction. This endpoint ensures that both order creation and payment processing succeed or fail together, preventing inconsistent states.

## Authentication
**Required**: Yes (Bearer Token)

## Headers
```json
{
  "Authorization": "Bearer <your_jwt_token>",
  "Content-Type": "application/json",
  "X-Restaurant-Id": "restaurant_123"
}
```

## Request Body

### Required Fields

```json
{
  "restaurantId": "restaurant_123",
  "contactName": "John Doe",
  "contactPhone": "1234567890",
  "orderItems": [
    {
      "item": "item_id_1",
      "quantity": 2,
      "specialInstructions": "No onions",
      "modifiers": [
        {
          "name": "Extra Cheese",
          "price": 2.50
        }
      ]
    }
  ],
  "payment": {
    "method": "credit",
    "transactionId": "txn_123456",
    "gateway": "stripe",
    "notes": "Paid via Stripe"
  }
}
```

### Optional Fields

```json
{
  "menuId": "menu_id_123",
  "orderType": "orderType_id_123",
  "orderNote": "Please deliver to the back door",
  "tax": ["tax_id_1", "tax_id_2"],
  "discount": ["discount_id_1"],
  "restaurantTipCharge": 5.00,
  "deliveryCharge": 3.50,
  "deliveryTipCharge": 2.00,
  "isScheduledOrder": false,
  "scheduledTime": "2025-12-25T18:00:00Z",
  "isDeliveryOrder": true,
  "deliveryAddress": {
    "street": "123 Main St",
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
  "contactEmail": "john@example.com",
  "tableNumber": "A5",
  "serverName": "Jane Smith"
}
```

## Field Descriptions

### Order Items
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `item` | String | Yes | MongoDB ObjectId of the menu item |
| `quantity` | Number | Yes | Quantity ordered (minimum: 1) |
| `specialInstructions` | String | No | Special preparation instructions |
| `modifiers` | Array | No | Array of customizations/add-ons |
| `modifiers[].name` | String | Yes* | Name of the modifier |
| `modifiers[].price` | Number | No | Additional price for modifier |

*Required if modifiers array is provided

### Payment Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | String | Yes | Payment method: `credit`, `debit`, `cash`, `online`, `wallet`, `upi` |
| `transactionId` | String | No | External transaction ID from payment gateway |
| `gateway` | String | No | Payment gateway name (e.g., "stripe", "razorpay") |
| `notes` | String | No | Additional payment notes (max 500 chars) |

### Delivery Information
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isDeliveryOrder` | Boolean | No | Whether this is a delivery order |
| `deliveryAddress` | Object | Conditional | Required if `isDeliveryOrder` is true |
| `deliveryCharge` | Number | No | Delivery fee (default: 0) |
| `deliveryTipCharge` | Number | No | Tip for delivery person (default: 0) |

### Scheduled Order
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isScheduledOrder` | Boolean | No | Whether this is a scheduled order |
| `scheduledTime` | Date | Conditional | Required if `isScheduledOrder` is true |

## Response

### Success Response (201 Created)

```json
{
  "status": "success",
  "message": "Order created and payment processed successfully",
  "data": {
    "order": {
      "_id": "order_id_123",
      "orderId": "QNIC-20251224-1234",
      "restaurantId": "restaurant_123",
      "customerId": "user_id_123",
      "orderItems": [...],
      "subtotal": 25.50,
      "tax": {
        "taxes": [...],
        "totalTaxAmount": 2.55
      },
      "discount": {
        "discounts": [...],
        "totalDiscountAmount": 5.00
      },
      "orderFinalCharge": 28.05,
      "payment": {
        "history": [{
          "method": "credit",
          "transactionId": "txn_123456",
          "status": "complete",
          "amount": 28.05,
          "processedAt": "2025-12-24T12:00:00Z",
          "gateway": "stripe"
        }],
        "totalPaid": 28.05,
        "balanceDue": 0,
        "paymentStatus": "paid"
      },
      "orderStatus": "confirmed",
      "createdAt": "2025-12-24T12:00:00Z",
      "updatedAt": "2025-12-24T12:00:00Z"
    },
    "summary": {
      "orderId": "QNIC-20251224-1234",
      "subtotal": 25.50,
      "tax": 2.55,
      "discount": 5.00,
      "deliveryCharge": 3.50,
      "tips": 7.00,
      "total": 28.05,
      "paymentStatus": "paid",
      "orderStatus": "confirmed"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "status": "error",
  "message": "Validation error",
  "errors": "\"orderItems\" is required, \"payment\" is required"
}
```

#### 400 Bad Request - Item Unavailable
```json
{
  "status": "error",
  "message": "Item \"Burger\" is currently unavailable"
}
```

#### 400 Bad Request - Invalid Items
```json
{
  "status": "error",
  "message": "Some items in your order don't exist",
  "invalidItems": ["item_id_1", "item_id_2"]
}
```

#### 400 Bad Request - Invalid Payment Method
```json
{
  "status": "error",
  "message": "Invalid payment method. Allowed: credit, debit, cash, online, wallet, upi"
}
```

#### 401 Unauthorized
```json
{
  "status": "error",
  "error": "Not authorized, no token provided"
}
```

#### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to create order with payment. Please try again.",
  "error": "Internal server error"
}
```

## Price Calculation

The endpoint automatically calculates prices server-side for security:

1. **Subtotal**: Sum of (item price + modifiers) × quantity for all items
2. **Tax**: Applied as percentage of subtotal
3. **Discount**: Applied as fixed amount or percentage
4. **Tips**: Restaurant tip + delivery tip
5. **Delivery**: Flat delivery charge
6. **Final Total**: Subtotal + Tax + Tips + Delivery - Discount

**Important**: Client-submitted prices are **ignored**. The server always uses the current menu prices.

## Security Features

✅ **Server-side price validation** - Prevents price manipulation  
✅ **Item availability check** - Ensures items are in stock  
✅ **Atomic transaction** - Order and payment succeed/fail together  
✅ **Authentication required** - Only authenticated users can order  
✅ **Audit logging** - All transactions are logged  
✅ **Input validation** - Comprehensive Joi schema validation  

## Example Usage

### JavaScript (Fetch)
```javascript
const createOrderWithPayment = async () => {
  const response = await fetch('http://localhost:25/api/v1/orders/create-with-payment', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restaurant-Id': 'restaurant_123'
    },
    body: JSON.stringify({
      restaurantId: 'restaurant_123',
      contactName: 'John Doe',
      contactPhone: '1234567890',
      orderItems: [
        {
          item: '507f1f77bcf86cd799439011',
          quantity: 2,
          specialInstructions: 'Extra spicy'
        }
      ],
      payment: {
        method: 'credit',
        transactionId: 'txn_abc123',
        gateway: 'stripe'
      }
    })
  });

  const data = await response.json();
  console.log(data);
};
```

### cURL
```bash
curl -X POST http://localhost:25/api/v1/orders/create-with-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-Id: restaurant_123" \
  -d '{
    "restaurantId": "restaurant_123",
    "contactName": "John Doe",
    "contactPhone": "1234567890",
    "orderItems": [
      {
        "item": "507f1f77bcf86cd799439011",
        "quantity": 2
      }
    ],
    "payment": {
      "method": "credit",
      "transactionId": "txn_abc123"
    }
  }'
```

## Workflow

```
1. Client sends order + payment info
   ↓
2. Server validates request (Joi schema)
   ↓
3. Server verifies authentication
   ↓
4. Server identifies tenant (restaurant)
   ↓
5. Server fetches items from database
   ↓
6. Server validates item availability
   ↓
7. Server calculates prices (server-side)
   ↓
8. Server applies taxes and discounts
   ↓
9. Server creates order with payment
   ↓
10. Server returns success response
```

## Differences from Regular Order Creation

| Feature | `/orders` (Regular) | `/orders/create-with-payment` (New) |
|---------|---------------------|-------------------------------------|
| Payment | Optional, can pay later | Required, immediate payment |
| Order Status | `pending` | `confirmed` |
| Payment Status | `pending` | `paid` |
| Use Case | Pay on delivery, split payments | Immediate payment, online orders |
| Atomicity | Order created first | Order + payment together |

## Best Practices

1. **Always validate payment on client-side** before calling this endpoint
2. **Handle payment gateway integration** before calling this API
3. **Store transaction IDs** from your payment gateway
4. **Implement retry logic** for failed requests
5. **Show loading states** during order creation
6. **Verify order creation** by checking the returned orderId

## Notes

- All monetary values are in the restaurant's default currency
- Prices are rounded to 2 decimal places
- Order ID is auto-generated in format: `QNIC-YYYYMMDD-XXXX`
- Payment is marked as `complete` immediately
- Order status is set to `confirmed` upon successful payment
- Failed payments will not create an order (atomic transaction)

## Related Endpoints

- `POST /api/v1/orders` - Create order without immediate payment
- `POST /api/v1/payment/processPayment/:orderId` - Process payment for existing order
- `GET /api/v1/orders/:id` - Get order details
- `GET /api/v1/orders/my-orders` - Get user's orders
