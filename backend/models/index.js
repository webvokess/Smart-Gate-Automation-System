const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* ── USER ───────────────────────────────────────────────── */
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role:     { type: String, enum: ["ADMIN","CHA","GATE_OPERATOR","WEIGHBRIDGE_OPERATOR"], default: "CHA" },
  isActive: { type: Boolean, default: true },
  lastLogin:{ type: Date },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.matchPassword = function(plain) { return bcrypt.compare(plain, this.password); };
userSchema.index({ email: 1 });

/* ── VEHICLE ────────────────────────────────────────────── */
const vehicleSchema = new mongoose.Schema({
  plate:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:         { type: String, required: true, enum: ["6W Truck","10W Truck","12W Trailer","14W Trailer","20W Trailer"] },
  owner:        { type: String, required: true, trim: true },
  rcNumber:     { type: String, trim: true },
  fitnessExpiry:{ type: Date },
  insuranceNo:  { type: String },
  state:        { type: String },
  vahanStatus:  { type: String, enum: ["pending","verified","failed"], default: "pending" },
  vahanCheckedAt:{ type: Date },
  plateImageUrl:{ type: String },
  isActive:     { type: Boolean, default: true },
  deletedAt:    { type: Date, default: null },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
vehicleSchema.index({ plate: 1 });
vehicleSchema.index({ vahanStatus: 1 });

/* ── DRIVER ─────────────────────────────────────────────── */
const driverSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  license:    { type: String, required: true, unique: true, trim: true },
  mobile:     { type: String, required: true },
  aadhaar:    { type: String },
  dob:        { type: Date },
  address:    { type: String },
  emergency:  { type: String },
  photoUrl:   { type: String },
  status:     { type: String, enum: ["pending","approved","suspended"], default: "pending" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
  isActive:   { type: Boolean, default: true },
  deletedAt:  { type: Date, default: null },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
driverSchema.index({ license: 1 });
driverSchema.index({ status: 1 });

/* ── PERMIT ─────────────────────────────────────────────── */
const PERMIT_STAGES = ["GATE_ENTRY","TARE_WEIGH","LOADING","GROSS_WEIGH","GATE_EXIT","COMPLETED"];

const stageHistorySchema = new mongoose.Schema({
  stage:     { type: String, enum: PERMIT_STAGES },
  enteredAt: { type: Date, default: Date.now },
  exitedAt:  { type: Date },
  operator:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  notes:     { type: String },
}, { _id: false });

const permitSchema = new mongoose.Schema({
  permitId:       { type: String, unique: true },
  vcn:            { type: String, required: true },
  igmLine:        { type: String, required: true },
  vehicle:        { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  driver:         { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
  cargo:          { type: String, required: true },
  declaredWeight: { type: Number, required: true },
  chaId:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stage:          { type: String, enum: PERMIT_STAGES, default: "GATE_ENTRY" },
  stageHistory:   [stageHistorySchema],
  // Documents
  documents:      [{
    type:    { type: String, enum: ["BL","BE","OOC","OTHER"] },
    url:     String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  paymentStatus:  { type: String, enum: ["pending","cleared","failed"], default: "pending" },
  // Weights
  tareWeight:     { type: Number, default: null },
  grossWeight:    { type: Number, default: null },
  netWeight:      { type: Number, default: null },
  // QR
  qrCode:         { type: String },
  // Alerts
  alerts:         [{ message: String, createdAt: { type: Date, default: Date.now }, resolved: { type: Boolean, default: false } }],
  // Gate
  gateEntryAt:    { type: Date },
  gateExitAt:     { type: Date },
  dockAssigned:   { type: String },
  // Timestamps
  completedAt:    { type: Date },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

permitSchema.pre("save", function(next) {
  if (!this.permitId) {
    const d = new Date();
    this.permitId = `PRM-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(Date.now()).slice(-5)}`;
  }
  if (this.grossWeight && this.tareWeight) this.netWeight = this.grossWeight - this.tareWeight;
  next();
});
permitSchema.index({ stage: 1 });
permitSchema.index({ chaId: 1 });
permitSchema.index({ permitId: 1 });
permitSchema.index({ createdAt: -1 });

/* ── AUDIT LOG ──────────────────────────────────────────── */
const auditSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName:  String,
  action:    { type: String, required: true },
  resource:  String,
  resourceId:String,
  details:   mongoose.Schema.Types.Mixed,
  ip:        String,
}, { timestamps: true });
auditSchema.index({ createdAt: -1 });
auditSchema.index({ userId: 1 });
auditSchema.index({ action: 1 });

/* ── NOTIFICATION ───────────────────────────────────────── */
const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type:     { type: String, enum: ["alert","info","warning","success"] },
  title:    String,
  message:  String,
  permitId: { type: mongoose.Schema.Types.ObjectId, ref: "Permit" },
  read:     { type: Boolean, default: false },
}, { timestamps: true });
notificationSchema.index({ userId: 1, read: 1 });

/* ── EXPORTS ─────────────────────────────────────────────── */
module.exports = {
  User:         mongoose.model("User", userSchema),
  Vehicle:      mongoose.model("Vehicle", vehicleSchema),
  Driver:       mongoose.model("Driver", driverSchema),
  Permit:       mongoose.model("Permit", permitSchema),
  AuditLog:     mongoose.model("AuditLog", auditSchema),
  Notification: mongoose.model("Notification", notificationSchema),
  PERMIT_STAGES,
};
