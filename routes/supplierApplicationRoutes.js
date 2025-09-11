const express = require('express');
const router = express.Router();
const { createApplication, listApplications, updateApplicationStatus } = require('../controllers/supplierApplicationController');
const { adminOnly } = require('../middleware/auth');

// Public submission endpoint
router.post('/', createApplication);

// Admin endpoints
router.get('/', adminOnly, listApplications);
router.patch('/:id/status', adminOnly, updateApplicationStatus);

module.exports = router;


