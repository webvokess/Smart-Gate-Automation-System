const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { User } = require("../models");

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" });

const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("ADMIN","CHA","GATE_OPERATOR","WEIGHBRIDGE_OPERATOR").default("CHA"),
});

exports.register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(409).json({ success: false, message: "Email already registered" });

    const user = await User.create(value);
    const token = signToken(user._id);
    res.status(201).json({ success: true, token, data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const user = await User.findOne({ email: value.email }).select("+password");
    if (!user || !(await user.matchPassword(value.password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: "Account deactivated" });

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    const token = signToken(user._id);
    res.json({ success: true, token, data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort("-createdAt");
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};
