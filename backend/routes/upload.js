const router = require("express").Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");

// Memory storage — for dev we return a placeholder URL.
// In production: pipe req.file.buffer to cloudinary.uploader.upload_stream()
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post("/image", protect, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

  // ── Production: uncomment and configure Cloudinary ───────────────────────
  // const cloudinary = require("cloudinary").v2;
  // cloudinary.config({
  //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  //   api_key:    process.env.CLOUDINARY_API_KEY,
  //   api_secret: process.env.CLOUDINARY_API_SECRET,
  // });
  // const result = await new Promise((resolve, reject) => {
  //   const stream = cloudinary.uploader.upload_stream(
  //     { folder: "sgas", resource_type: "auto" },
  //     (error, result) => error ? reject(error) : resolve(result)
  //   );
  //   stream.end(req.file.buffer);
  // });
  // return res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  // ─────────────────────────────────────────────────────────────────────────

  // Dev placeholder
  res.json({
    success: true,
    data: {
      url:  `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
      name: req.file.originalname,
      size: req.file.size,
    },
  });
});

module.exports = router;
