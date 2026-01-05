const express = require("express");
const router = express.Router();

const {
  assignRoleToUser,
  getAllRole,
  createRole,
  updateRole,
  createPermission,
  getAllPermissions,
} = require("../../controllers/rbac/roleController");
const { protect, identifyTenant } = require("../../middleware/index");
const { authorize } = require("../../middleware/rbacMiddleware");
const { PERMISSIONS } = require("../../utils/permissions");

router.post(
  "/assign-role",
  authorize(PERMISSIONS.ROLE_ASSIGN),
  protect,
  assignRoleToUser
);

// Roles
router.get("/roles", identifyTenant, protect, getAllRole); // List
router.post(
  "/roles",
  identifyTenant,
  protect,
  // authorize(PERMISSIONS.ROLE_CREATE),
  createRole
); // Create

router.put(
  "/roles/:roleId",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ROLE_UPDATE),
  updateRole
);

// Permissions
router.get("/permissions", identifyTenant, protect, getAllPermissions);
router.post(
  "/permissions",
  identifyTenant,
  protect,
  // authorize(PERMISSIONS.ROLE_CREATE),
  createPermission
);

module.exports = router;
