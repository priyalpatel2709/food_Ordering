# Customer Loyalty & Marketing System

## Overview
A comprehensive customer relationship management (CRM) and loyalty program system for restaurants. Track customer visits, manage loyalty points, segment customers, and run targeted marketing campaigns.

## Features

### 🎯 **Customer Management**
- Complete customer profiles with contact details
- Visit history and spending analytics
- Dietary preferences and allergies tracking
- Favorite items tracking
- Staff notes for personalized service

### 💎 **Loyalty Program**
- **5-Tier System**: Bronze → Silver → Gold → Platinum → VIP
- Points accumulation on purchases
- Points redemption for rewards
- Automatic tier upgrades based on lifetime points
- Referral program with unique codes

### 📊 **Customer Segmentation**
- Auto-tagging based on behavior
- Custom segments for targeted marketing
- Dormant customer identification
- High-value customer tracking

### 🎂 **Special Occasions**
- Birthday and anniversary tracking
- Automated occasion reminders
- Custom special occasions support
- Marketing opt-in preferences

### 📈 **Analytics & Insights**
- Customer lifetime value
- Visit frequency analysis
- Average order value tracking
- Tier distribution reports
- Top customers leaderboard

## Data Model

### Customer Loyalty Schema

```javascript
{
  // Basic Information
  userId: ObjectId,
  restaurantId: String,
  phone: String (required, indexed),
  email: String,
  name: String (required),
  dateOfBirth: Date,
  anniversary: Date,
  
  // Loyalty Program
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum" | "vip",
  loyaltyPoints: {
    current: Number,      // Available points
    lifetime: Number,     // Total earned
    redeemed: Number      // Total redeemed
  },
  memberSince: Date,
  
  // Visit Statistics
  visitStats: {
    totalVisits: Number,
    lastVisit: Date,
    firstVisit: Date,
    averageOrderValue: Number,
    totalSpent: Number,
    averageVisitsPerMonth: Number
  },
  
  // Preferences
  preferences: {
    favoriteItems: [{ itemId, orderCount }],
    dietaryRestrictions: ["vegetarian", "vegan", ...],
    allergies: [String],
    spiceLevel: "mild" | "medium" | "hot" | "extra-hot",
    preferredSeating: "indoor" | "outdoor" | "bar" | ...
  },
  
  // Marketing
  marketing: {
    emailOptIn: Boolean,
    smsOptIn: Boolean,
    pushNotifications: Boolean,
    specialOffers: Boolean,
    birthdayOffers: Boolean,
    anniversaryOffers: Boolean
  },
  
  // Segmentation
  tags: [String],        // "high-value", "frequent-visitor", etc.
  segments: [String],    // "vip", "at-risk", "new-customer", etc.
  
  // Referral Program
  referral: {
    referralCode: String (unique),
    referredBy: ObjectId,
    referralsCount: Number,
    referralRewards: Number
  },
  
  // Special Occasions
  specialOccasions: [{
    name: String,
    date: Date,
    recurring: Boolean
  }],
  
  // Feedback
  feedback: {
    averageRating: Number,
    totalReviews: Number,
    lastReviewDate: Date
  },
  
  // Status
  status: "active" | "inactive" | "blocked" | "dormant",
  
  // Notes
  notes: [{
    note: String,
    addedBy: ObjectId,
    addedAt: Date
  }],
  
  lastActivity: Date
}
```

## API Endpoints

### 1. Create or Update Customer
```http
POST /api/v1/loyalty/customers
Content-Type: application/json

{
  "userId": "USER_ID",
  "phone": "+1234567890",
  "email": "customer@example.com",
  "name": "John Doe",
  "dateOfBirth": "1990-05-15",
  "anniversary": "2015-06-20",
  "preferences": {
    "dietaryRestrictions": ["vegetarian"],
    "spiceLevel": "medium"
  },
  "marketing": {
    "emailOptIn": true,
    "smsOptIn": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Customer profile created",
  "data": {
    "_id": "...",
    "phone": "+1234567890",
    "loyaltyTier": "bronze",
    "loyaltyPoints": {
      "current": 0,
      "lifetime": 0,
      "redeemed": 0
    },
    "referral": {
      "referralCode": "JOH8X9Y2Z"
    }
  }
}
```

