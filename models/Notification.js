const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['low_stock', 'info', 'alert', 'system'],
        default: 'info'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    relatedDocModel: {
        type: String,
        required: false,
        enum: ['Product', 'SupplierOrder', 'SalaryPayment']
    }
}, {
    timestamps: true
});

// Index for efficient unread count and listing
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
