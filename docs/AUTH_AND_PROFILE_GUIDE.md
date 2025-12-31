# 🔐 Authentication & User Profile Guide

This guide covers user registration, login, and profile management across the platform.

---

## 🔑 Authentication Headers
After login, include the JWT in the `Authorization` header for all protected routes:
- `Authorization: Bearer <JWT_TOKEN>`
- `x-restaurant-id: <restaurant_id>`

---

## 1. 📝 User Registration
- **Method:** `POST`
- **Endpoint:** `/api/v1/user/register`
- **Payload:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "restaurantId": "123",
  "gender": "male",
  "age": 28
}
```

---

## 2. 🔑 User Login
- **Method:** `POST`
- **Endpoint:** `/api/v1/user/login`
- **Payload:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```
- **Response:** Returns the `token`, `_id`, `name`, `role`, and `restaurantId`.

---

## 3. 👤 Profile & Orders
- **Get User Orders (Paginated):**
  - `GET /api/v1/user/my-orders?page=1&limit=10`
  - Returns summarized items and status.

- **Get All Users (Admin/Manager):**
  - `GET /api/v1/user/`
  - `GET /api/v1/user/restaurant/:restaurantId`

---

## 💡 Frontend Tips:
- **Persistent Login**: Store the `token` and `restaurantId` in `SharedPreferences` (Flutter) or `localStorage` (Web).
- **Auto-Logout**: If a request returns `401 Unauthorized`, clear the local storage and redirect the user to the login screen.
- **Role-Based UI**: Check the `role` returned during login to show/hide the "Dashboard" or "KDS" buttons.
