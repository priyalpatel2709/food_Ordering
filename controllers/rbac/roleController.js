const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const {
  getRoleModel,
  getPermissionModel,
  getUserModel,
} = require("../../models/index");

const { HTTP_STATUS } = require("../../utils/const");
const { logger } = require("../../middleware/loggingMiddleware");

/**
 * @desc    Assign roles to a user
 * @route   POST /api/v1/rbac/assign-role
 * @access  Private (Admin/Manager with ROLE.ASSIGN)
 */
const assignRoleToUser = asyncHandler(async (req, res) => {
  const { userId, roleIds } = req.body;

  if (!userId || !Array.isArray(roleIds) || roleIds.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "User ID and an array of Role IDs are required.",
    });
  }

  const User = getUserModel(req.usersDb);
  const Role = getRoleModel(req.usersDb);
  const Permissions = getPermissionModel(req.usersDb);

  // 1. Fetch Target User
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "User not found.",
    });
  }

  // 2. Tenant Isolation Check
  // Can only assign roles to users in YOUR restaurant
  // req.user.restaurantId must equal targetUser.restaurantId
  // Exception: Super Admin (who might have restaurantId null or special flag, but usually operates globally)
  // For now, assume strict tenant check unless Super Admin logic is added.
  if (req.user.restaurantId !== targetUser.restaurantId) {
    // Double check if requester is Super Admin
    // (Implementation dependent, assuming req.user.isSuperAdmin or similar)
    const isRequesterSuperAdmin = false; // TODO: Check via roles if needed, or rely on middleware.
    // Actually, allowed roles would prevent this endpoint access if not allowed.
    // But we must prevent cross-tenant assignment.

    // If requester is not super admin (check role/permission logic), block.
    // For safety:
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: "error",
      message: "Cannot manage users from another organization.",
    });
  }

  // 3. Fetch Target Roles
  const rolesToAssign = await Role.find({
    _id: { $in: roleIds },
  }).populate({ path: "permissions", model: Permissions });

  if (rolesToAssign.length !== roleIds.length) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "One or more provided Role IDs are invalid.",
    });
  }

  // 4. Validate Roles Scope
  // Roles must belong to the same restaurant OR be global system roles (if applicable)
  // Actually, usually you can only assign roles that belong to your restaurant or generic system roles.
  for (const role of rolesToAssign) {
    if (role.restaurantId && role.restaurantId !== req.user.restaurantId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: "error",
        message: `Role ${role.name} belongs to a different tenant.`,
      });
    }
  }

  // 5. Privilege Escalation Prevention
  // Requester cannot assign a role that has permissions the requester does NOT have.
  // unless requester is Super Admin.

  // Get Requester's Permissions
  const requesterRoles = await Role.find({
    _id: { $in: req.user.roles },
  }).populate({ path: "permissions", model: Permissions });

  // Flatten requester permissions
  const requesterPermissionSet = new Set();
  let isSuperAdmin = false;

  requesterRoles.forEach((r) => {
    if (r.name === "Super Admin" && r.isSystem) isSuperAdmin = true;
    if (r.permissions) {
      r.permissions.forEach((p) => requesterPermissionSet.add(p.name));
    }
  });

  if (!isSuperAdmin) {
    // Check every permission in rolesToAssign
    for (const role of rolesToAssign) {
      for (const perm of role.permissions) {
        if (!requesterPermissionSet.has(perm.name)) {
          logger.warn(
            `Privilege Escalation Attempt: User ${req.user._id} tried to assign ${perm.name}`,
            {
              user: req.user._id,
              targetRole: role.name,
              missingPermission: perm.name,
            }
          );
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            status: "error",
            message: `You cannot assign role '${role.name}' because it contains permissions you do not possess (${perm.name}).`,
          });
        }
      }
    }
  }

  // 6. Assign Roles
  // Replace or Append? "Assign" usually means set these permissions.
  // Or it means "Add these to existing".
  // Usually standard is "Set exact roles" or "Add".
  // Let's assume SET (Update) is safer for full sync, or Add?
  // Given the payload is `roleIds`, usually implies "Current roles should be THIS".
  // Alternatively, `addRoles` vs `setRoles`.
  // Let's implement SET (replace existing user roles with this new list) to avoid accumulation of stale roles.
  // However, robust UI usually sends the Full List.

  // Let's do replace for clarity.
  targetUser.roles = roleIds;

  // Optional: Clear legacy roleName if present to switch to RBAC
  // targetUser.roleName = rolesToAssign[0].name; // Just for backward compatibility visual if needed

  await targetUser.save();

  logger.info(`Roles assigned to user ${targetUser._id} by ${req.user._id}`, {
    targetUser: targetUser._id,
    assignedRoles: roleIds,
  });

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Roles assigned successfully",
    data: {
      userId: targetUser._id,
      roles: rolesToAssign.map((r) => ({ id: r._id, name: r.name })),
    },
  });
});

// --- Role Management ---

/**
 * @desc    Create a new custom role for the tenant
 * @route   POST /api/v1/rbac/roles
 * @access  Private (Restaurant Admin)
 */
