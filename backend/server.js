require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const logger = require("./utils/logger");
const { initSocket } = require("./utils/socket");

// Route imports
const authRoutes = require("./routes/auth");
const vehicleRoutes = require("./routes/vehicles");
const driverRoutes = require("./routes/drivers");
const permitRoutes = require("./routes/permits");
const gateRoutes = require("./routes/gate");
const weighbridgeRoutes = require("./routes/weighbridge");
const dashboardRoutes = require("./routes/dashboard");
const reportRoutes = require("./routes/reports");
const auditRoutes = require("./routes/audit");
const uploadRoutes = require("./routes/upload");

const app = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", methods: ["GET", "POST"] },
});
initSocket(io);

// ── Connect DB ───────────────────────────────────────────
connectDB();

// ── Security Middleware ──────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

// ── Rate Limiting ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api/", limiter);

// ── Body Parser ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Attach io to req ─────────────────────────────────────
app.use((req, _, next) => { req.io = io; next(); });

// ── Health Check ─────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV }));

// ── API Routes ───────────────────────────────────────────
app.use("/api/v1/auth",        authRoutes);
app.use("/api/v1/vehicles",    vehicleRoutes);
app.use("/api/v1/drivers",     driverRoutes);
app.use("/api/v1/permits",     permitRoutes);
app.use("/api/v1/gate",        gateRoutes);
app.use("/api/v1/weighbridge", weighbridgeRoutes);
app.use("/api/v1/dashboard",   dashboardRoutes);
app.use("/api/v1/reports",     reportRoutes);
app.use("/api/v1/audit",       auditRoutes);
app.use("/api/v1/upload",      uploadRoutes);

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.message} — ${req.method} ${req.originalUrl}`);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || "Internal server error", ...(process.env.NODE_ENV === "development" && { stack: err.stack }) });
});

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`🚀 SGAS Server running on port ${PORT} [${process.env.NODE_ENV}]`));

module.exports = { app, server };
