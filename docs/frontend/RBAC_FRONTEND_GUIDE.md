# Frontend RBAC Implementation Guide

## 1. Overview
The backend has migrated to a **Permission-Based Access Control** system. Authentication logic should no longer check against role names (e.g., `user.role === 'manager'`). Instead, it must check if the user possesses specific **Permissions** (e.g., `user.can('ORDER.UPDATE')`).

## 2. Data Models (TypeScript Interfaces)

### Permission
```typescript
interface Permission {
  _id: string;
  name: string; // e.g. "ORDER.CREATE"
  description: string;
  module: string; // "ORDER", "USER", etc.
}
```

### Role
```typescript
interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  restaurantId?: string;
  createdAt: string;
}
```

### User (Updated)
```typescript
interface User {
  _id: string;
  name: string;
  email: string;
  // Deprecated: roleName
  roles: Role[]; 
  // Computed helper on client side (optional but recommended)
  allPermissions?: Set<string>; 
}
```

## 3. State Management Recommendations

When the user logs in or fetches their profile (`/api/v1/user/me`), the backend returns the `roles` and populated `permissions`.

**Action:** Flatten these permissions into a Set for O(1) lookups.

```typescript
// store/authStore.ts (Example)
const userPermissions = computed(() => {
  const perms = new Set<string>();
  user.roles.forEach(role => {
    role.permissions.forEach(p => perms.add(p.name));
  });
  return perms;
});

const hasPermission = (requiredPermission: string) => {
  return userPermissions.has(requiredPermission) || userPermissions.has('SUPER_ADMIN_ALL_ACCESS'); 
}
```

## 4. Helper Component: `<Can />`
Create a wrapper component to conditionally render UI elements.

```tsx
// Components/Can.tsx
interface CanProps {
  perform: string; // e.g., "ORDER.DELETE"
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const Can = ({ perform, children, fallback = null }: CanProps) => {
  const { hasPermission } = useAuth();
  return hasPermission(perform) ? <>{children}</> : <>{fallback}</>;
};
```

**Usage:**
```tsx
<Can perform="ORDER.DELETE">
  <DeleteButton onClick={handleDelete} />
</Can>
```

## 5. API Integration

### Base URL
All RBAC routes are prefixed with `/api/v1/rbac`.

### A. Role Management

#### 1. Get All Roles
Fetches all roles available to the current user (System Roles + My Custom Roles).
*   **Method:** `GET`
*   **Endpoint:** `/roles`
*   **Response:**
    ```json
    {
      "status": "success",
      "results": 5,
      "data": [ ...Role[] ]
    }
    ```

#### 2. Create Custom Role
*   **Method:** `POST`
*   **Endpoint:** `/roles`
*   **Permission Required:** `ROLE.CREATE`
*   **Payload:**
    ```json
    {
      "name": "Shift Supervisor",
      "description": "Manages shift operations",
      "permissions": ["perm_id_1", "perm_id_2"] // Array of Permission IDs
    }
    ```

#### 3. Update Role (Add/Remove Permissions)
*   **Method:** `PUT`
*   **Endpoint:** `/roles/:roleId`
*   **Permission Required:** `ROLE.UPDATE`
*   **Payload:**
    ```json
    {
      "name": "Updated Name", // Optional
      "description": "Updated Description", // Optional
      "permissions": ["perm_id_1", "perm_id_3"] // Replaces entire list
    }
    ```
    *Note: System roles (`isSystem: true`) cannot be updated.*

### B. Permission Management

#### 1. Get All Permissions
Useful for building the "Create Role" UI (checkbox tree).
*   **Method:** `GET`
*   **Endpoint:** `/permissions`
*   **Response:**
    ```json
    {
      "status": "success",
      "data": [ ...Permission[] ],
      "grouped": {
        "ORDER": [ ... ],
        "USER": [ ... ]
      }
    }
    ```

### C. User Assignment

#### 1. Assign Roles to User
*   **Method:** `POST`
*   **Endpoint:** `/assign-role`
*   **Permission Required:** `ROLE.ASSIGN`
*   **Payload:**
    ```json
    {
      "userId": "677d...",
      "roleIds": ["role_id_1", "role_id_2"]
    }
    ```

## 6. Page Requirements

### User Management Page
*   **List View**: Show users. Column "Roles" should display badges of assigned roles (e.g., "Manager", "Waitstaff").
*   **Edit Action**: "Assign Role" button.
    *   Opens a Modal/Dialog.
    *   **Step 1**: Fetch available roles via `GET /api/v1/rbac/roles`.
    *   **Step 2**: Allow multi-selection.
    *   **Step 3**: Submit `roleIds` to `POST /api/v1/rbac/assign-role`.

### Role Management Page (New)
*   **List View**: Table of Roles. Show `Name`, `Description`, `Type` (System vs Custom), `Permission Count`.
*   **Access Control**: only show "Create Role" button if user has `ROLE.CREATE`.
*   **Create/Edit Form**:
    *   **Step 1**: Fetch all permissions via `GET /api/v1/rbac/permissions`.
    *   **Step 2**: Render permissions grouped by Module (e.g., accordion or sections for ORDER, MENU, USER).
    *   **Step 3**: Inputs for Role Name and Description.
    *   **Step 4**: Submit to `POST /roles` (Create) or `PUT /roles/:id` (Update).
    *   **Validation**: Disable editing for roles where `isSystem === true`.

## 7. Migration Checklist
1. [ ] Update User Interface types to include `roles[]`.
2. [ ] Replace all `user.roleName === 'admin'` checks with `hasPermission('...')`.
3. [ ] Implement `Role Management` Screen using new APIs.
4. [ ] Implement `Assign Role` Modal in User Management.
