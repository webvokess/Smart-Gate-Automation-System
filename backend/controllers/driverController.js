const Joi = require("joi");
const { Driver } = require("../models");

const schema = Joi.object({
  name:      Joi.string().required(),
  license:   Joi.string().required(),
  mobile:    Joi.string().required(),
  aadhaar:   Joi.string().allow(""),
  dob:       Joi.date().allow(null,""),
  address:   Joi.string().allow(""),
  emergency: Joi.string().allow(""),
  photoUrl:  Joi.string().uri().allow(""),
});

exports.create = async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const exists = await Driver.findOne({ license: value.license });
    if (exists) return res.status(409).json({ success: false, message: `License ${value.license} already registered` });
    const driver = await Driver.create({ ...value, createdBy: req.user._id });
    res.status(201).json({ success: true, data: driver });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { page=1, limit=50, search, status } = req.query;
    const q = { deletedAt: null };
    if (status) q.status = status;
    if (search) q.$or = [{ name: { $regex: search, $options:"i" } }, { license: { $regex: search, $options:"i" } }];
    const [data, total] = await Promise.all([
      Driver.find(q).sort("-createdAt").skip((page-1)*limit).limit(+limit),
      Driver.countDocuments(q),
    ]);
    res.json({ success: true, data, pagination: { page:+page, limit:+limit, total, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const d = await Driver.findById(req.params.id);
    if (!d) return res.status(404).json({ success: false, message: "Driver not found" });
    res.json({ success: true, data: d });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const d = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) return res.status(404).json({ success: false, message: "Driver not found" });
    res.json({ success: true, data: d });
  } catch (err) { next(err); }
};

exports.approve = async (req, res, next) => {
  try {
    const d = await Driver.findByIdAndUpdate(req.params.id, { status: "approved", approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
    if (!d) return res.status(404).json({ success: false, message: "Driver not found" });
    res.json({ success: true, data: d });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Driver.findByIdAndUpdate(req.params.id, { deletedAt: new Date(), isActive: false });
    res.json({ success: true, message: "Driver deleted" });
  } catch (err) { next(err); }
};

exports.bulkUpload = async (req, res, next) => {
  try {
    const rows = req.body.rows || [];
    const results = { created: 0, errors: [], duplicates: 0 };
    for (const [i, row] of rows.entries()) {
      try {
        if (!row.name || !row.license) { results.errors.push(`Row ${i+2}: name and license required`); continue; }
        const exists = await Driver.findOne({ license: row.license });
        if (exists) { results.duplicates++; continue; }
        await Driver.create({ name: row.name, license: row.license, mobile: row.mobile || "", aadhaar: row.aadhaar, dob: row.dob, address: row.address, createdBy: req.user._id });
        results.created++;
      } catch (e) { results.errors.push(`Row ${i+2}: ${e.message}`); }
    }
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
};
