const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // exactly 2 for one-to-one
  isGroup: { type: Boolean, default: false },
  lastMessage: {
    text: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date }
  }
}, { timestamps: true });

// Ensure uniqueness for one-to-one conversations regardless of order
ConversationSchema.index({ participants: 1 }, { unique: false });

module.exports = mongoose.model('Conversation', ConversationSchema);