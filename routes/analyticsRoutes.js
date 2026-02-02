const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Routes
router.post('/predict', analyticsController.runPrediction);
router.get('/dashboard', analyticsController.getDashboardData);
router.post('/seed', analyticsController.seedSalesData); // For dev/demo only

module.exports = router;
