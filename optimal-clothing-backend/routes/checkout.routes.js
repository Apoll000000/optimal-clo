const router = require("express").Router();
const requireAuth = require("../middleware/requireAuth");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");

// POST /api/checkout
router.post("/", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

        // Validate stock + compute total
        let total = 0;
        const items = [];

        for (const it of cart.items) {
            const p = await Product.findById(it.productId);
            if (!p) return res.status(400).json({ message: `Missing product in cart` });
            if (p.status !== "active") return res.status(400).json({ message: `Product not active: ${p.name}` });
            if (Number(p.stocks) < it.qty) return res.status(400).json({ message: `Not enough stock for: ${p.name}` });

            const unitPrice = Number(it.unitPrice || p.price || 0);
            total += unitPrice * it.qty;

            items.push({
                productId: p._id,
                productName: p.name,
                variantName: it.variantName || "",
                qty: it.qty,
                unitPrice,
            });
        }

        const created = await Order.create({
            userId,
            customerName: req.user.name || "",
            customerEmail: req.user.email || "",
            items,
            total,
            status: "pending",
            updatedAt: new Date(),
        });

        // Clear cart after creating order
        cart.items = [];
        await cart.save();

        res.status(201).json(created);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

module.exports = router;
