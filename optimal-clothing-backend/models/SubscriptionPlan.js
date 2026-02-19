const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true }, // deluxe | grand | royalty
        name: { type: String, required: true },
        currency: { type: String, default: "PHP" },
        prices: {
            monthly: { type: Number, default: 0 },
            annual: { type: Number, default: 0 },
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
