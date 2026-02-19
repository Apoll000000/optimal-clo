require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

const setupPassport = require("./config/passport");
const authRoutes = require("./routes/auth");

// ✅ ADD THESE
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const userRoutes = require("./routes/user.routes");
const uploadRoutes = require("./routes/upload.routes");
const cartRoutes = require("./routes/cart.routes");
const checkoutRoutes = require("./routes/checkout.routes");

const subscriptionRoutes = require("./routes/subscription.routes");


const app = express();

app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    require("./routes/stripeWebhook")
);

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
        secret: process.env.SESSION_SECRET,
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

// ✅ API routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);

app.use("/api/subscriptions", subscriptionRoutes);

// server.js / app.js
app.use("/api/subscriptions/stripe", require("./routes/stripeSubscriptions"));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.send("Optimal Clothing API running ✅"));

async function start() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected ✅");

    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

start().catch((e) => {
    console.error("Failed to start server:", e);
    process.exit(1);
});
