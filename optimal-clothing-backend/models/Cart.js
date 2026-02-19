const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        variantId: { type: String, default: "" },
        variantName: { type: String, default: "" },

        name: { type: String, required: true },
        image: { type: String, default: "" }, // coverImage
        unitPrice: { type: Number, required: true },
        qty: { type: Number, required: true, min: 1, max: 99 },
    },
    { _id: false }
);

const CartSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
        items: { type: [CartItemSchema], default: [] },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
