const router = require("express").Router();
const c = require("../controllers/vehicleController");
const { protect, authorize } = require("../middleware/auth");
const { audit } = require("../middleware/audit");

router.use(protect);
router.get("/",          c.list);
router.get("/:id",       c.getOne);
router.post("/",         authorize("ADMIN","GATE_OPERATOR"), audit("CREATE_VEHICLE","Vehicle"), c.create);
router.put("/:id",       authorize("ADMIN"), c.update);
router.delete("/:id",    authorize("ADMIN"), c.remove);
router.post("/:id/vahan",authorize("ADMIN","GATE_OPERATOR"), c.runVahanCheck);
router.post("/bulk",     authorize("ADMIN","GATE_OPERATOR"), c.bulkUpload);
module.exports = router;
