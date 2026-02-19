const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Product" },
        productName: { type: String, default: "" },
        variantId: { type: String, default: "" },
        variantName: { type: String, default: "" },
        qty: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        image: { type: String, default: "" },
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        customerName: { type: String, required: true },
        customerEmail: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        notes: { type: String, default: "" },
        paymentMethod: { type: String, default: "cod" },

        // ✅ ADD THESE
        courier: { type: String, default: "" },
        tracking: { type: String, default: "" },

        items: { type: [OrderItemSchema], required: true },

        shippingFee: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 },
        total: { type: Number, default: 0 },

        status: { type: String, default: "pending" },
    },
    { timestamps: true }
);


module.exports = mongoose.models.Order || mongoose.model("Order", OrderSchema);
