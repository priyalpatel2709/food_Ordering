# Scheduled Order System - Documentation

## Overview
The Scheduled Order System automatically sends orders to the Kitchen Display System (KDS) and printer at a pre-scheduled time. This is perfect for:
- **Pre-orders**: Customers ordering in advance for pickup/delivery
- **Catering**: Large orders scheduled for specific times
- **Meal prep**: Batch cooking scheduled throughout the day

## How It Works

### 1. **Creating a Scheduled Order**
When creating an order, set these fields:
```json
{
  "isScheduledOrder": true,
  "scheduledTime": "2026-01-27T18:30:00.000Z",
  "orderItems": [...],
  "customerId": "...",
  ...
}
```

The order will be created with:
- `orderStatus`: "pending" or "confirmed"
- `scheduledOrderStatus`: "pending"
- `isScheduledOrder`: true

### 2. **Automatic Processing**
A background cron job runs **every minute** and:
1. Finds all orders where `scheduledTime <= now` and `scheduledOrderStatus === "pending"`
2. Updates each order:
   - `orderStatus` → "preparing"
   - `scheduledOrderStatus` → "sent_to_kds"
   - `preparationStartTime` → current time
   - All items get `itemStatus` → "new"
3. Emits real-time events:
   - `scheduled_order_ready` → KDS screens
   - `print_order` → Printer systems

### 3. **Real-time Notifications**
Socket.io events are emitted to:
- **KDS Room**: `restaurant_{restaurantId}`
- **Printer Room**: `restaurant_{restaurantId}_printer`

Event payload:
```json
{
  "orderId": "...",
  "orderNumber": "QNIC-12345",
  "scheduledTime": "2026-01-27T18:30:00.000Z",
  "items": [...],
  "message": "Scheduled order is ready for preparation"
}
```

## API Endpoints

### 1. Get All Scheduled Orders
```http
GET /api/v1/orders/scheduled?status=pending&startDate=2026-01-27&endDate=2026-01-28
```

**Query Parameters:**
- `status`: Filter by `pending`, `sent_to_kds`, or `failed`
- `startDate`: Filter by scheduled time (YYYY-MM-DD)
- `endDate`: Filter by scheduled time (YYYY-MM-DD)

**Response:**
```json
{
  "status": "success",
  "results": 5,
  "data": [
    {
      "_id": "...",
      "orderId": "QNIC-12345",
      "isScheduledOrder": true,
      "scheduledTime": "2026-01-27T18:30:00.000Z",
      "scheduledOrderStatus": "pending",
      "orderStatus": "confirmed",
      "orderItems": [...]
    }
  ]
}
```

### 2. Update Scheduled Time
```http
PUT /api/v1/orders/scheduled/:orderId
Content-Type: application/json

{
  "scheduledTime": "2026-01-27T19:00:00.000Z"
}
```

**Restrictions:**
- Cannot update if already sent to KDS
- New time must be in the future

### 3. Cancel Scheduled Order
```http
DELETE /api/v1/orders/scheduled/:orderId
```

**Restrictions:**
- Cannot cancel if already sent to KDS

### 4. Manual Trigger (Testing/Admin)
```http
POST /api/v1/orders/scheduled/trigger
```

Immediately processes all due scheduled orders (useful for testing).

## Order Model Fields

### New Fields Added:
```javascript
{
  isScheduledOrder: { type: Boolean, default: false },
  scheduledTime: { type: Date },
  scheduledOrderStatus: {
    type: String,
    enum: ["pending", "sent_to_kds", "failed"],
    default: "pending"
  }
}
```

### Status Flow:
```
1. Order Created
   ↓
   orderStatus: "pending" or "confirmed"
   scheduledOrderStatus: "pending"
   
2. Scheduled Time Reached
   ↓
   orderStatus: "preparing"
   scheduledOrderStatus: "sent_to_kds"
   preparationStartTime: set
   
3. Kitchen Processes
   ↓
   orderStatus: "ready" → "served" → "completed"
```