const createRole = asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;

  // Roles MUST be in the same DB as Users to allow population
  const Role = getRoleModel(req.usersDb);
  const Permission = getPermissionModel(req.usersDb);

  // 1. Validate Input
  if (!name) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "Role name is required.",
    });
  }

  // 2. Enforce Tenant Scope
  // Custom roles created by Restaurant Admin are scoped to their restaurantId
  // Super Admins might create System roles (restaurantId = null), but here we assume Tenant flow
  const restaurantId = req.user.restaurantId;

  // Check if role exists in this tenant
  const existingRole = await Role.findOne({
    name: name,
    restaurantId: restaurantId,
  });

  if (existingRole) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      status: "error",
      message: `Role '${name}' already exists in your organization.`,
    });
  }

  // 3. Validate Permissions
  let validPermissionIds = [];
  if (permissions && Array.isArray(permissions) && permissions.length > 0) {
    // Verify these permissions actually exist
    const foundPerms = await Permission.find({ _id: { $in: permissions } });
    validPermissionIds = foundPerms;

    if (foundPerms.length !== permissions.length) {
      // Some invalid IDs provided
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "One or more Permission IDs are invalid.",
      });
    }
  }

  const newRole = new Role({
    name,
    description,
    restaurantId,
    permissions: validPermissionIds,
    createdBy: req.user._id,
    isSystem: false,
  });

  const savedRole = await newRole.save();

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    data: savedRole,
  });
});

/**
 * @desc    Get all roles (System + Tenant)
 * @route   GET /api/v1/rbac/roles
 * @access  Private
 */
const getAllRole = asyncHandler(async (req, res) => {
  const Role = getRoleModel(req.usersDb);
  const Permissions = getPermissionModel(req.usersDb);

  // Fetch System Roles AND Tenant Roles
  const query = {
    $or: [
      { isSystem: true }, // Global System roles
      { restaurantId: req.user.restaurantId }, // My Custom Roles
    ],
  };

  const roles = await Role.find(query)
    .populate({ path: "permissions", model: Permissions })
    .sort({ isSystem: -1, name: 1 }); // System roles first

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    results: roles.length,
    data: roles,
  });
});

/**
 * @desc    Update a role (Add/Remove permissions)
 * @route   PUT /api/v1/rbac/roles/:roleId
 * @access  Private (Restaurant Admin)
 */
const updateRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { name, description, permissions } = req.body;

  const Role = getRoleModel(req.usersDb);
  const Permission = getPermissionModel(req.usersDb);

  const role = await Role.findById(roleId);

  if (!role) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Role not found",
    });
  }

  // 1. Security Checks
  // Cannot edit System Roles
  if (role.isSystem) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: "error",
      message: "System roles cannot be modified.",
    });
  }

  // Cannot edit roles from other tenants
  if (role.restaurantId !== req.user.restaurantId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      status: "error",
      message: "You do not have permission to modify this role.",
    });
  }

  // 2. Validate Permissions if provided
  if (permissions) {
    if (!Array.isArray(permissions)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Permissions must be an array of IDs.",
      });
    }
    const foundPerms = await Permission.find({ _id: { $in: permissions } });
    if (foundPerms.length !== permissions.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "One or more Permission IDs are invalid.",
      });
    }
    role.permissions = permissions;
  }

  if (name) role.name = name;
  if (description) role.description = description;

  const updatedRole = await role.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: updatedRole,
  });
});

// --- Permission Management ---

/**
 * @desc    Create a new permission (System Level or Custom)
 * @route   POST /api/v1/rbac/permissions
 * @access  Private (Super Admin)
 */
const createPermission = asyncHandler(async (req, res) => {
  const { name, description, module, restaurantId } = req.body;
  const Permission = getPermissionModel(req.usersDb);

  if (!name || !module || !restaurantId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "Name and Module are required.",
    });
  }

  const existing = await Permission.findOne({ name: name.toUpperCase() });
  if (existing) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      status: "error",
      message: "Permission already exists.",
    });
  }

  const newPerm = new Permission({
    name: name.toUpperCase(),
    description,
    module: module.toUpperCase(),
    restaurantId: restaurantId,
    isSystem: true, // For now, all API created perms are system.
  });

  await newPerm.save();

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    data: newPerm,
  });
});

/**
 * @desc    Get all permissions
 * @route   GET /api/v1/rbac/permissions
 * @access  Private
 */
const getAllPermissions = asyncHandler(async (req, res) => {
  const Permission = getPermissionModel(req.usersDb);
  const query = {
    $or: [
      { isSystem: true }, // Global System roles
      { restaurantId: req.user.restaurantId }, // My Custom Roles
    ],
  };
  const permissions = await Permission.find(query);
  // .sort({
  //   module: 1,
  //   name: 1,
  // });

  // Group by Module for easier UI
  const grouped = {};
  permissions.forEach((p) => {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  });

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    count: permissions.length,
    data: permissions,
    grouped,
  });
});

module.exports = {
  assignRoleToUser,
  createRole,
  getAllRole,
  updateRole,
  createPermission,
  getAllPermissions,
};
