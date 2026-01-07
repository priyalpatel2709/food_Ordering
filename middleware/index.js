const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const identifyTenant = require("./IdentificationMiddleware");
const { queryHandler } = require("./queryHandler");
const { validateRequest, schemas } = require("./validationMiddleware");
const { adminOnly, allowedRoles } = require("./roleMiddleware");
// const requestIdMiddleware = require("./requestIdMiddleware");

module.exports = {
  identifyTenant,
  protect,
  queryHandler,
  validateRequest,
  schemas,
  adminOnly,
  allowedRoles,
  authorize,
  // requestIdMiddleware,
};