## Scheduler Service

### Auto-Start
The scheduler automatically starts when:
- A restaurant's database connection is established
- Happens via the `identifyTenant` middleware

### Lifecycle Management
```javascript
// Auto-started per restaurant
startSchedulerForRestaurant(restaurantDb, restaurantId);

// Graceful shutdown
stopAllSchedulers(); // Called on server shutdown
```

### Cron Schedule
- **Frequency**: Every minute (`* * * * *`)
- **Process**: Checks for due orders and sends to KDS
- **Error Handling**: Failed orders marked as `scheduledOrderStatus: "failed"`

## Flutter Frontend Integration

### 1. Dependencies (pubspec.yaml)
```yaml
dependencies:
  socket_io_client: ^2.0.3+1
  http: ^1.1.0
  intl: ^0.18.1
```

### 2. Socket.io Service (Dart)
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  IO.Socket? socket;
  final String restaurantId;

  SocketService(this.restaurantId);

  void connect(String baseUrl) {
    socket = IO.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    socket?.onConnect((_) {
      print('Connected to Socket.io');
      // Join restaurant room
      socket?.emit('join_restaurant', restaurantId);
    });

    socket?.onDisconnect((_) => print('Disconnected from Socket.io'));
  }

  void listenForScheduledOrders(Function(Map<String, dynamic>) onOrderReady) {
    socket?.on('scheduled_order_ready', (data) {
      print('New scheduled order: ${data['orderNumber']}');
      onOrderReady(data);
    });
  }

  void listenForPrintJobs(Function(Map<String, dynamic>) onPrintOrder) {
    socket?.on('print_order', (data) {
      print('Print order: ${data['orderNumber']}');
      onPrintOrder(data);
    });
  }

  void disconnect() {
    socket?.disconnect();
  }
}
```

### 3. KDS Screen Integration
```dart
class KDSScreen extends StatefulWidget {
  @override
  _KDSScreenState createState() => _KDSScreenState();
}

class _KDSScreenState extends State<KDSScreen> {
  late SocketService _socketService;
  List<Map<String, dynamic>> _orders = [];

  @override
  void initState() {
    super.initState();
    _socketService = SocketService('restaurant_123');
    _socketService.connect('http://localhost:2580');
    
    // Listen for scheduled orders
    _socketService.listenForScheduledOrders((data) {
      setState(() {
        _orders.add(data);
      });
      // Play notification sound
      _playNotificationSound();
    });
  }

  void _playNotificationSound() {
    // Add audio player logic
    // AudioPlayer().play(AssetSource('sounds/new_order.mp3'));
  }

