// ── drivers.js ────────────────────────────────────────────
const driverRouter = require("express").Router();
const dc = require("../controllers/driverController");
const { protect, authorize } = require("../middleware/auth");

driverRouter.use(protect);
driverRouter.get("/", dc.list);
driverRouter.get("/:id", dc.getOne);
driverRouter.post("/", authorize("ADMIN","GATE_OPERATOR"), dc.create);
driverRouter.put("/:id", authorize("ADMIN"), dc.update);
driverRouter.delete("/:id", authorize("ADMIN"), dc.remove);
driverRouter.put("/:id/approve", authorize("ADMIN"), dc.approve);
driverRouter.post("/bulk", authorize("ADMIN","GATE_OPERATOR"), dc.bulkUpload);
module.exports = { driverRouter };
