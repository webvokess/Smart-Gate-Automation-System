const Joi = require("joi");
const { Vehicle } = require("../models");

const createSchema = Joi.object({
  plate:         Joi.string().required(),
  type:          Joi.string().valid("6W Truck","10W Truck","12W Trailer","14W Trailer","20W Trailer").required(),
  owner:         Joi.string().required(),
  rcNumber:      Joi.string().allow("").optional(),
  fitnessExpiry: Joi.date().allow(null,"").optional(),
  insuranceNo:   Joi.string().allow("").optional(),
  state:         Joi.string().allow("").optional(),
  plateImageUrl: Joi.string().uri().allow("").optional(),
});

exports.create = async (req, res, next) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ success:false, message:error.details[0].message });

    value.plate = value.plate.toUpperCase().replace(/\s/g, "");
    const exists = await Vehicle.findOne({ plate:value.plate, deletedAt:null });
    if (exists) return res.status(409).json({ success:false, message:`Vehicle ${value.plate} already registered` });

    const vehicle = await Vehicle.create({ ...value, createdBy:req.user._id });
    res.status(201).json({ success:true, data:vehicle });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=50, search, vahanStatus } = req.query;
    const q = { deletedAt:null };
    if (vahanStatus) q.vahanStatus = vahanStatus;
    if (search) q.$or = [{ plate:{ $regex:search, $options:"i" } }, { owner:{ $regex:search, $options:"i" } }];

    const [data, total] = await Promise.all([
      Vehicle.find(q).sort("-createdAt").skip((page-1)*limit).limit(+limit),
      Vehicle.countDocuments(q),
    ]);
    res.json({ success:true, data, pagination:{ page:+page, limit:+limit, total, pages:Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v || v.deletedAt) return res.status(404).json({ success:false, message:"Vehicle not found" });
    res.json({ success:true, data:v });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const v = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true });
    if (!v) return res.status(404).json({ success:false, message:"Vehicle not found" });
    res.json({ success:true, data:v });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Vehicle.findByIdAndUpdate(req.params.id, { deletedAt:new Date(), isActive:false });
    res.json({ success:true, message:"Vehicle deleted" });
  } catch (err) { next(err); }
};

// Mock VAHAN check — replace with real NIC VAHAN API in production
exports.runVahanCheck = async (req, res, next) => {
  try {
    const v = await Vehicle.findById(req.params.id);
    if (!v) return res.status(404).json({ success:false, message:"Vehicle not found" });

    // Simulate VAHAN API (success rate ~90%)
    const verified = v.plate.startsWith("XX") ? false : true; // all real plates pass
    const update = verified
      ? { vahanStatus:"verified", vahanCheckedAt:new Date(), rcNumber: v.rcNumber || `RC-${v.plate}` }
      : { vahanStatus:"failed",   vahanCheckedAt:new Date() };

    const updated = await Vehicle.findByIdAndUpdate(v._id, update, { new:true });
    res.json({ success:true, data:updated, message: verified ? "VAHAN verified successfully" : "VAHAN check failed" });
  } catch (err) { next(err); }
};

exports.bulkUpload = async (req, res, next) => {
  try {
    const rows = req.body.rows || [];
    if (!rows.length) return res.status(400).json({ success:false, message:"No rows provided" });

    const results = { created:0, errors:[], duplicates:0 };
    for (const [i, row] of rows.entries()) {
      try {
        const plate = (row.plate || "").toUpperCase().replace(/\s/g, "");
        if (!plate) { results.errors.push(`Row ${i+2}: plate is required`); continue; }
        const exists = await Vehicle.findOne({ plate, deletedAt:null });
        if (exists) { results.duplicates++; continue; }
        await Vehicle.create({
          plate,
          type:      row.type      || "10W Truck",
          owner:     row.owner     || "Unknown",
          rcNumber:  row.rc_number || "",
          state:     row.state     || "",
          createdBy: req.user._id,
        });
        results.created++;
      } catch (e) { results.errors.push(`Row ${i+2}: ${e.message}`); }
    }
    res.json({ success:true, data:results });
  } catch (err) { next(err); }
};
