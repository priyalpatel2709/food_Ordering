# 🛠️ Menu & Restaurant CRUD API Guide (Frontend)

This guide covers the standard CRUD endpoints for Items, Categories, Customizations, Discounts, and Taxes. All these controllers use a unified pattern for creation, retrieval, and updates.

---

## 🔑 Common Success/Error headers
- **Base Headers:**
  - `Content-Type: application/json`
  - `x-restaurant-id: <restaurant_id>` (e.g., `restaurant_123`)
  - `Authorization: Bearer <JWT_TOKEN>`

---

## 1. 🍔 Items API (`itemController.js`)
Manages individual food/drink items.

- **Endpoints:**
  - `POST /api/v1/item/` (Create)
  - `GET /api/v1/item/` (Get All - supports pagination/filtering)
  - `GET /api/v1/item/:id` (Get One)
  - `PUT /api/v1/item/:id` (Update)
  - `DELETE /api/v1/item/:id` (Delete)

### 📦 Create/Update Payload Example:
```json
{
  "name": "Cheeseburger",
  "description": "Juicy beef patty with cheddar cheese",
  "price": 12.99,
  "category": "cat_id_123",
  "customizationOptions": ["mod_id_1", "mod_id_2"],
  "taxRate": ["tax_id_1"],
  "isActive": true,
  "itemImage": "https://example.com/burger.jpg"
}
```

---

## 2. 📁 Categories API (`categoryController.js`)
Groups items together (e.g., Starters, Main Course).

- **Endpoints:**
  - `POST /api/v1/category/`
  - `GET /api/v1/category/`
  - `GET /api/v1/category/:id`
  - `PUT /api/v1/category/:id`
  - `DELETE /api/v1/category/:id`

### 📦 Payload Example:
```json
{
  "name": "Main Course",
  "displayOrder": 1,
  "categoryImage": "https://example.com/cat.jpg",
  "isActive": true
}
```

---

## 3. 🎨 Customization Options API (`customizationOptionController.js`)
Modifiers/Add-ons for items (e.g., "Extra Cheese", "No Onions").

- **Endpoints:**
  - `POST /api/v1/customizationOption/`
  - `GET /api/v1/customizationOption/`
  - `GET /api/v1/customizationOption/:id`
  - `PUT /api/v1/customizationOption/:id`
  - `DELETE /api/v1/customizationOption/:id`

### 📦 Payload Example:
```json
{
  "name": "Extra Toppings",
  "type": "multiple", // single or multiple
  "options": [
    { "name": "Bacon", "price": 2.00 },
    { "name": "Avocado", "price": 1.50 }
  ],
  "isRequired": false
}
```

---

## 4. 🏷️ Discounts API (`discountController.js`)
Promotional offers and coupon codes.

- **Endpoints:**
  - `POST /api/v1/discount/`
  - `GET /api/v1/discount/`
  - `PUT /api/v1/discount/:id`
  - `DELETE /api/v1/discount/:id`

### 📦 Payload Example:
```json
{
  "code": "WELCOME20",
  "type": "percentage", // percentage or fixed
  "value": 20,
  "minOrderAmount": 50,
  "isActive": true,
  "validFrom": "2025-01-01",
  "validTo": "2025-12-31"
}
```

---

## 5. 📑 Taxes API (`taxController.js`)
Tax configurations for items.

- **Endpoints:**
  - `POST /api/v1/tax/`
  - `GET /api/v1/tax/`
  - `PUT /api/v1/tax/:id`
  - `DELETE /api/v1/tax/:id`

### 📦 Payload Example:
```json
{
  "name": "GST",
  "percentage": 18,
  "isActive": true
}
```

---

## 6. 📋 Order Types API (`orderTypeController.js`)
Defines the types of orders allowed (e.g., "Dine-In", "Takeaway", "Delivery").

- **Endpoints:**
  - `POST /api/v1/orderType/`
  - `GET /api/v1/orderType/`
  - `PUT /api/v1/orderType/:id`

### 📦 Payload Example:
```json
{
  "orderType": "Delivery",
  "isActive": true
}
```

---

## 7. 🏦 Restaurant Settings API (`restaurantController.js`)
Update restaurant-specific metadata and configurations.

- **Endpoints:**
  - `GET /api/v1/restaurant/:id`
  - `PUT /api/v1/restaurant/:id`

### 📦 Payload Example:
```json
{
  "name": "The Grand Kitchen",
  "phone": "+1234567890",
  "operatingHours": {
    "Monday": { "openTime": "08:00", "closeTime": "22:00" }
  },
  "kdsConfiguration": {
    "workflow": ["new", "start", "cooking", "ready"]
  }
}
```

---

## 💡 Frontend Integration Logic
1.  **Cascading Creation**: Create Taxes, then Customizations, then Categories, and finally **Items** (since items reference the IDs of others).
2.  **Population**: The `GET` endpoints for Items automatically populate the Category and Tax names for you.
3.  **Soft Delete**: It is recommended to set `isActive: false` using a `PUT` request instead of using `DELETE` for records that have historical order data.
