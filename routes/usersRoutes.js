const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleStatus,
  searchUsers
} = require('../controllers/usersController');

const { authenticateToken, adminOnly } = require('../middleware/auth');

// Protect all /api/users routes for admin usage
router.post('/', adminOnly, createUser);
router.get('/', adminOnly, getUsers);
router.get('/search', adminOnly, searchUsers);
router.get('/:id', adminOnly, getUserById);
router.put('/:id', adminOnly, updateUser);
router.delete('/:id', adminOnly, deleteUser);
router.patch('/:id/toggle-status', adminOnly, toggleStatus);

module.exports = router;