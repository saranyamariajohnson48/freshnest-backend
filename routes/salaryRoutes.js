const express = require('express');
const router = express.Router();
const { adminOnly, authenticateToken } = require('../middleware/auth');
const {
  listStaffWithSalary,
  paySalary,
  getStaffSalaryHistory,
  getSalarySummary,
  getMySalaryHistory,
  getRecentSalaryPayments
} = require('../controllers/salaryController');

// List staff with salary (Admin only)
router.get('/staff', adminOnly, listStaffWithSalary);

// Salary summary (Admin only)
router.get('/summary', adminOnly, getSalarySummary);

// Recent salary payments (Admin only)
router.get('/recent', adminOnly, getRecentSalaryPayments);

// Current authenticated staff salary history
router.get('/me/history', authenticateToken, getMySalaryHistory);

// Pay salary (Admin only)
router.post('/staff/:staffId/pay', adminOnly, paySalary);

// Staff salary history (Admin or the staff themselves)
router.get('/staff/:staffId/history', authenticateToken, getStaffSalaryHistory);

module.exports = router;


