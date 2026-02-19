const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product"); // make sure this exists

const router = express.Router();

/**
 * POST /api/orders
 * Create order + deduct stocks
 */
router.post("/", async (req, res) => {
    try {
        const b = req.body || {};
        const items = Array.isArray(b.items) ? b.items : [];

        if (!b.customerName || !b.customerEmail || !b.phone || !b.address || !b.city) {
            return res.status(400).json({ message: "Missing customer fields" });
        }
        if (items.length === 0) {
            return res.status(400).json({ message: "Cart items required" });
        }

        // validate stocks
        for (const it of items) {
            if (!it.productId) return res.status(400).json({ message: "productId required in items" });
            if (!it.qty || it.qty < 1) return res.status(400).json({ message: "Invalid qty" });

            const pid = new mongoose.Types.ObjectId(String(it.productId));
            const p = await Product.findById(pid);

            if (!p) return res.status(404).json({ message: `Product not found: ${it.productId}` });
            if (p.stocks < Number(it.qty)) {
                return res.status(400).json({ message: `Not enough stocks for ${p.name}` });
            }
        }

        // deduct stocks
        for (const it of items) {
            const pid = new mongoose.Types.ObjectId(String(it.productId));
            await Product.findByIdAndUpdate(pid, { $inc: { stocks: -Number(it.qty) } });
        }

        // create order
        const order = await Order.create({
            customerName: b.customerName,
            customerEmail: String(b.customerEmail).trim().toLowerCase(),
            phone: b.phone,
            address: b.address,
            city: b.city,
            notes: b.notes || "",
            paymentMethod: b.paymentMethod || "cod",
            items: items.map((it) => ({
                productId: new mongoose.Types.ObjectId(String(it.productId)),
                productName: it.productName || "",
                variantId: it.variantId || "",
                variantName: it.variantName || "",
                qty: Number(it.qty) || 1,
                unitPrice: Number(it.unitPrice) || 0,
                image: it.image || "",
            })),
            shippingFee: Number(b.shippingFee) || 0,
            subtotal: Number(b.subtotal) || 0,
            total: Number(b.total) || 0,
            status: b.status || "pending",
        });

        return res.status(201).json(order);
    } catch (err) {
        console.error("POST /api/orders error:", err);
        return res.status(500).json({ message: "Server error creating order" });
    }
});

/**
 * GET /api/orders?email=...
 */
router.get("/", async (req, res) => {
    try {
        const email = String(req.query.email || "").trim().toLowerCase();
        const q = email ? { customerEmail: email } : {};
        const orders = await Order.find(q).sort({ createdAt: -1 }).limit(100);
        return res.json(orders);
    } catch (err) {
        console.error("GET /api/orders error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

/**
 * GET /api/orders/:id
 */
router.get("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });
        return res.json(order);
    } catch (err) {
        console.error("GET /api/orders/:id error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

/**
 * PATCH /api/orders/:id
 * Update order fields (admin)
 */
router.patch("/:id", async (req, res) => {
    try {
        const id = req.params.id;

        // validate mongo id
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        // ✅ allow fields that your admin UI edits
        const allowed = ["status", "notes", "paymentMethod", "courier", "tracking"];

        const updates = {};
        for (const k of allowed) {
            if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
                updates[k] = req.body[k];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No valid fields to update" });
        }

        // optional: sanitize strings
        if (typeof updates.courier === "string") updates.courier = updates.courier.trim();
        if (typeof updates.tracking === "string") updates.tracking = updates.tracking.trim();
        if (typeof updates.notes === "string") updates.notes = updates.notes.trim();

        const order = await Order.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        );

        if (!order) return res.status(404).json({ message: "Order not found" });

        return res.json(order);
    } catch (err) {
        console.error("PATCH /api/orders/:id error:", err);
        return res.status(500).json({ message: "Server error updating order" });
    }
});


module.exports = router;
