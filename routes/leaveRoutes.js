const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
  cancelLeave,
  getLeaveStats
} = require('../controllers/leaveController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Staff routes
router.post('/apply', authenticateToken, authorizeRoles('staff'), applyLeave);
router.get('/my-leaves', authenticateToken, authorizeRoles('staff'), getMyLeaves);
router.delete('/:leaveId/cancel', authenticateToken, authorizeRoles('staff'), cancelLeave);

// Admin routes
router.get('/all', authenticateToken, authorizeRoles('admin'), getAllLeaves);
router.put('/:leaveId/review', authenticateToken, authorizeRoles('admin'), reviewLeave);
router.get('/stats', authenticateToken, authorizeRoles('admin'), getLeaveStats);

module.exports = router;