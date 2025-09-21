const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const { adminOnly, adminOrStaff, optionalAuth } = require('../middleware/auth');
const productController = require('../controllers/productController');

// Create product
router.post('/', adminOrStaff, productController.createProduct);

// List products (admin and staff)
router.get('/', adminOrStaff, productController.listProducts);

// Public list products (read-only)
router.get('/public', optionalAuth, productController.publicListProducts);

// Update product
router.put('/:id', adminOrStaff, productController.updateProduct);

// Manually trigger low stock alert for a product
router.post('/:id/alerts/low-stock', adminOrStaff, productController.sendLowStockAlert);

// Delete product (soft by default, permanent with ?permanent=true)
router.delete('/:id', adminOrStaff, productController.deleteProduct);

// Import CSV
router.post('/import-csv', adminOnly, upload.single('file'), productController.importCSV);

module.exports = router;