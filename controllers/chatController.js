const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Create or fetch one-to-one conversation between admin and a user (staff/supplier)
exports.getOrCreateConversation = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const { participantId } = req.body;

    const requester = await User.findById(requesterId);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });

    // If requester is admin: can start with staff or supplier
    // If requester is staff/supplier: can only start with admin
    const other = await User.findById(participantId);
    if (!other) return res.status(404).json({ error: 'Participant not found' });

    const isRequesterAdmin = ['admin', 'Admin'].includes(requester.role);
    const isOtherAdmin = ['admin', 'Admin'].includes(other.role);

    if (isRequesterAdmin) {
      if (!['supplier', 'staff'].includes(other.role)) {
        return res.status(400).json({ error: 'Conversation allowed only with supplier or staff' });
      }
    } else if (['staff', 'supplier'].includes(requester.role)) {
      if (!isOtherAdmin) {
        return res.status(403).json({ error: 'You can only message Admin' });
      }
    } else {
      return res.status(403).json({ error: 'Not allowed' });
    }

    // Find existing one-to-one conversation (participants in any order)
    let convo = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [requesterId, participantId], $size: 2 }
    });

    if (!convo) {
      convo = await Conversation.create({ participants: [requesterId, participantId], isGroup: false });
    }

    const populated = await Conversation.findById(convo._id)
      .populate('participants', 'fullName email role status');

    return res.json({ success: true, conversation: populated });
  } catch (err) {
    console.error('getOrCreateConversation error:', err);
    return res.status(500).json({ error: 'Failed to create/fetch conversation' });
  }
};

// List all conversations for admin with last message
exports.listMyConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const convos = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'fullName email role status');

    return res.json({ success: true, conversations: convos });
  } catch (err) {
    console.error('listMyConversations error:', err);
    return res.status(500).json({ error: 'Failed to list conversations' });
  }
};

// Send message in a conversation
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { conversationId } = req.params;
    const { text, attachments } = req.body;

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    if (!convo.participants.some(p => String(p) === String(senderId))) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const receiverId = convo.participants.find(p => String(p) !== String(senderId));

    const message = await Message.create({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      text: text || '',
      attachments: attachments || [],
      readBy: [senderId]
    });

    // Update conversation last message
    convo.lastMessage = { text: message.text, sender: senderId, at: message.createdAt };
    await convo.save();

    return res.json({ success: true, message });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get messages for a conversation with pagination (REST + polling)
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { before, limit = 30 } = req.query;

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (!convo.participants.some(p => String(p) === String(userId))) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    const query = { conversationId };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'fullName role')
      .populate('receiver', 'fullName role');

    return res.json({ success: true, messages: messages.reverse() });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Mark messages as read in a conversation
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    if (!convo.participants.some(p => String(p) === String(userId))) {
      return res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    await Message.updateMany({ conversationId, readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });
    return res.json({ success: true });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
};