  @override
  void dispose() {
    _socketService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('KDS - Kitchen Display')),
      body: ListView.builder(
        itemCount: _orders.length,
        itemBuilder: (context, index) {
          final order = _orders[index];
          return OrderCard(order: order);
        },
      ),
    );
  }
}
```

### 4. Create Scheduled Order (POS)
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class OrderService {
  final String baseUrl;
  final String restaurantId;
  final String authToken;

  OrderService({
    required this.baseUrl,
    required this.restaurantId,
    required this.authToken,
  });

  Future<Map<String, dynamic>> createScheduledOrder({
    required List<Map<String, dynamic>> orderItems,
    required DateTime scheduledTime,
    required String customerId,
  }) async {
    final url = Uri.parse('$baseUrl/api/v1/orders');
    
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-Id': restaurantId,
        'Authorization': 'Bearer $authToken',
      },
      body: jsonEncode({
        'isScheduledOrder': true,
        'scheduledTime': scheduledTime.toUtc().toIso8601String(),
        'orderItems': orderItems,
        'customerId': customerId,
        'orderStatus': 'confirmed',
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create scheduled order: ${response.body}');
    }
  }

  Future<List<dynamic>> getScheduledOrders({
    String? status,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    var queryParams = <String, String>{};
    if (status != null) queryParams['status'] = status;
    if (startDate != null) {
      queryParams['startDate'] = startDate.toIso8601String().split('T')[0];
    }
    if (endDate != null) {
      queryParams['endDate'] = endDate.toIso8601String().split('T')[0];
    }

    final url = Uri.parse('$baseUrl/api/v1/orders/scheduled')
        .replace(queryParameters: queryParams);

    final response = await http.get(
      url,
      headers: {
        'X-Restaurant-Id': restaurantId,
        'Authorization': 'Bearer $authToken',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to fetch scheduled orders');
    }
  }

  Future<void> updateScheduledTime({
    required String orderId,
    required DateTime newScheduledTime,
  }) async {
    final url = Uri.parse('$baseUrl/api/v1/orders/scheduled/$orderId');

    final response = await http.put(
      url,
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-Id': restaurantId,
        'Authorization': 'Bearer $authToken',
      },
      body: jsonEncode({
        'scheduledTime': newScheduledTime.toUtc().toIso8601String(),
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to update scheduled time: ${response.body}');
    }
  }

  Future<void> cancelScheduledOrder(String orderId) async {
    final url = Uri.parse('$baseUrl/api/v1/orders/scheduled/$orderId');

    final response = await http.delete(
      url,
      headers: {
        'X-Restaurant-Id': restaurantId,
        'Authorization': 'Bearer $authToken',
      },
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to cancel scheduled order: ${response.body}');
    }
  }
}
```

### 5. Scheduled Order Form Widget
```dart
class ScheduledOrderForm extends StatefulWidget {
  @override
  _ScheduledOrderFormState createState() => _ScheduledOrderFormState();
}

class _ScheduledOrderFormState extends State<ScheduledOrderForm> {
  DateTime? _scheduledTime;
  final _orderService = OrderService(
    baseUrl: 'http://localhost:2580',
    restaurantId: 'restaurant_123',
    authToken: 'YOUR_AUTH_TOKEN',
  );

  Future<void> _selectDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(Duration(hours: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(Duration(days: 7)),
    );

    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.now(),
      );

      if (time != null) {
        setState(() {
          _scheduledTime = DateTime(
            date.year,
            date.month,
            date.day,
            time.hour,
            time.minute,
          );
        });
      }
    }
  }

  Future<void> _submitOrder() async {
    if (_scheduledTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select a scheduled time')),
      );
      return;
    }

    try {
      final result = await _orderService.createScheduledOrder(
        orderItems: [
          {
            'item': 'ITEM_ID_HERE',
            'quantity': 2,
            'price': 10.99,
          }
        ],
        scheduledTime: _scheduledTime!,
        customerId: 'CUSTOMER_ID_HERE',
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Scheduled order created: ${result['data']['orderId']}'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          title: Text('Scheduled Time'),
          subtitle: Text(
            _scheduledTime != null
                ? DateFormat('MMM dd, yyyy - hh:mm a').format(_scheduledTime!)
                : 'Not selected',
          ),
          trailing: Icon(Icons.calendar_today),
          onTap: _selectDateTime,
        ),
        ElevatedButton(
          onPressed: _submitOrder,
          child: Text('Create Scheduled Order'),
        ),
      ],
    );
  }
}
```

