const router = require("express").Router();
const c = require("../controllers/permitController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);
router.get("/",               c.getPermits);
router.get("/:id",            c.getPermit);
router.post("/",              authorize("ADMIN","CHA"), c.createPermit);
router.post("/:id/transition",authorize("ADMIN","GATE_OPERATOR","WEIGHBRIDGE_OPERATOR"), c.transitionStage);
router.post("/:id/alert",     c.addAlert);
router.post("/bulk",          authorize("ADMIN","CHA"), c.bulkUpload);
module.exports = router;
