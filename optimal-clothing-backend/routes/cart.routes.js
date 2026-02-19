const router = require("express").Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const requireAuth = require("../middleware/requireAuth");

// GET /api/cart
router.get("/", requireAuth, async (req, res) => {
    const userId = req.user.id || req.user._id;

    const cart = await Cart.findOne({ userId });
    res.json(cart || { userId, items: [] });
});

// POST /api/cart/items  (add to cart)
router.post("/items", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId, variantId = "", variantName = "", qty = 1 } = req.body;

        const q = Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });
        if (product.status !== "active") return res.status(400).json({ message: "Product is not active" });

        // You can also block add-to-cart if out of stock
        if (Number(product.stocks) <= 0) return res.status(400).json({ message: "Out of stock" });

        const unitPrice = Number(product.price || 0); // keep simple (variant extra later if you want)
        const image = product.coverImage || "";
        const name = product.name || "Product";

        const cart = (await Cart.findOne({ userId })) || (await Cart.create({ userId, items: [] }));

        const key = `${String(productId)}::${variantId || "base"}`;
        const idx = cart.items.findIndex((it) => `${String(it.productId)}::${it.variantId || "base"}` === key);

        if (idx >= 0) {
            cart.items[idx].qty = Math.min(99, cart.items[idx].qty + q);
        } else {
            cart.items.unshift({
                productId,
                variantId,
                variantName,
                name,
                image,
                unitPrice,
                qty: q,
            });
        }

        await cart.save();
        res.json(cart);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// PATCH /api/cart/items  (update qty)
router.patch("/items", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId, variantId = "", qty } = req.body;
        const q = Math.max(1, Math.min(99, Math.floor(Number(qty) || 1)));

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.json({ userId, items: [] });

        const key = `${String(productId)}::${variantId || "base"}`;
        const idx = cart.items.findIndex((it) => `${String(it.productId)}::${it.variantId || "base"}` === key);
        if (idx < 0) return res.status(404).json({ message: "Cart item not found" });

        cart.items[idx].qty = q;
        await cart.save();
        res.json(cart);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// DELETE /api/cart/items?productId=...&variantId=...
router.delete("/items", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId, variantId = "" } = req.query;

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.json({ userId, items: [] });

        const key = `${String(productId)}::${variantId || "base"}`;
        cart.items = cart.items.filter((it) => `${String(it.productId)}::${it.variantId || "base"}` !== key);

        await cart.save();
        res.json(cart);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});

// DELETE /api/cart  (clear cart)
router.delete("/", requireAuth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.json({ userId, items: [] });

        cart.items = [];
        await cart.save();

        res.json(cart);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
});


module.exports = router;
