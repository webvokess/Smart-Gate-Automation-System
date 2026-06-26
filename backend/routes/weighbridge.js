const router = require("express").Router();
const c = require("../controllers/weighbridgeController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);
router.get("/queue",          c.getWeighbridgeQueue);
router.post("/:id/tare",      authorize("ADMIN","WEIGHBRIDGE_OPERATOR"), c.recordTare);
router.post("/:id/gross",     authorize("ADMIN","WEIGHBRIDGE_OPERATOR"), c.recordGross);
module.exports = router;
