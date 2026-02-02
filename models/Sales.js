const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema(
    {
        product_sku: { type: String, required: true, index: true },
        date: { type: Date, required: true },
        quantity_sold: { type: Number, required: true, min: 0 },
        revenue: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Compound index for efficient querying by product and date range
SalesSchema.index({ product_sku: 1, date: 1 });

module.exports = mongoose.model('Sales', SalesSchema);
