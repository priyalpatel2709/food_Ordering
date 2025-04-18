const { protect } = require("../middleware/authMiddleware");
const identifyTenant = require("./IdentificationMiddleware");
const { queryHandler } = require("./queryHandler");
const { validateRequest, schemas } = require("./validationMiddleware");
const { adminOnly, allowedRoles } = require("./roleMiddleware");

module.exports = {
  identifyTenant,
  protect,
  queryHandler,
  validateRequest,
  schemas,
  adminOnly,
  allowedRoles,
};
