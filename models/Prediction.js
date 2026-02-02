const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema(
    {
        product_sku: { type: String, required: true, index: true },
        product_name: { type: String }, // redundant but useful for display
        current_stock: { type: Number, required: true },
        predicted_demand: { type: Number, required: true },
        confidence_level: { type: Number, default: 0 }, // 0-1 or percentage
        risk_status: {
            type: String,
            enum: ['SAFE', 'WARNING', 'CRITICAL'],
            default: 'SAFE'
        },
        prediction_date: { type: Date, default: Date.now },
        next_restock_recommendation: { type: Number, default: 0 },
        reason: { type: String, default: '' }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Prediction', PredictionSchema);
