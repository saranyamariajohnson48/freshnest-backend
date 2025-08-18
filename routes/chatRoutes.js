const express = require('express');
const router = express.Router();
const { authenticateToken, adminOnly } = require('../middleware/auth');
const controller = require('../controllers/chatController');

// Any authenticated user can create/fetch 1:1 conversation per business rules in controller
router.post('/conversations', authenticateToken, controller.getOrCreateConversation);

// List my conversations (now for any authenticated user)
router.get('/conversations', authenticateToken, controller.listMyConversations);

// Send message (participants restricted by conversation membership)
router.post('/conversations/:conversationId/messages', authenticateToken, controller.sendMessage);

// Get messages (REST + polling)
router.get('/conversations/:conversationId/messages', authenticateToken, controller.getMessages);

// Mark as read
router.post('/conversations/:conversationId/read', authenticateToken, controller.markAsRead);

module.exports = router;