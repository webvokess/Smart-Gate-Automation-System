// reports.js
const rRouter = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const { Permit } = require("../models");

rRouter.use(protect);
rRouter.get("/daily", async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);
    const permits = await Permit.find({ createdAt: { $gte: date, $lte: end } }).populate("vehicle driver chaId","plate name email");
    const summary = {
      total: permits.length,
      completed: permits.filter(p=>p.stage==="COMPLETED").length,
      flagged: permits.filter(p=>p.alerts.length>0).length,
      totalNetWeight: permits.reduce((a,p)=>a+(p.netWeight||0),0),
    };
    res.json({ success: true, data: { summary, permits } });
  } catch (err) { next(err); }
});
module.exports = rRouter;
