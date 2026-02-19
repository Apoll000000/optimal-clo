const router = require("express").Router();
const Product = require("../models/Product");

// GET /api/products?q=&status=all|active|draft
router.get("/", async (req, res) => {
    try {
        const { q = "", status = "all" } = req.query;

        const filter = {};
        if (status !== "all") filter.status = status;

        if (q.trim()) {
            const s = q.trim();
            filter.$or = [
                { name: { $regex: s, $options: "i" } },
                { description: { $regex: s, $options: "i" } },
                { "variants.name": { $regex: s, $options: "i" } },
                { "variants.sku": { $regex: s, $options: "i" } },
            ];
        }

        const items = await Product.find(filter).sort({ createdAt: -1 });
        res.json(items);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// POST /api/products
router.post("/", async (req, res) => {
    try {
        const created = await Product.create(req.body);
        res.status(201).json(created);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// PATCH /api/products/:id
router.patch("/:id", async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: "Product not found" });
        res.json(updated);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Product not found" });
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});


// GET /api/products/:id
router.get("/:id", async (req, res) => {
    try {
        const item = await Product.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Product not found" });
        res.json(item);
    } catch (e) {
        res.status(400).json({ message: "Invalid product id" });
    }
});


module.exports = router;
