# Food Ordering System - Backend API

A production-ready Node.js/Express backend for a multi-tenant food ordering system with comprehensive security, authentication, and order management features.

## 🚀 Features

- **Multi-Tenant Architecture**: Separate MongoDB databases for each restaurant
- **Secure Authentication**: JWT-based authentication with role-based access control
- **Order Management**: Complete order lifecycle management with status tracking
- **Payment Processing**: Flexible payment handling with multiple methods
- **Security**: Rate limiting, CORS, helmet, XSS protection, and input sanitization
- **Logging**: Comprehensive Winston logging with request tracking
- **Validation**: Joi-based request validation
- **API Versioning**: Support for multiple API versions (v1, v2)

## 📋 Prerequisites

- Node.js >= 14.x
- MongoDB >= 4.x
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd food_Ordering
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure the following required variables:
   - `JWT_SECRET`: Secret key for JWT tokens
   - `MONGO_URI`: MongoDB connection string with `{restaurantId}` placeholder
   - `NODE_ENV`: Environment (development/production)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins

4. **Start the server**
   
   Development mode:
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## 📁 Project Structure

```
food_Ordering/
├── config/              # Configuration files
│   ├── db.js           # Database connection management
│   └── generateToken.js # JWT token generation
├── controllers/         # Request handlers
│   ├── menu/           # Menu-related controllers
│   ├── order/          # Order-related controllers
│   ├── restaurant/     # Restaurant-related controllers
│   └── user/           # User-related controllers
├── middleware/          # Express middleware
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   ├── IdentificationMiddleware.js
│   ├── loggingMiddleware.js
│   ├── roleMiddleware.js
│   ├── securityMiddleware.js
│   └── validationMiddleware.js
├── models/             # Mongoose models
│   ├── menu/          # Menu, items, categories
│   ├── order/         # Orders, order types
│   ├── restaurant/    # Restaurants, discounts, taxes
│   └── user/          # User model
├── routes/            # API routes
├── utils/             # Utility functions
│   ├── const.js       # Application constants
│   ├── crudOperations.js
│   └── utils.js
├── logs/              # Log files
├── index.js           # Application entry point
└── package.json
```

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 2580) |
| `NODE_ENV` | Yes | Environment (development/production/test) |
| `MONGO_URI` | Yes | MongoDB connection URI with `{restaurantId}` placeholder |
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: localhost:3000,3001) |

## 🌐 API Endpoints

### Health Check
```
GET /health - Server health status
```

### Authentication (v1)
```
POST /api/v1/user/register - Register new user
POST /api/v1/user/login - User login
GET  /api/v1/user/profile - Get user profile (protected)
```

### Restaurants (v1)
```
GET    /api/v1/restaurant - List restaurants
POST   /api/v1/restaurant - Create restaurant (admin)
GET    /api/v1/restaurant/:id - Get restaurant details
PUT    /api/v1/restaurant/:id - Update restaurant (admin)
DELETE /api/v1/restaurant/:id - Delete restaurant (admin)
```

### Menu (v1)
```
GET  /api/v1/menu - Get menu
POST /api/v1/menu - Create menu item (admin)
GET  /api/v1/item - Get items
POST /api/v1/category - Create category
```

### Orders (v1)
```
POST   /api/v1/orders - Create order (protected)
GET    /api/v1/orders - Get user orders (protected)
GET    /api/v1/orders/:id - Get order details (protected)
PUT    /api/v1/orders/:id/status - Update order status (admin)
DELETE /api/v1/orders/:id - Cancel order (protected)
GET    /api/v1/orders/:id/track - Track order
```

### Payment (v1)
```
POST /api/v1/payment - Process payment
POST /api/v1/payment/refund - Process refund (admin)
```

### Cash Register (v1)
```
GET  /api/v1/cash-register - List all registers
POST /api/v1/cash-register - Create new register
POST /api/v1/cash-register/:id/open - Open cash session
POST /api/v1/cash-register/:id/transaction - Manual transaction
POST /api/v1/cash-register/:id/close - Close cash session
```

## 🔒 Security Features

- **Helmet**: Sets various HTTP headers for security
- **Rate Limiting**: 
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
- **CORS**: Configurable allowed origins
- **Input Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Prevents cross-site scripting
- **HPP**: HTTP Parameter Pollution protection
- **JWT Authentication**: Secure token-based authentication

## 📊 Logging

Logs are stored in the `logs/` directory:
- `combined.log`: All logs
- `error.log`: Error logs only

Winston logger with different log levels based on environment.

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set strong `JWT_SECRET`
4. Configure `ALLOWED_ORIGINS` for your frontend
5. Use process manager (PM2 recommended):
   ```bash
   npm install -g pm2
   pm2 start index.js --name food-ordering-api
   pm2 save
   pm2 startup
   ```

## 📝 Multi-Tenant Architecture

The system uses a multi-tenant architecture where:
- Each restaurant has its own MongoDB database
- Database name format: `restaurant_{restaurantId}`
- A central "Users" database manages all user accounts
- Requests must include `X-Restaurant-Id` header or `restaurantId` in body/query

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

## 👥 Authors

Your Name

## 🐛 Known Issues

- None currently

## 🔮 Future Enhancements

- [ ] Real-time order tracking with WebSockets
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Payment gateway integration (Stripe, Razorpay)
- [ ] File upload for menu images
- [ ] Advanced analytics and reporting
- [ ] Mobile app API support
- [ ] GraphQL API option

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.