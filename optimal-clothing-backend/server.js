require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

const setupPassport = require("./config/passport");
const authRoutes = require("./routes/auth");

const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const userRoutes = require("./routes/user.routes");
const uploadRoutes = require("./routes/upload.routes");
const cartRoutes = require("./routes/cart.routes");
const checkoutRoutes = require("./routes/checkout.routes");

const subscriptionRoutes = require("./routes/subscription.routes");

const app = express();

const hasStripeSecrets =
    !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;

if (hasStripeSecrets) {
    app.post(
        "/api/stripe/webhook",
        express.raw({ type: "application/json" }),
        require("./routes/stripeWebhook")
    );
}

// basic middleware
app.use(express.json({ limit: "5mb" }));

// CORS (important for cookies)
app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);

// session cookie (used by passport)
app.use(
    session({
        secret: process.env.SESSION_SECRET || "change-this-session-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: false, // true in production https
        },
    })
);

setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// routes
app.use("/auth", authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

if (hasStripeSecrets) {
    app.use("/api/subscriptions/stripe", require("./routes/stripeSubscriptions"));
} else {
    console.warn("Stripe env vars are missing. Stripe routes are disabled.");

    app.all("/api/stripe/webhook", (_req, res) => {
        res.status(503).json({ message: "Stripe webhook is not configured on server." });
    });

    app.all("/api/subscriptions/stripe", (_req, res) => {
        res.status(503).json({ message: "Stripe subscriptions are not configured on server." });
    });
}

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.send("Optimal Clothing API running"));

async function connectDb() {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
}

async function start() {
    await connectDb();

    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

if (require.main === module) {
    start().catch((e) => {
        console.error("Failed to start server:", e);
        process.exit(1);
    });
}

module.exports = { app, connectDb, start };