### 2. Get Customer by Phone or ID
```http
GET /api/v1/loyalty/customers/+1234567890
GET /api/v1/loyalty/customers/65f1a2b3c4d5e6f7g8h9i0j1
```

### 3. Get All Customers (with Filtering)
```http
GET /api/v1/loyalty/customers?tier=gold&status=active&page=1&limit=50
GET /api/v1/loyalty/customers?search=John&segment=vip
GET /api/v1/loyalty/customers?tag=high-value
```

**Query Parameters:**
- `tier`: Filter by loyalty tier
- `status`: Filter by status (active, inactive, dormant, blocked)
- `segment`: Filter by segment
- `tag`: Filter by tag
- `search`: Search by name, phone, or email
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)

### 4. Add Loyalty Points
```http
POST /api/v1/loyalty/customers/:id/points
Content-Type: application/json

{
  "points": 100,
  "reason": "Purchase - Order #12345"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Added 100 points",
  "data": {
    "currentPoints": 1250,
    "lifetimePoints": 2500,
    "tier": "gold"
  }
}
```

### 5. Redeem Loyalty Points
```http
POST /api/v1/loyalty/customers/:id/redeem
Content-Type: application/json

{
  "points": 500
}
```

### 6. Record a Visit
```http
POST /api/v1/loyalty/customers/:id/visit
Content-Type: application/json

{
  "orderAmount": 45.99
}
```

**Auto-Updates:**
- Increments `totalVisits`
- Updates `lastVisit` timestamp
- Recalculates `averageOrderValue`
- Updates `totalSpent`
- Auto-tags customer based on behavior

### 7. Get Loyalty Statistics
```http
GET /api/v1/loyalty/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "tierDistribution": [
      {
        "_id": "gold",
        "count": 45,
        "avgLifetimePoints": 3200,
        "totalSpent": 12500
      }
    ],
    "statusDistribution": [...],
    "topCustomers": [...],
    "summary": {
      "totalCustomers": 250,
      "totalPointsIssued": 125000,
      "totalPointsRedeemed": 45000,
      "totalRevenue": 85000,
      "avgOrderValue": 42.50
    }
  }
}
```

### 8. Get Upcoming Birthdays/Anniversaries
```http
GET /api/v1/loyalty/customers/upcoming-occasions?days=7
```

Returns customers with birthdays or anniversaries in the next X days.

### 9. Add Customer Note
```http
POST /api/v1/loyalty/customers/:id/notes
Content-Type: application/json

{
  "note": "Prefers window seating. Allergic to peanuts."
}
```

## Loyalty Tier System

### Tier Thresholds (Lifetime Points)
- **Bronze**: 0 - 999 points
- **Silver**: 1,000 - 2,499 points
- **Gold**: 2,500 - 4,999 points
- **Platinum**: 5,000 - 9,999 points
- **VIP**: 10,000+ points

### Auto-Upgrade
Tiers are automatically upgraded when customers earn points. The `updateTier()` method is called automatically when points are added.

## Auto-Tagging System

Customers are automatically tagged based on behavior:

### Tags
- **`high-value`**: Average order value > $50
- **`frequent-visitor`**: Total visits > 20
- **`new-customer`**: First visit < 30 days ago
- **`dormant`**: Last visit > 90 days ago

### Auto-Tagging Trigger
Tags are updated automatically when:
- A visit is recorded
- Points are added
- Customer profile is updated

## Integration with Orders

