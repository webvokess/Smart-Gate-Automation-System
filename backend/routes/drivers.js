const router = require("express").Router();
const c = require("../controllers/driverController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);
router.get("/", c.list);
router.get("/:id", c.getOne);
router.post("/", authorize("ADMIN","GATE_OPERATOR"), c.create);
router.put("/:id", authorize("ADMIN"), c.update);
router.delete("/:id", authorize("ADMIN"), c.remove);
router.put("/:id/approve", authorize("ADMIN"), c.approve);
router.post("/bulk", authorize("ADMIN","GATE_OPERATOR"), c.bulkUpload);
module.exports = router;
