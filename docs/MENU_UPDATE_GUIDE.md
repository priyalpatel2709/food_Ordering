# 🍴 Menu API Implementation Guide (Frontend)

This document provides instructions for implementing menu functionality including fetching, creating, and updating menus using `MenuController.js`.

---

## 1. Fetching Menus

### 🌟 Current Active Menu
Fetches the menus currently active and available based on the restaurant's time and day.

- **Method:** `GET`
- **Endpoint:** `/api/v1/menu/current`
- **Headers:** `x-restaurant-id` (Required)
- **Note:** This is the most critical endpoint for the customer-facing app. It returns optimized data with pre-calculated `finalPrice`.

### 📋 Get Menu by ID
Fetches full details for a specific menu, including populated categories and items.

- **Method:** `GET`
- **Endpoint:** `/api/v1/menu/:id`
- **Purpose:** Use this for loading the "Edit Menu" screen in the management dashboard.

---

## 2. Create a New Menu
Initialize a new menu for the restaurant.

- **Method:** `POST`
- **Endpoint:** `/api/v1/menu/createMenu`
- **Authentication:** Requires `Authorization` (Bearer Token) and `x-restaurant-id` header.

### 📦 Payload Example:
```json
{
  "name": "Lunch Special",
  "description": "Available weekdays for lunch",
  "isActive": true,
  "availableDays": [
    {
      "day": "Monday",
      "timeSlots": [{ "openTime": "11:00", "closeTime": "15:00" }]
    },
    {
      "day": "Tuesday",
      "timeSlots": [{ "openTime": "11:00", "closeTime": "15:00" }]
    }
  ],
  "categories": ["6773a1...cat1"],
  "items": [
    {
      "item": "6773a1...item1",
      "membershipPricing": [{ "membershipLevel": "Gold", "price": 10.00 }]
    }
  ],
  "taxes": ["6773a1...tax1"]
}
```

---

## 3. General Update (`updateById`)

Use this for updating **top-level** menu details. This is a standard CRUD operation.

- **Method:** `PUT`
- **Endpoint:** `/api/v1/menu/:id`
- **Purpose:** Update basic fields that are direct properties of the Menu document.
- **Authentication:** Requires `Authorization` (Bearer Token) and `x-restaurant-id` header.

### ✅ When to use:
- Changing Menu Name or Description.
- Toggling `isActive` status.
- Overwriting the entire category or items array.

### 📦 Payload Example:
```json
{
  "name": "Updated Weekend Menu",
  "description": "New weekend specials across all sections",
  "isActive": true,
  "categories": ["6773a1...f01", "6773a1...f02"]
}
```

---

## 3. Add a New Item to Menu

Use this to specifically add one or more items to an existing menu's item list without sending the entire items array.

- **Method:** `POST`
- **Endpoint:** `/api/v1/menu/:id/add-item`
- **Purpose:** Append a new item with its specific pricing rules to the menu.

### 📦 Payload Example:
```json
{
  "item": "6773...cc1",
  "timeBasedPricing": [
    {
      "days": ["Monday", "Friday"],
      "startTime": "14:00",
      "endTime": "17:00",
      "price": 9.99
    }
  ],
  "membershipPricing": [
    { "membershipLevel": "Silver", "price": 11.50 }
  ]
}
```

---

## 4. Deep Update (`updateMenu`)

This is the **Main Advanced Update**. It targets specific nested objects inside the menu (like specific time slots or item pricing rules) using MongoDB Array Filters.

- **Method:** `PUT`
- **Endpoint:** `/api/v1/menu/updateById/:id`
- **Purpose:** Modify specific rows in sub-arrays without affecting other data in the menu.
- **Authentication:** Requires `Authorization` (Bearer Token) and `x-restaurant-id` header.

### ✅ When to use:
- Changing `openTime` or `closeTime` for a specific day.
- Adjusting the `price` for a specific `timeBasedPricing` rule.
- Updating `membershipPrice` or `specialEventMultipliers`.

### 🔑 Required Identification IDs:
To target the correct nested object, you **must** include the relevant `_id` in the request body:
- `timeSlotId`: Unique ID of the slot in `availableDays`.
- `timeBasedPricingId`: Unique ID of the rule inside an item.
- `membershipPricingId`: Unique ID of the membership rule.
- `specialEventPricingId`: Unique ID of the special event rule.

### 📦 Payload Example:
```json
{
  "timeSlotId": "6773...af2",   // Target slot ID
  "openTime": "09:00",
  "closeTime": "21:00",
  
  "itemId": "6773...cc1",      // Parent Item ID
  "timeBasedPricingId": "6773...dd2",
  "price": 15.99,
  "days": ["Monday", "Wednesday"],
  
  "membershipPricingId": "6773...ee3",
  "membershipLevel": "Gold",
  "membershipPrice": 12.00,
  
  "specialEventPricingId": "6773...ff4",
  "event": "NYE Special",
  "priceMultiplier": 1.5
}
```

---

## 💡 Frontend Implementation Tips

### 1. Unified Service Layer
Create a service that sets the `x-restaurant-id` header for all requests automatically.

### 2. UI Mapping
- **Manager View**: Use `updateById` for the "General Settings" tab.
- **Rules View**: When a user clicks "Edit" on a specific Pricing Rule or Time Slot row, capture that row's `_id` and use it as the `Id` field in the `updateMenu` call.

### 3. Error Handling
The backend uses `http-errors`. Ensure your frontend catches and displays the `message` field from the error response (e.g., "timeSlotId is required").

---

## 📂 Summary Table

| Feature | Method | URL | Logic |
| :--- | :--- | :--- | :--- |
| **Current Menu** | `GET` | `/api/v1/menu/current` | Fetches active menus for today. |
| **Get Details**| `GET` | `/api/v1/menu/:id` | Full menu dump for editing. |
| **Create Menu** | `POST`| `/api/v1/menu/createMenu` | Creates a new menu from scratch. |
| **General Edit**| `PUT` | `/api/v1/menu/:id` | Overwrites top-level fields. |
| **Add Item** | `POST`| `/api/v1/menu/:id/add-item` | Appends a new item to the list. |
| **Deep Update** | `PUT` | `/api/v1/menu/updateById/:id` | Targets specific sub-array rows. |
