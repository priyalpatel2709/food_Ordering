# KDS Frontend Implementation Guide (Flutter)

This guide outlines the implementation of the Kitchen Display System (KDS) module in the Flutter frontend, supporting the new station-based routing and item-level status flows.

## 1. new Models

### `KdsConfig`
```dart
class KdsConfig {
  final List<String> workflow; // e.g., ["new", "start", "prepared", "ready"]
  final List<KdsStation> stations;

  KdsConfig({required this.workflow, required this.stations});

  factory KdsConfig.fromJson(Map<String, dynamic> json) {
    return KdsConfig(
      workflow: List<String>.from(json['workflow'] ?? []),
      stations: (json['stations'] as List).map((e) => KdsStation.fromJson(e)).toList(),
    );
  }
}
```

### `KdsStation`
```dart
class KdsStation {
  final String name;
  final List<String> categories; // List of Category IDs

  KdsStation({required this.name, required this.categories});

  factory KdsStation.fromJson(Map<String, dynamic> json) {
    return KdsStation(
      name: json['name'],
      categories: List<String>.from(json['categories'] ?? []),
    );
  }
}
```

### `OrderItem` (Updated)
Ensure your existing `OrderItem` model includes the new KDS fields:
```dart
class OrderItem {
  final String id; // Subdocument ID
  final String itemId; // Product Reference ID
  final String name;
  final int quantity;
  final String itemStatus; // "new", "start", "prepared", "ready"
  final KdsTimestamps? timestamps;
  final List<Modifier> modifiers;
  final String? specialInstructions;
  // ... other fields
}

class KdsTimestamps {
  final DateTime? startedAt;
  final DateTime? preparedAt;
  final DateTime? readyAt;
  // ... fromJson
}
```

## 2. API Repository (`KdsRepository`)

Add these methods to your `KdsRepository`:

```dart
class KdsRepository {
  final Dio _dio;
  
  // ... constructor

  Future<KdsConfig> getKdsConfig() async {
    final response = await _dio.get('/api/v1/kds/config');
    return KdsConfig.fromJson(response.data['data']);
  }

  Future<List<Order>> getActiveOrders() async {
    final response = await _dio.get('/api/v1/kds');
    return (response.data['data'] as List)
        .map((e) => Order.fromJson(e))
        .toList();
  }

  Future<void> updateItemStatus(String orderId, String itemId, String status) async {
    await _dio.patch('/api/v1/kds/$orderId/items/$itemId/status', data: {
      'status': status
    });
  }
}
```

## 3. State Management (Riverpod)

### Providers

1.  **`kdsConfigProvider`**: Fetches the configuration once at startup.
2.  **`selectedStationProvider`**: Stores the user's chosen station (locally on device).
3.  **`kdsOrdersProvider`**: Stream provider that merges API fetch + Socket.io updates.

```dart
// 1. Station Selection
final selectedStationProvider = StateProvider<KdsStation?>((ref) => null);

// 2. Config
final kdsConfigProvider = FutureProvider<KdsConfig>((ref) async {
  return ref.read(kdsRepositoryProvider).getKdsConfig();
});

// 3. Orders Stream (Simplified)
final kdsOrdersProvider = StreamProvider<List<Order>>((ref) async* {
  final repository = ref.read(kdsRepositoryProvider);
  final socketService = ref.read(socketServiceProvider);

  // 1. Fetch Initial Data
  List<Order> orders = await repository.getActiveOrders();
  yield orders;

  // 2. Listen to Socket Events
  // Assuming socketService exposes a stream for 'kds_update'
  await for (final update in socketService.kdsUpdates) {
    // Handle INSERT
    if (update.operationType == 'insert') {
       orders.add(Order.fromJson(update.fullDocument));
    } 
    // Handle UPDATE
    else if (update.operationType == 'update') {
       final index = orders.indexWhere((o) => o.id == update.documentKey);
       if (index != -1) {
          // If using 'updateLookup', fullDocument is available
          orders[index] = Order.fromJson(update.fullDocument);
       }
    }
    
    // Sort by createdAt (FIFO)
    orders.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    
    yield [...orders]; // Emit new list
  }
});
```

### `filteredOrdersProvider` (The Logic Core)
This provider filters the full order list to show only relevant items for the selected station.

```dart
final kdsStationOrdersProvider = Provider<List<OrderDisplayModel>>((ref) {
  final allOrders = ref.watch(kdsOrdersProvider).value ?? [];
  final station = ref.watch(selectedStationProvider);
  
  if (station == null) return []; // Show nothing if no station selected

  // Filter and Transform
  return allOrders.map((order) {
    // Filter items that belong to this station's categories
    final relevantItems = order.items.where((item) {
       // You need to ensure 'item' model has 'categoryId' populated or available
       return station.categories.contains(item.categoryId);
    }).toList();

    if (relevantItems.isEmpty) return null; // Skip order if no items for this station

    return OrderDisplayModel(
       orderId: order.id,
       tableNumber: order.tableNumber,
       serverName: order.serverName,
       items: relevantItems,
       timeElapsed: DateTime.now().difference(order.createdAt),
    );
  }).whereType<OrderDisplayModel>().toList();
});
```

## 4. UI Structure

### A. Station Config Screen
*   **Route**: `/kds/setup`
*   **Logic**:
    *   Call `kdsConfigProvider`.
    *   Display list of `stations` as big buttons.
    *   On tap -> set `selectedStationProvider` -> Navigate to `/kds/board`.

### B. KDS Board Screen
*   **Route**: `/kds/board`
*   **Layout**:
    *   Header: Station Name, Clock, Connection Status.
    *   Body: `MasonryGridView` or `Wrap` of `OrderCard`s.
*   **Data**: Watch `kdsStationOrdersProvider`.

### C. Order Card Component
*   **Display**:
    *   Header: Table # (Color coded by wait time).
    *   Body: List of items.
    *   Footer: "Bump" / "Done" button (Mark all ready).
*   **Item Row**:
    *   Name + Quantity + Modifiers.
    *   **Action**: Tap to toggle status (New -> Start -> Prepared -> Ready).
    *   **Double Tap**: Undo status.

### D. Item Status Logic (UI)
When a user taps an item:
1.  Optimistically update UI (optional).
2.  Call `ref.read(kdsRepositoryProvider).updateItemStatus(...)`.
    *   Cycle: New -> Start -> Prepared -> Ready.
    *   If current is 'ready', maybe archive it visually.

## 5. Workflow Example

1.  **Launch**: App opens, asks "Select Station".
2.  **Select**: User picks "Grill Station".
3.  **View**: Screen shows 3 orders.
    *   Order #101: 2 Burgers (Grill), 1 Salad (Salad Station - Hidden).
    *   The "Grill" screen ONLY shows the 2 Burgers.
4.  **Action**: Cook taps "Burger" -> Status becomes "Started" (Yellow).
5.  **Completion**: Cook taps "Burger" again -> "Prepared" (Green).
6.  **Server Notification**: Since the Salad was already done, the Backend sees all items are ready -> Updates Order Status to `READY`. Server gets notified.

## 6. Socket.io Event Handling
Ensure in your `RealtimeService` (Frontend), you listen for:
*   Event: `kds_update` (matches backend event).
*   Payload: `{ operationType, fullDocument, ... }`.

Using `ref.listen` or a `StreamController` is recommended to bridge socket events to Riverpod.
