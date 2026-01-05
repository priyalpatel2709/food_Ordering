# Enterprise RBAC Architecture for Multi-Tenant Restaurant Platform

## 1. Executive Summary
This document outlines the architectural design for a production-ready Role-Based Access Control (RBAC) system. The system is designed to secure a multi-tenant environment where strict isolation between restaurants is paramount, while allowing a global `Supuer Admin` to manage the platform. The core principle is **Permission-Based Authorization**, decoupling code from specific role names and allowing for flexible, granular policy enforcement.

## 2. Core Concepts

### 2.1 Scope & Tenancy
*   **Global Scope**: Reserved for `Super Admin`. Operates across all tenants.
*   **Tenant Scope**: Reserved for `Restaurant Admin` and operational staff. strictly requires `restaurantId`.

### 2.2 Hierarchy
1.  **Super Admin**: Immutable, Database-seeded. Root of Trust.
2.  **Restaurant Admin**: Tenant-Root. Created by Super Admin.
3.  **Staff/Custom Roles**: Created by Restaurant Admin.

### 2.3 Authorization Model
*   **Permissions**: Atomic units of action (e.g., `ORDER.UPDATE`). Defined in code/database.
*   **Roles**: Collections of permissions.
*   **Users**: Assigned one or more Roles.
*   **Enforcement**: `authorize(permission)` middleware checks if `User.Roles` contains `Permission`.

## 3. Database Schema Design

### 3.1 Permission Model (`permissions`)
Defines the capabilities available in the system.
*   `name` (String, UQ): e.g., "ORDER.CREATE"
*   `description` (String)
*   `module` (String): e.g., "ORDER"
*   `isSystem` (Boolean): True for core permissions that cannot be deleted.

### 3.2 Role Model (`roles`)
Defines a set of permissions.
*   `name` (String): e.g., "Manager"
*   `restaurantId` (ObjectId, Indexed): Null for System Roles, present for Tenant Roles.
*   `permissions` (Array<ObjectId>): Ref to Permission.
*   `isSystem` (Boolean): Prevent deletion of default roles.
*   `createdBy` (ObjectId): Audit trail.

### 3.3 User Model Updates (`users`)
*   `roles` (Array<ObjectId>): Ref to Role.
*   `restaurantId` (ObjectId): Strict tenant association.

## 4. Security & Compliance
*   **Privilege Escalation Prevention**: A user cannot assign a role containing permissions they do not possess themselves.
*   **Tenant Isolation**: Middleware explicitly checks `user.restaurantId === resource.restaurantId`.
*   **Audit Logging**: Critical actions (Role Change, User Assignment) are logged to `AuditLogs`.

## 5. Implementation Strategy
1.  **Seed**: Run migration scripts to populate `Permissions` and `System Roles` (Super Admin).
2.  **Middleware**: Replace string-based checks with `rbacMiddleware`.
3.  **Management API**: Expose endpoints for `Role` management (CRUD) strictly scoped to the requesting user's tenant.

## 6. Access Control Matrix (Example)

| Role | Scope | USER.CREATE | ORDER.VIEW | RESTAURANT.CREATE |
| :--- | :--- | :--- | :--- | :--- |
| Super Admin | Global | YES (Global) | YES (All) | YES |
| Rest. Admin | Tenant | YES (Tenant) | YES (Tenant)| NO |
| Staff | Tenant | NO | YES (Tenant)| NO |

## 7. Future Extensibility
*   **Feature Flags**: Can be integrated into the Permission logic.
*   **Role Templates**: Pre-defined sets of permissions for quick setup (e.g., "Clone Standard Manager").
