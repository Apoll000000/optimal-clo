const router = require("express").Router();
const multer = require("multer");
const User = require("../models/User");
const Order = require("../models/Order");
const cloudinary = require("../services/cloudinary");

// ✅ memory storage (no temp files)
const upload = multer({ storage: multer.memoryStorage() });

// helper: require login
function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    next();
}

// PATCH /api/users/me  (mounted as /api/users in server.js)
router.patch("/me", requireAuth, upload.single("avatar"), async (req, res) => {
    try {
        const { name } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Name is required" });
        }

        const update = { name: name.trim() };

        // optional avatar upload
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "optimal-clothing/avatars",
                        resource_type: "image",
                        transformation: [
                            { width: 512, height: 512, crop: "fill", gravity: "face" },
                            { quality: "auto" },
                            { fetch_format: "auto" },
                        ],
                    },
                    (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    }
                );

                stream.end(req.file.buffer);
            });

            update.avatar = uploadResult.secure_url;
        }

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

        return res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
            },
        });
    } catch (err) {
        console.error("PATCH /api/users/me error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

// GET /api/users  (admin list)
router.get("/", async (req, res) => {
    try {
        const rows = await Order.aggregate([
            {
                $group: {
                    _id: "$customerEmail",
                    name: { $first: "$customerName" },
                    orders: { $sum: 1 },
                    spent: { $sum: "$total" },
                    lastOrderAt: { $max: "$createdAt" },
                },
            },
            { $sort: { lastOrderAt: -1 } },
        ]);

        res.json(
            rows.map((r) => ({
                id: String(r._id),
                name: r.name,
                email: r._id,
                orders: r.orders,
                spent: r.spent,
                joinedAt: r.lastOrderAt ? new Date(r.lastOrderAt).toISOString().slice(0, 10) : "",
            }))
        );
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

module.exports = router;
