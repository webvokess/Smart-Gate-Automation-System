// dashboard.js
const dRouter = require("express").Router();
const dc = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");
dRouter.get("/stats", protect, dc.getStats);
module.exports = dRouter;