### 6. Scheduled Orders List Screen
```dart
class ScheduledOrdersScreen extends StatefulWidget {
  @override
  _ScheduledOrdersScreenState createState() => _ScheduledOrdersScreenState();
}

class _ScheduledOrdersScreenState extends State<ScheduledOrdersScreen> {
  final _orderService = OrderService(
    baseUrl: 'http://localhost:2580',
    restaurantId: 'restaurant_123',
    authToken: 'YOUR_AUTH_TOKEN',
  );
  List<dynamic> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadScheduledOrders();
  }

  Future<void> _loadScheduledOrders() async {
    try {
      final orders = await _orderService.getScheduledOrders(
        status: 'pending',
      );
      setState(() {
        _orders = orders;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading orders: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    return ListView.builder(
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        final order = _orders[index];
        final scheduledTime = DateTime.parse(order['scheduledTime']);
        
        return Card(
          margin: EdgeInsets.all(8),
          child: ListTile(
            title: Text('Order #${order['orderId']}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Scheduled: ${DateFormat('MMM dd, hh:mm a').format(scheduledTime)}'),
                Text('Status: ${order['scheduledOrderStatus']}'),
                Text('Items: ${order['orderItems'].length}'),
              ],
            ),
            trailing: PopupMenuButton(
              itemBuilder: (context) => [
                PopupMenuItem(
                  child: Text('Reschedule'),
                  value: 'reschedule',
                ),
                PopupMenuItem(
                  child: Text('Cancel'),
                  value: 'cancel',
                ),
              ],
              onSelected: (value) async {
                if (value == 'cancel') {
                  await _orderService.cancelScheduledOrder(order['_id']);
                  _loadScheduledOrders();
                }
                // Add reschedule logic
              },
            ),
          ),
        );
      },
    );
  }
}
```

## Error Handling

### Failed Processing
If an order fails to process:
- `scheduledOrderStatus` → "failed"
- Order remains in database for manual review
- Error logged to system logs

### Common Failure Scenarios:
1. Database connection issues
2. Invalid order data
3. Socket.io not initialized
4. Restaurant not found

## Best Practices

### 1. Scheduling Window
- Minimum: 15 minutes in advance
- Maximum: 7 days in advance
- Validate on frontend before submission

### 2. Time Zone Handling
- Always use UTC timestamps
- Convert to local time on frontend
- Store timezone in restaurant settings

### 3. Notifications
- Send confirmation email when scheduled
- Send reminder 30 minutes before
- Alert kitchen staff 5 minutes before

### 4. Capacity Management
- Limit concurrent scheduled orders
- Check kitchen capacity before accepting
- Suggest alternative times if busy

## Testing

### Manual Trigger
```bash
curl -X POST http://localhost:2580/api/v1/orders/scheduled/trigger \
  -H "X-Restaurant-Id: restaurant_123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Test Order
```bash
curl -X POST http://localhost:2580/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-Id: restaurant_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "isScheduledOrder": true,
    "scheduledTime": "2026-01-27T18:30:00.000Z",
    "orderItems": [
      {
        "item": "ITEM_ID",
        "quantity": 2,
        "price": 10.99
      }
    ],
    "customerId": "CUSTOMER_ID"
  }'
```

## Monitoring

### Check Active Schedulers
```javascript
const { getActiveSchedulerCount } = require('./services/schedulerService');
console.log('Active schedulers:', getActiveSchedulerCount());
```

### View Logs
```bash
# Check for scheduled order processing
grep "Scheduled order" logs/combined.log

# Check for failures
grep "scheduledOrderStatus.*failed" logs/error.log
```

## Dependencies

### Required npm Packages
```json
{
  "node-cron": "^3.0.0",
  "socket.io": "^4.0.0"
}
```

### Installation
```bash
npm install node-cron socket.io
```

## Security Considerations

1. **Authorization**: All endpoints require `ORDER_READ/UPDATE/DELETE` permissions
2. **Tenant Isolation**: Schedulers run per restaurant, no cross-tenant access
3. **Rate Limiting**: Consider limiting scheduled order creation
4. **Validation**: Always validate `scheduledTime` is in future

## Performance

- **Memory**: ~1MB per active scheduler
- **CPU**: Minimal (runs once per minute)
- **Database**: Indexed on `isScheduledOrder`, `scheduledTime`, `scheduledOrderStatus`

### Recommended Indexes
```javascript
db.orders.createIndex({ 
  isScheduledOrder: 1, 
  scheduledOrderStatus: 1, 
  scheduledTime: 1 
});
```
