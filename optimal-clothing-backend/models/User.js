const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        googleId: { type: String, required: true, unique: true },
        email: { type: String, required: true },
        name: { type: String, required: true },
        avatar: { type: String },

        // ✅ Stripe links (needed for cancel + sync)
        stripeCustomerId: { type: String },
        stripeSubscriptionId: { type: String },

        subscription: {
            tier: { type: String, enum: ["deluxe", "grand", "royalty"], default: "deluxe" },
            billingCycle: { type: String, enum: ["monthly", "annual"], default: "monthly" },

            // ✅ allow real Stripe statuses + your old ones
            status: {
                type: String,
                enum: [
                    "active",
                    "trialing",
                    "past_due",
                    "unpaid",
                    "incomplete",
                    "incomplete_expired",
                    "canceled",
                    "cancelled",
                    "expired",
                ],
                default: "expired",
            },

            // ✅ cancellation scheduling
            cancelAtPeriodEnd: { type: Boolean, default: false },

            startedAt: { type: Date },
            endsAt: { type: Date },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
