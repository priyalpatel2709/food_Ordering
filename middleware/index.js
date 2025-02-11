const { protect } = require("../middleware/authMiddleware");
const identifyTenant = require("./IdentificationMiddleware");
const { queryHandler } = require("./queryHandler");

module.exports = { identifyTenant, protect, queryHandler };
