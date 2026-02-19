const router = require("express").Router();
const Stripe = require("stripe");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const User = require("../models/User");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// auth guard
function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    next();
}

function toUnitAmountPHP(peso) {
    const v = Math.round(Number(peso || 0));
    return v * 100;
}

function getUserId(req) {
    return String((req.user && (req.user.id || req.user._id)) || "");
}

async function getBestSubscription(userDoc) {
    const pickBestFromList = async (subs) => {
        if (!subs?.length) return null;

        const activeLike = subs.filter((s) =>
            ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status)
        );

        const candidates = (activeLike.length ? activeLike : subs).slice();

        // pick by farthest current_period_end, fallback created
        candidates.sort((a, b) => {
            const aEnd = typeof a.current_period_end === "number" ? a.current_period_end : -1;
            const bEnd = typeof b.current_period_end === "number" ? b.current_period_end : -1;

            if (aEnd !== bEnd) return bEnd - aEnd; // descending
            return (b.created || 0) - (a.created || 0);
        });

        return candidates[0] || null;
    };

    // 1) try saved subscription id first
    if (userDoc.stripeSubscriptionId) {
        try {
            const s = await stripe.subscriptions.retrieve(userDoc.stripeSubscriptionId);
            return s;
        } catch {
            // fall through
        }
    }

    // 2) list by customer
    if (!userDoc.stripeCustomerId) return null;

    const list = await stripe.subscriptions.list({
        customer: userDoc.stripeCustomerId,
        status: "all",
        limit: 20,
    });

    const best = await pickBestFromList(list.data || []);
    if (!best) return null;

    // save best subscription id
    if (best.id && best.id !== userDoc.stripeSubscriptionId) {
        await User.findByIdAndUpdate(userDoc._id, { $set: { stripeSubscriptionId: best.id } });
    }

    return best;
}


async function computeEndsAtFromStripe({ subscription, customerId }) {
    if (!subscription) return null;

    // ✅ 1) best source: subscription period end
    const cpe = subscription.current_period_end;
    if (typeof cpe === "number") return new Date(cpe * 1000);

    // ✅ 2) upcoming invoice: use LINE period end (not invoice.period_end)
    try {
        if (customerId) {
            const upcoming = await stripe.invoices.retrieveUpcoming({
                customer: customerId,
                subscription: subscription.id,
            });

            const lineEnd = upcoming?.lines?.data?.[0]?.period?.end;
            if (typeof lineEnd === "number") return new Date(lineEnd * 1000);
        }
    } catch {
        // ignore
    }

    // ✅ 3) last invoice: use LINE period end (not invoice.period_end)
    try {
        const invs = await stripe.invoices.list({ subscription: subscription.id, limit: 1 });
        const inv = invs.data?.[0];

        const lineEnd = inv?.lines?.data?.[0]?.period?.end;
        if (typeof lineEnd === "number") return new Date(lineEnd * 1000);
    } catch {
        // ignore
    }

    return null;
}



async function findOrSyncStripeSubscription(userDoc) {
    if (userDoc.stripeSubscriptionId) {
        try {
            return await stripe.subscriptions.retrieve(userDoc.stripeSubscriptionId);
        } catch { }
    }

    if (!userDoc.stripeCustomerId) return null;

    const list = await stripe.subscriptions.list({
        customer: userDoc.stripeCustomerId,
        status: "all",
        limit: 20,
    });

    const subs = list.data || [];
    if (!subs.length) return null;

    const activeLike = subs.filter((s) =>
        ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s.status)
    );

    const candidates = (activeLike.length ? activeLike : subs).slice();
    candidates.sort((a, b) => {
        const aEnd = typeof a.current_period_end === "number" ? a.current_period_end : -1;
        const bEnd = typeof b.current_period_end === "number" ? b.current_period_end : -1;
        if (aEnd !== bEnd) return bEnd - aEnd;
        return (b.created || 0) - (a.created || 0);
    });

    const best = candidates[0] || null;

    if (best?.id && best.id !== userDoc.stripeSubscriptionId) {
        await User.findByIdAndUpdate(userDoc._id, { $set: { stripeSubscriptionId: best.id } });
    }

    return best;
}


/**
 * GET /api/subscriptions/stripe/me
 */
