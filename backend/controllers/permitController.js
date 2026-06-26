const Joi = require("joi");
const QRCode = require("qrcode");
const { Permit, Vehicle, Driver, PERMIT_STAGES } = require("../models");

const createSchema = Joi.object({
  vcn: Joi.string().required(),
  igmLine: Joi.string().required(),
  vehicleId: Joi.string().required(),
  driverId: Joi.string().required(),
  cargo: Joi.string().required(),
  declaredWeight: Joi.number().positive().required(),
  paymentStatus: Joi.string().valid("pending","cleared").default("pending"),
});

/* ── CREATE ─────────────────────────────────────────────── */
exports.createPermit = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const vehicle = await Vehicle.findById(value.vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    if (vehicle.vahanStatus !== "verified") return res.status(400).json({ success: false, message: "Vehicle VAHAN not verified" });

    const driver = await Driver.findById(value.driverId);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    if (driver.status !== "approved") return res.status(400).json({ success: false, message: "Driver not approved" });

    const permit = await Permit.create({
      vcn: value.vcn, igmLine: value.igmLine,
      vehicle: value.vehicleId, driver: value.driverId,
      cargo: value.cargo, declaredWeight: value.declaredWeight,
      paymentStatus: value.paymentStatus,
      chaId: req.user._id,
      stageHistory: [{ stage: "GATE_ENTRY", enteredAt: new Date(), operator: req.user._id }],
    });

    // Generate QR
    const qr = await QRCode.toDataURL(JSON.stringify({ permitId: permit.permitId, vcn: permit.vcn }));
    permit.qrCode = qr;
    await permit.save();

    await permit.populate(["vehicle","driver","chaId"]);
    req.io.emit("permit_created", { permit });
    res.status(201).json({ success: true, data: permit });
  } catch (err) { next(err); }
};

/* ── LIST ───────────────────────────────────────────────── */
exports.getPermits = async (req, res, next) => {
  try {
    const { stage, page = 1, limit = 20, search, chaId } = req.query;
    const query = { isActive: true };
    if (stage) query.stage = stage;
    if (req.user.role === "CHA") query.chaId = req.user._id;
    else if (chaId) query.chaId = chaId;
    if (search) query.permitId = { $regex: search, $options: "i" };

    const [permits, total] = await Promise.all([
      Permit.find(query).populate("vehicle driver chaId", "name plate email").sort("-createdAt").skip((page-1)*limit).limit(+limit),
      Permit.countDocuments(query),
    ]);
    res.json({ success: true, data: permits, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

/* ── GET ONE ─────────────────────────────────────────────── */
exports.getPermit = async (req, res, next) => {
  try {
    const permit = await Permit.findById(req.params.id).populate("vehicle driver chaId");
    if (!permit) return res.status(404).json({ success: false, message: "Permit not found" });
    res.json({ success: true, data: permit });
  } catch (err) { next(err); }
};

/* ── TRANSITION (State Machine) ─────────────────────────── */
exports.transitionStage = async (req, res, next) => {
  try {
    const permit = await Permit.findById(req.params.id).populate("vehicle driver");
    if (!permit) return res.status(404).json({ success: false, message: "Permit not found" });

    const curIdx = PERMIT_STAGES.indexOf(permit.stage);
    const nextStage = PERMIT_STAGES[curIdx + 1];
    if (!nextStage) return res.status(400).json({ success: false, message: "Permit already completed" });

    // Stage-specific validation
    if (permit.stage === "TARE_WEIGH" && !permit.tareWeight) {
      return res.status(400).json({ success: false, message: "Tare weight must be recorded before transitioning" });
    }
    if (permit.stage === "GROSS_WEIGH" && !permit.grossWeight) {
      return res.status(400).json({ success: false, message: "Gross weight must be recorded before transitioning" });
    }

    // Update history
    const lastHistory = permit.stageHistory[permit.stageHistory.length - 1];
    if (lastHistory) lastHistory.exitedAt = new Date();

    permit.stageHistory.push({ stage: nextStage, enteredAt: new Date(), operator: req.user._id });
    permit.stage = nextStage;
    if (nextStage === "GATE_ENTRY")   permit.gateEntryAt = new Date();
    if (nextStage === "GATE_EXIT")    permit.gateExitAt  = new Date();
    if (nextStage === "COMPLETED")    permit.completedAt = new Date();

    await permit.save();
    req.io.emit("permit_updated", { permit, stage: nextStage });

    res.json({ success: true, data: permit, message: `Transitioned to ${nextStage}` });
  } catch (err) { next(err); }
};

/* ── ADD ALERT ───────────────────────────────────────────── */
exports.addAlert = async (req, res, next) => {
  try {
    const { message } = req.body;
    const permit = await Permit.findByIdAndUpdate(req.params.id, { $push: { alerts: { message } } }, { new: true });
    if (!permit) return res.status(404).json({ success: false, message: "Permit not found" });
    req.io.emit("permit_alert", { permitId: permit._id, message });
    res.json({ success: true, data: permit });
  } catch (err) { next(err); }
};

/* ── BULK UPLOAD ─────────────────────────────────────────── */
exports.bulkUpload = async (req, res, next) => {
  try {
    const rows = req.body.rows;
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ success: false, message: "No rows provided" });

    const results = { created: 0, errors: [] };
    for (const [i, row] of rows.entries()) {
      try {
        const vehicle = await Vehicle.findOne({ plate: row.plate?.toUpperCase() });
        const driver  = await Driver.findOne({ license: row.license });
        if (!vehicle || !driver) { results.errors.push(`Row ${i+1}: vehicle/driver not found`); continue; }

        await Permit.create({ vcn: row.vcn, igmLine: row.igmLine, vehicle: vehicle._id, driver: driver._id, cargo: row.cargo, declaredWeight: +row.declaredWeight, chaId: req.user._id, stageHistory: [{ stage: "GATE_ENTRY", enteredAt: new Date(), operator: req.user._id }] });
        results.created++;
      } catch (e) { results.errors.push(`Row ${i+1}: ${e.message}`); }
    }
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
};
