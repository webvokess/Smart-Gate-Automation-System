const { Permit } = require("../models");

exports.recordTare = async (req, res, next) => {
  try {
    const { weight } = req.body;
    if (!weight || weight <= 0) return res.status(400).json({ success: false, message: "Valid tare weight required" });

    const permit = await Permit.findById(req.params.id);
    if (!permit) return res.status(404).json({ success: false, message: "Permit not found" });
    if (permit.stage !== "TARE_WEIGH") return res.status(400).json({ success: false, message: `Cannot record tare — permit is in stage: ${permit.stage}` });
    if (permit.tareWeight) return res.status(400).json({ success: false, message: "Tare already recorded — cannot modify" });

    permit.tareWeight = weight;
    await permit.save();
    req.io.emit("weight_updated", { permitId: permit._id, type: "tare", weight });
    res.json({ success: true, data: permit, message: "Tare weight recorded" });
  } catch (err) { next(err); }
};

exports.recordGross = async (req, res, next) => {
  try {
    const { weight } = req.body;
    if (!weight || weight <= 0) return res.status(400).json({ success: false, message: "Valid gross weight required" });

    const permit = await Permit.findById(req.params.id);
    if (!permit) return res.status(404).json({ success: false, message: "Permit not found" });
    if (permit.stage !== "GROSS_WEIGH") return res.status(400).json({ success: false, message: `Cannot record gross — permit is in stage: ${permit.stage}` });
    if (permit.grossWeight) return res.status(400).json({ success: false, message: "Gross already recorded — cannot modify" });
    if (!permit.tareWeight) return res.status(400).json({ success: false, message: "Tare weight not recorded yet" });

    permit.grossWeight = weight;
    permit.netWeight = weight - permit.tareWeight;

    // Overweight check
    const variance = Math.abs(permit.netWeight - permit.declaredWeight);
    if (variance > 2000) {
      permit.alerts.push({ message: `Weight mismatch: declared ${permit.declaredWeight} kg, actual net ${permit.netWeight} kg (Δ${permit.netWeight - permit.declaredWeight} kg)` });
      req.io.emit("permit_alert", { permitId: permit._id, message: `Weight mismatch on ${permit.permitId}` });
    }

    await permit.save();
    req.io.emit("weight_updated", { permitId: permit._id, type: "gross", weight, net: permit.netWeight });
    res.json({ success: true, data: permit, message: "Gross weight recorded" });
  } catch (err) { next(err); }
};

exports.getWeighbridgeQueue = async (req, res, next) => {
  try {
    const permits = await Permit.find({ stage: { $in: ["TARE_WEIGH","GROSS_WEIGH"] } })
      .populate("vehicle driver", "plate name")
      .sort("createdAt");
    res.json({ success: true, data: permits });
  } catch (err) { next(err); }
};
