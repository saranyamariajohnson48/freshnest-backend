const Notification = require('../models/Notification');

// Get notifications for the authenticated user
exports.getMyNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const filter = { recipient: req.user._id };
        if (unreadOnly === 'true' || unreadOnly === true) {
            filter.isRead = false;
        }

        const [items, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Notification.countDocuments(filter)
        ]);

        const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

        res.json({
            success: true,
            data: {
                items,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                unreadCount
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
};

// Mark a specific notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user._id },
            { $set: { isRead: true, readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, error: 'Failed to update notification' });
    }
};

// Mark all notifications as read for the user
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { $set: { isRead: true, readAt: new Date() } }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, error: 'Failed to update notifications' });
    }
};
