const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        extraPrice: { type: Number, default: 0 },
        sku: { type: String, default: "" },
        images: [{ type: String, default: "" }],
    },
    { _id: false }
);

const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        price: { type: Number, default: 0 },
        stocks: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "draft"], default: "draft" },
        coverImage: { type: String, default: "" },
        variants: { type: [VariantSchema], default: [] },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
