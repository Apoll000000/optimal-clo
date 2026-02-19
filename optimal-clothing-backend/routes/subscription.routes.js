const router = require("express").Router();
const SubscriptionPlan = require("../models/SubscriptionPlan");
const User = require("../models/User");

// auth + admin guard (simple)
function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    next();
}
function requireAdmin(req, res, next) {
    const allow = String(process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);

    const email = String(req.user?.email || "").toLowerCase();
    if (!allow.includes(email)) return res.status(403).json({ message: "Forbidden" });
    next();
}

// GET /api/subscriptions/plans
router.get("/plans", requireAuth, requireAdmin, async (req, res) => {
    const plans = await SubscriptionPlan.find({}).sort({ key: 1 });
    res.json(plans);
});

// PATCH /api/subscriptions/plans  (bulk update)
router.patch("/plans", requireAuth, requireAdmin, async (req, res) => {
    const incoming = Array.isArray(req.body?.plans) ? req.body.plans : [];
    if (!incoming.length) return res.status(400).json({ message: "plans[] required" });

    for (const p of incoming) {
        if (!p.key) continue;
        await SubscriptionPlan.findOneAndUpdate(
            { key: String(p.key) },
            {
                $set: {
                    name: p.name || p.key,
                    currency: p.currency || "PHP",
                    prices: {
                        monthly: Number(p.monthly ?? p.prices?.monthly ?? 0),
                        annual: Number(p.annual ?? p.prices?.annual ?? 0),
                    },
                },
            },
            { upsert: true, new: true }
        );
    }

    const updated = await SubscriptionPlan.find({}).sort({ key: 1 });
    res.json(updated);
});

// GET /api/subscriptions/subscribers
router.get("/subscribers", requireAuth, requireAdmin, async (req, res) => {
    const users = await User.find(
        { "subscription.status": "active", "subscription.endsAt": { $ne: null } },
        { name: 1, email: 1, subscription: 1 }
    ).sort({ "subscription.endsAt": 1 });

    const now = Date.now();
    const out = users.map((u) => {
        const endsAt = u.subscription?.endsAt ? new Date(u.subscription.endsAt).getTime() : now;
        const daysLeft = Math.max(0, Math.ceil((endsAt - now) / (1000 * 60 * 60 * 24)));
        return {
            id: String(u._id),
            name: u.name,
            email: u.email,
            subscription: u.subscription,
            daysLeft,
        };
    });

    res.json(out);
});

// GET /api/subscriptions/public/plans  (public pricing for subscriptions page)
router.get("/public/plans", async (req, res) => {
    const plans = await SubscriptionPlan.find(
        {},
        { key: 1, name: 1, currency: 1, prices: 1, autoAnnual: 1, annualDiscountPct: 1, updatedAt: 1 }
    ).sort({ key: 1 });

    res.json(
        plans.map((p) => ({
            key: p.key,
            name: p.name,
            currency: p.currency || "PHP",
            monthly: Number(p.prices?.monthly ?? 0),
            annual: Number(p.prices?.annual ?? 0),
            autoAnnual: p.autoAnnual ?? true,
            annualDiscountPct: Number(p.annualDiscountPct ?? 0),
            updatedAt: p.updatedAt,
        }))
    );
});


module.exports = router;
