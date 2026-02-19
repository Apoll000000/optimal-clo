const router = require("express").Router();
const multer = require("multer");
const cloudinary = require("../services/cloudinary");

// memory storage (no local file writes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
    fileFilter: (req, file, cb) => {
        const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
        cb(ok ? null : new Error("Only JPG/PNG/WEBP allowed"), ok);
    },
});

function uploadBufferToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );

        stream.end(buffer);
    });
}

// POST /api/upload?folder=products
router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const folder = req.query.folder ? String(req.query.folder) : "optimal-clothing";
        const result = await uploadBufferToCloudinary(req.file.buffer, folder);

        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
        });
    } catch (e) {
        res.status(400).json({ message: e.message || "Upload failed" });
    }
});

module.exports = router;