### Automatic Points Calculation
```javascript
// In order completion handler
const customer = await CustomerLoyalty.findOne({ phone: order.customerPhone });

if (customer) {
  // Award 1 point per dollar spent
  const points = Math.floor(order.orderFinalCharge);
  await customer.addPoints(points, `Order #${order.orderId}`);
  
  // Record visit
  await customer.recordVisit(order.orderFinalCharge);
}
```

### Points Redemption Discount
```javascript
// Apply points as discount
const pointsValue = pointsToRedeem / 100; // 100 points = $1
const discount = {
  type: "loyalty_points",
  amount: pointsValue,
  pointsRedeemed: pointsToRedeem
};

// Redeem points
await customer.redeemPoints(pointsToRedeem);
```

## Marketing Campaigns

### Birthday Campaign Example
```javascript
// Get customers with birthdays in next 7 days
const customers = await fetch('/api/v1/loyalty/customers/upcoming-occasions?days=7');

// Send birthday offers
customers.data.forEach(customer => {
  if (customer.marketing.birthdayOffers && customer.marketing.emailOptIn) {
    sendEmail(customer.email, {
      subject: 'Happy Birthday! 🎂',
      template: 'birthday_offer',
      data: {
        name: customer.name,
        tier: customer.loyaltyTier,
        discount: getTierDiscount(customer.loyaltyTier)
      }
    });
  }
});
```

### Win-Back Campaign (Dormant Customers)
```javascript
// Get dormant customers
const dormantCustomers = await fetch('/api/v1/loyalty/customers?status=dormant');

// Send win-back offers
dormantCustomers.data.forEach(customer => {
  if (customer.marketing.specialOffers) {
    sendWinBackOffer(customer);
  }
});
```

## Best Practices

### 1. Privacy & Consent
- Always respect marketing opt-in preferences
- Provide easy opt-out mechanisms
- Comply with GDPR/CCPA regulations

### 2. Points Strategy
- **Earning**: 1 point per $1 spent (adjustable)
- **Redemption**: 100 points = $1 discount
- **Expiration**: Consider 12-month expiration for inactive points

### 3. Tier Benefits
- **Bronze**: Basic rewards
- **Silver**: 5% discount on birthdays
- **Gold**: 10% discount + priority seating
- **Platinum**: 15% discount + exclusive menu items
- **VIP**: 20% discount + complimentary items

### 4. Data Quality
- Validate phone numbers and emails
- Merge duplicate profiles
- Regular data cleanup for inactive customers

### 5. Segmentation Strategy
- **New Customers**: Welcome series, onboarding
- **Frequent Visitors**: Exclusive previews, VIP events
- **High-Value**: Personal account manager, special perks
- **At-Risk**: Win-back campaigns, surveys
- **Dormant**: Re-engagement offers

## Security Considerations

1. **PII Protection**: Customer data is sensitive - use encryption
2. **Access Control**: Only authorized staff can view customer details
3. **Audit Trail**: All point transactions are logged
4. **RBAC**: Use `PERMISSIONS.RESTAURANT_READ/UPDATE` for access control

## Performance

### Indexes
```javascript
// Compound index for fast lookups
{ restaurantId: 1, phone: 1 } - unique
{ restaurantId: 1, email: 1 }
{ restaurantId: 1, loyaltyTier: 1 }
{ restaurantId: 1, status: 1 }
{ "referral.referralCode": 1 }
{ tags: 1 }
{ segments: 1 }
```

### Optimization Tips
- Use pagination for customer lists
- Cache frequently accessed data
- Batch process marketing campaigns
- Index on commonly filtered fields

## Future Enhancements

1. **SMS Integration**: Send SMS for special occasions
2. **Push Notifications**: Real-time offers via mobile app
3. **AI Recommendations**: Personalized menu suggestions
4. **Gamification**: Badges, challenges, leaderboards
5. **Social Integration**: Share achievements, refer friends
6. **Advanced Analytics**: Predictive churn analysis, CLV forecasting
