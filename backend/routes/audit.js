// audit.js
const aRouter = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const { AuditLog } = require("../models");

aRouter.use(protect, authorize("ADMIN"));
aRouter.get("/", async (req, res, next) => {
  try {
    const { page=1, limit=50 } = req.query;
    const [data, total] = await Promise.all([
      AuditLog.find().sort("-createdAt").skip((page-1)*limit).limit(+limit),
      AuditLog.countDocuments(),
    ]);
    res.json({ success: true, data, pagination: { page:+page, limit:+limit, total } });
  } catch (err) { next(err); }
});
module.exports = aRouter;
