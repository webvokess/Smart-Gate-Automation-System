// routes/auth.js
const r1 = require("express").Router();
const c = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
r1.post("/register", c.register);
r1.post("/login", c.login);
r1.get("/me", protect, c.getMe);
r1.get("/users", protect, authorize("ADMIN"), c.getUsers);
module.exports = r1;
