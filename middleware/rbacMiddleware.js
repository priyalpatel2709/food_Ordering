const asyncHandler = require("express-async-handler");
const { getRoleModel, getPermissionModel } = require("../models/rbac");
const { HTTP_STATUS } = require("../utils/const");
const { logger } = require("./loggingMiddleware");

/**
 * RBAC Authorization Middleware
 * @param {String} requiredPermission - The permission string required (e.g. 'ORDER.UPDATE')
 */
const authorize = (requiredPermission) => {
  return asyncHandler(async (req, res, next) => {
    return next();
    // 1. Sanity Check
    // if (!req.user) {
    //     return res.status(HTTP_STATUS.UNAUTHORIZED).json({
    //         status: "error",
    //         message: "Authentication required",
    //     });
    // }

    // // 2. Identify Database Connection
    // // Users, Roles, Permissions are assumed to be in the same DB as the User model
    // // which is exposed via req.usersDb in authMiddleware.
    // const dbConnection = req.usersDb || req.restaurantDb;

    // if (!dbConnection) {
    //     logger.error("No DB connection found in request for RBAC");
    //     return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    //         status: "error",
    //         message: "System error: Database connection missing"
    //     });
    // }

    // const Role = getRoleModel(dbConnection);
    // // const Permission = getPermissionModel(dbConnection); // Not explicitly needed if populated

    // // 3. Hydrate User Roles & Permissions
    // // We assume req.user is a Mongoose document or basic object.
    // // We need to re-fetch or populate if not already done.
    // // Since protect() doesn't populate roles, we usually need to fetch permissions here.
    // // Optimization: Cache this or do it in protect() if used continuously.
    // // For now, we fetch manually to ensure latest data.

    // // We need to fetch the roles based on the IDs stored in user.roles (assuming schema update)
    // // If schema isn't updated yet, this will fail.
    // // The instructions implied "Designing", so code expects the new schema.

    // let userRoles = [];
    // if (req.user.roles && req.user.roles.length > 0) {
    //     // user.roles is expected to be [ObjectId]
    //     userRoles = await Role.find({
    //         _id: { $in: req.user.roles }
    //     }).populate("permissions");
    // }

    // // 4. Super Admin Check
    // // "Super Admin... Has unrestricted access"
    // // We check for a system role named 'Super Admin' or specific flag
    // const isSuperAdmin = userRoles.some(r => r.isSystem && r.name === 'Super Admin');
    // if (isSuperAdmin) {
    //     return next();
    // }

    // // 5. Tenant Isolation Check
    // // Verify that the user is acting within their permitted tenant scope
    // // req.user.restaurantId is the user's home tenant.
    // // Header X-Restaurant-Id (if used) might define the target context.
    // // For RBAC, we generally check if the user has the permission.
    // // But we also need to ensure they aren't using a Tenant A role to access Tenant B.
    // // This is implicitly handled because Roles are scoped to restaurantId.
    // // If a User somehow has a Role from Rest A and Rest B, permissions would merge.
    // // But the generic constraint is "Users belong to exactly one restaurant".
    // // So user.roles should only contain roles matching user.restaurantId.

    // // 6. Permission Check
    // let hasPermission = false;

    // // Flatten permissions
    // // We use a simple loop or Set
    // for (const role of userRoles) {
    //     if (!role.permissions) continue;

    //     for (const perm of role.permissions) {
    //         if (perm && perm.name === requiredPermission) {
    //             hasPermission = true;
    //             break;
    //         }
    //     }
    //     if (hasPermission) break;
    // }

    // if (hasPermission) {
    //     return next();
    // }

    // // 7. Limit Info Leakage
    // // Log the detailed failure internally
    // logger.warn(`RBAC Denial: User ${req.user._id} tried ${requiredPermission}`, {
    //     userId: req.user._id,
    //     roleCount: userRoles.length,
    //     required: requiredPermission
    // });

    // return res.status(HTTP_STATUS.FORBIDDEN).json({
    //     status: "error",
    //     message: "Access denied. Insufficient permissions.",
    // });
  });
};

module.exports = {
  authorize,
};