router.get("/me", requireAuth, async (req, res) => {
    try {
        const userId = getUserId(req);
        const userDoc = await User.findById(userId);
        if (!userDoc) return res.status(404).json({ message: "User not found" });

        const subDoc = userDoc.subscription || {};
        const payload = {
            tier: subDoc.tier || null,
            billingCycle: subDoc.billingCycle || null,
            status: subDoc.status || null,
            endsAt: subDoc.endsAt || null,
            cancelAtPeriodEnd: !!subDoc.cancelAtPeriodEnd,
        };

        // ✅ NEW: if we have Stripe links, always attempt a light sync
        const canSync = Boolean(userDoc.stripeCustomerId || userDoc.stripeSubscriptionId);

        if (canSync) {
            const stripeSub = await getBestSubscription(userDoc);

            if (stripeSub) {
                const finalEndsAt = await computeEndsAtFromStripe({
                    subscription: stripeSub,
                    customerId: userDoc.stripeCustomerId,
                });

                // ✅ derive tier/billingCycle from Stripe metadata if present
                // NOTE: you set metadata on product_data in checkout-session
                const meta = stripeSub.metadata || {};


                const derivedTier = meta?.tier;
                const derivedBillingCycle = meta?.billingCycle;

                userDoc.subscription = userDoc.subscription || {};

                // ✅ update status even if "expired" in DB
                userDoc.subscription.status = stripeSub.status || userDoc.subscription.status || "active";
                userDoc.subscription.cancelAtPeriodEnd = !!stripeSub.cancel_at_period_end;

                if (finalEndsAt) userDoc.subscription.endsAt = finalEndsAt;

                // ✅ only override tier/billingCycle if stripe has them (avoid wiping)
                if (derivedTier && ["deluxe", "grand", "royalty"].includes(String(derivedTier))) {
                    userDoc.subscription.tier = String(derivedTier);
                }
                if (derivedBillingCycle && ["monthly", "annual"].includes(String(derivedBillingCycle))) {
                    userDoc.subscription.billingCycle = String(derivedBillingCycle);
                }

                userDoc.stripeSubscriptionId = userDoc.stripeSubscriptionId || stripeSub.id;

                await userDoc.save();

                payload.tier = userDoc.subscription.tier || null;
                payload.billingCycle = userDoc.subscription.billingCycle || null;
                payload.status = userDoc.subscription.status || null;
                payload.endsAt = userDoc.subscription.endsAt || null;
                payload.cancelAtPeriodEnd = !!userDoc.subscription.cancelAtPeriodEnd;
            }
        }

        return res.json(payload);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Failed to load subscription" });
    }
});




/**
 * POST /api/subscriptions/stripe/cancel
 * body: { atPeriodEnd: true } default true
 */
router.post("/cancel", requireAuth, async (req, res) => {
    try {
        const userId = getUserId(req);
        const atPeriodEnd = req.body?.atPeriodEnd !== false;

        const userDoc = await User.findById(userId);
        if (!userDoc) return res.status(404).json({ message: "User not found" });

        const s = await findOrSyncStripeSubscription(userDoc);
        if (!s?.id) return res.status(400).json({ message: "No active Stripe subscription found" });

        const updated = await stripe.subscriptions.update(s.id, {
            cancel_at_period_end: atPeriodEnd,
        });

        const endsAt = await computeEndsAtFromStripe({
            subscription: updated,
            customerId: userDoc.stripeCustomerId,
        });


        userDoc.stripeSubscriptionId = updated.id;
        userDoc.subscription = userDoc.subscription || {};
        userDoc.subscription.status = updated.status || userDoc.subscription.status || "active";
        userDoc.subscription.cancelAtPeriodEnd = !!updated.cancel_at_period_end;
        if (endsAt) userDoc.subscription.endsAt = endsAt;

        await userDoc.save();

        return res.json({
            ok: true,
            tier: userDoc.subscription.tier || null,
            billingCycle: userDoc.subscription.billingCycle || null,
            status: userDoc.subscription.status || null,
            endsAt: userDoc.subscription.endsAt || null,
            cancelAtPeriodEnd: !!userDoc.subscription.cancelAtPeriodEnd,
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Failed to cancel subscription" });
    }
});

/**
 * POST /api/subscriptions/stripe/checkout-session
 * body: { tier, billingCycle }
 */
router.post("/checkout-session", requireAuth, async (req, res) => {
    try {
        const tier = String(req.body?.tier || "");
        const billingCycle = String(req.body?.billingCycle || "annual");

        if (!["deluxe", "grand", "royalty"].includes(tier)) {
            return res.status(400).json({ message: "Invalid tier" });
        }
        if (!["monthly", "annual"].includes(billingCycle)) {
            return res.status(400).json({ message: "Invalid billingCycle" });
        }

        const plan = await SubscriptionPlan.findOne({ key: tier });
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        const pricePeso =
            billingCycle === "annual"
                ? Number(plan.prices?.annual ?? 0)
                : Number(plan.prices?.monthly ?? 0);

        if (!pricePeso || pricePeso <= 0) {
            return res.status(400).json({ message: "Plan price is not set" });
        }

        const unit_amount = toUnitAmountPHP(pricePeso);
        const interval = billingCycle === "annual" ? "year" : "month";

        const userDoc = await User.findById(getUserId(req));
        if (!userDoc) return res.status(404).json({ message: "User not found" });

        let customerId = userDoc.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userDoc.email,
                name: userDoc.name,
                metadata: { userId: String(userDoc._id) },
            });
            customerId = customer.id;
            userDoc.stripeCustomerId = customerId;
            await userDoc.save();
        }

        // ✅ IMPORTANT: put metadata into subscription_data (THIS is the fix)
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: customerId,
            line_items: [
                {
                    price_data: {
                        currency: "php",
                        unit_amount,
                        product_data: {
                            name: `Optimal ${tier.toUpperCase()} (${billingCycle})`,
                        },
                        recurring: { interval },
                    },
                    quantity: 1,
                },
            ],
            subscription_data: {
                metadata: {
                    userId: String(userDoc._id),
                    tier,
                    billingCycle,
                },
            },
            success_url: `${process.env.APP_URL}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_URL}/subscriptions/canceled`,
        });

        return res.json({ url: session.url });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Failed to create checkout session" });
    }
});


module.exports = router;
