// gate.js
const express = require("express");
const { protect, authorize } = require("../middleware/auth");
const { Permit } = require("../models");

const gateRouter = express.Router();
gateRouter.use(protect);

gateRouter.get("/queue", async (req, res, next) => {
  try {
    const mode = req.query.mode || "entry";
    const stage = mode === "entry" ? "GATE_ENTRY" : "GATE_EXIT";
    const permits = await Permit.find({ stage }).populate("vehicle driver","plate name mobile").sort("createdAt");
    res.json({ success: true, data: permits });
  } catch (err) { next(err); }
});

gateRouter.post("/:id/entry", authorize("ADMIN","GATE_OPERATOR"), async (req, res, next) => {
  try {
    const permit = await Permit.findById(req.params.id);
    if (!permit || permit.stage !== "GATE_ENTRY") return res.status(400).json({ success: false, message: "Permit not in GATE_ENTRY stage" });
    permit.gateEntryAt = new Date();
    permit.stage = "TARE_WEIGH";
    permit.stageHistory.push({ stage: "TARE_WEIGH", enteredAt: new Date(), operator: req.user._id });
    await permit.save();
    req.io.emit("gate_entry", { permitId: permit._id, plate: req.body.plate });
    res.json({ success: true, data: permit, message: "Gate entry authorized" });
  } catch (err) { next(err); }
});

gateRouter.post("/:id/exit", authorize("ADMIN","GATE_OPERATOR"), async (req, res, next) => {
  try {
    const permit = await Permit.findById(req.params.id);
    if (!permit || permit.stage !== "GATE_EXIT") return res.status(400).json({ success: false, message: "Permit not ready for exit" });
    permit.gateExitAt = new Date();
    permit.stage = "COMPLETED";
    permit.completedAt = new Date();
    permit.stageHistory.push({ stage: "COMPLETED", enteredAt: new Date(), operator: req.user._id });
    await permit.save();
    req.io.emit("gate_exit", { permitId: permit._id });
    res.json({ success: true, data: permit, message: "Gate exit completed" });
  } catch (err) { next(err); }
});

module.exports = gateRouter;
