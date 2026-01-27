# Loyalty Integration Quick Reference

## 🚀 Quick Start

### 1. Create Order with Customer Info
```http
POST /api/v1/orders/dine-in
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN
X-Restaurant-Id: restaurant_123

{
  "tableNumber": "5",
  "contactPhone": "+1234567890",    // ← Required for loyalty
  "contactEmail": "john@example.com", // ← Optional
  "contactName": "John Doe",
  "items": [
    {
      "item": "ITEM_ID",
      "quantity": 2
    }
  ]
}
```

### 2. Lookup Customer (Optional - Before Ordering)
```http
GET /api/v1/orders/lookup-customer/+1234567890
Authorization: Bearer YOUR_TOKEN
X-Restaurant-Id: restaurant_123
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
    "allergies": ["peanuts"]
  }
}
```

### 3. Complete Order (Points Auto-Awarded)
```http
POST /api/v1/customer/dine-in/:orderId/checkout
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN
X-Restaurant-Id: restaurant_123

{
  "payment": {
    "method": "card",
    "amount": 45.99
  }
}
```

**✅ Automatic Actions:**
- Customer profile created/updated
- 45 points awarded (1 point per $1)
- Visit recorded
- Favorite items tracked
- Tier upgraded if threshold met

## 📋 All Loyalty Endpoints

### Customer Management
```http
# Create/Update Customer
POST /api/v1/loyalty/customers

# Get Customer
GET /api/v1/loyalty/customers/:identifier

# Get All Customers
GET /api/v1/loyalty/customers?tier=gold&status=active

# Lookup During Order
GET /api/v1/orders/lookup-customer/:identifier
```

### Points Management
```http
# Add Points
POST /api/v1/loyalty/customers/:id/points

# Redeem Points
POST /api/v1/loyalty/customers/:id/redeem

# Record Visit
POST /api/v1/loyalty/customers/:id/visit
```

### Analytics
```http
# Get Statistics
GET /api/v1/loyalty/stats

# Upcoming Birthdays/Anniversaries
GET /api/v1/loyalty/customers/upcoming-occasions?days=7
```

## 💡 Integration Patterns

### Pattern 1: Automatic (Recommended)
Just include customer phone/email in orders. Everything else is automatic!

```javascript
// Order creation
const order = {
  contactPhone: "+1234567890",
  contactEmail: "customer@example.com",
  // ... other fields
};

// Points awarded automatically when order completes ✅
```

### Pattern 2: With Customer Lookup
Show customer info before taking order:

```javascript
// 1. Lookup customer
const customer = await fetch('/api/v1/orders/lookup-customer/+1234567890');

// 2. Display info to staff
console.log(`${customer.name} - ${customer.tier} tier`);
console.log(`${customer.points.current} points available`);
console.log(`Allergies: ${customer.allergies.join(', ')}`);

// 3. Create order
const order = await createOrder({
  contactPhone: customer.phone,
  contactName: customer.name,
  // ... items
});

// 4. Points awarded on completion ✅
```

### Pattern 3: With Points Redemption
Allow customers to use points:

```javascript
// 1. Lookup customer
const customer = await fetch('/api/v1/loyalty/customers/+1234567890');

// 2. Customer chooses to redeem 500 points
const redemption = await fetch(`/api/v1/loyalty/customers/${customer.id}/redeem`, {
  method: 'POST',
  body: JSON.stringify({ points: 500 })
});

// 3. Apply $5 discount to order
order.discount.discounts.push({
  discountType: 'loyalty_points',
  discountAmount: 5.00,
  pointsRedeemed: 500
});

// 4. Complete order
// New points awarded on final amount ✅
```

## 🎯 Points Calculation

### Earning Points
- **Default**: 1 point per $1 spent
- **Customizable** by tier:
  - Bronze: 1x
  - Silver: 1.2x
  - Gold: 1.5x
  - Platinum: 2x
  - VIP: 3x

### Redeeming Points
- **100 points = $1 discount**
- Example: 500 points = $5.00 off

## 🏆 Loyalty Tiers

| Tier | Lifetime Points | Auto-Upgrade |
|------|----------------|--------------|
| 🥉 Bronze | 0 - 999 | Default |
| 🥈 Silver | 1,000 - 2,499 | ✅ Auto |
| 🥇 Gold | 2,500 - 4,999 | ✅ Auto |
| 💎 Platinum | 5,000 - 9,999 | ✅ Auto |
| 👑 VIP | 10,000+ | ✅ Auto |

## 🏷️ Auto-Tags

Customers are automatically tagged:
- `high-value` - Average order > $50
- `frequent-visitor` - 20+ visits
- `new-customer` - First visit < 30 days
- `dormant` - No visit in 90+ days

## 📱 Frontend Examples

### React Component
```jsx
function CustomerLookup({ onCustomerFound }) {
  const [phone, setPhone] = useState('');
  
  const lookupCustomer = async () => {
    const res = await fetch(`/api/v1/orders/lookup-customer/${phone}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-Id': restaurantId
      }
    });
    
    if (res.ok) {
      const { data } = await res.json();
      onCustomerFound(data);
    }
  };
  
  return (
    <div>
      <input 
        value={phone} 
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Enter phone number"
      />
      <button onClick={lookupCustomer}>Lookup</button>
    </div>
  );
}
```

### Flutter Widget
```dart
Future<void> lookupCustomer(String phone) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/v1/orders/lookup-customer/$phone'),
    headers: {
      'Authorization': 'Bearer $token',
      'X-Restaurant-Id': restaurantId,
    },
  );

  if (response.statusCode == 200) {
    final customer = jsonDecode(response.body)['data'];
    
    // Show customer info
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('${customer['name']} - ${customer['tier']}'),
        content: Text('Points: ${customer['points']['current']}'),
      ),
    );
  }
}
```

## ⚠️ Important Notes

1. **Phone/Email Required**: Include `contactPhone` or `contactEmail` in orders
2. **Auto-Creation**: Customers are created automatically if they don't exist
3. **Graceful Failures**: Loyalty errors don't block order completion
4. **Privacy**: Respect marketing opt-in preferences
5. **Points Expiry**: Consider implementing 12-month expiration

## 🔧 Troubleshooting

### Points Not Awarded
- ✅ Check order has `contactPhone` or `contactEmail`
- ✅ Verify order status is `COMPLETED`
- ✅ Check server logs for errors

### Customer Not Found
- ✅ Customer is auto-created on first order
- ✅ Verify phone/email format is correct

### Points Redemption Fails
- ✅ Check customer has sufficient points
- ✅ Verify customer ID is correct
- ✅ Ensure points value is positive

## 📚 Full Documentation

- **Loyalty System**: `docs/CUSTOMER_LOYALTY.md`
- **Integration Guide**: `docs/LOYALTY_ORDERING_INTEGRATION.md`
- **API Reference**: See loyalty controller

## 🎉 That's It!

The loyalty system works automatically. Just include customer contact info in your orders, and points will be awarded on completion!
