const Stripe = require("stripe");
const User = require("../models/User");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function stripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature verify failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // ✅ handle Checkout success
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            console.log("✅ checkout.session.completed", {
                id: session.id,
                mode: session.mode,
                customer: session.customer,
                subscription: session.subscription,
                metadata: session.metadata,
            });

            let subscriptionId = session.subscription;

            // ✅ fallback: if session.subscription missing, find subscription by customer
            if (!subscriptionId && session.customer) {
                const subs = await stripe.subscriptions.list({
                    customer: session.customer,
                    status: "all",
                    limit: 1,
                });
                subscriptionId = subs.data?.[0]?.id;
            }

            if (!subscriptionId) {
                console.warn("⚠️ No subscriptionId found for session", session.id);
                return res.json({ received: true });
            }

            // ✅ retrieve Stripe subscription (THIS contains subscription_data.metadata)
            const sub = await stripe.subscriptions.retrieve(subscriptionId);

            // ✅ IMPORTANT: metadata is now on sub.metadata (because you used subscription_data.metadata)
            const userId = sub.metadata?.userId;
            const tier = sub.metadata?.tier;
            const billingCycle = sub.metadata?.billingCycle;

            if (!userId || !tier || !billingCycle) {
                console.warn("⚠️ Missing subscription metadata", {
                    subscriptionId,
                    meta: sub.metadata,
                });
                return res.json({ received: true });
            }

            const endsAt = sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null;

            await User.findByIdAndUpdate(userId, {
                $set: {
                    "subscription.tier": String(tier),
                    "subscription.billingCycle": String(billingCycle),
                    "subscription.status": sub.status || "active",
                    "subscription.endsAt": endsAt,
                    stripeSubscriptionId: subscriptionId,
                    stripeCustomerId: String(session.customer || ""),
                },
            });

            console.log("✅ User subscription updated", { userId, subscriptionId });
        }

        // ✅ keep DB synced when Stripe updates/cancels
        if (
            event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.deleted"
        ) {
            const sub = event.data.object;
            const customerId = sub.customer;

            const user = await User.findOne({ stripeCustomerId: customerId });
            if (user) {
                await User.findByIdAndUpdate(user._id, {
                    $set: {
                        "subscription.status": sub.status,
                        "subscription.endsAt": sub.current_period_end
                            ? new Date(sub.current_period_end * 1000)
                            : null,
                        stripeSubscriptionId: sub.id,
                    },
                });
                console.log("✅ Synced subscription status", {
                    userId: user._id,
                    status: sub.status,
                });
            }
        }

        return res.json({ received: true });
    } catch (e) {
        console.error("Webhook handler error:", e);
        return res.status(500).json({ message: "Webhook handler failed" });
    }
};
