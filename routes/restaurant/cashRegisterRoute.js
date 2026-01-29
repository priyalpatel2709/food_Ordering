const express = require("express");
const router = express.Router();
const {
    protect,
    identifyTenant,
    // authorize
} = require("../../middleware/index");

const {
    createRegister,
    openSession,
    addTransaction,
    closeSession,
    getAllRegisters,
    getRegisterHistory
} = require("../../controllers/restaurant/cashRegisterController");

router.use(identifyTenant);
router.use(protect);

router.get("/", getAllRegisters);
router.post("/", createRegister);
router.get("/:id/history", getRegisterHistory);
router.post("/:id/open", openSession);
router.post("/:id/transaction", addTransaction); // For Pay-ins/Pay-outs
router.post("/:id/close", closeSession);

module.exports = router;
