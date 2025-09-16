const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const { adminOnly, optionalAuth } = require('../middleware/auth');
const productController = require('../controllers/productController');

// Create product
router.post('/', adminOnly, productController.createProduct);

// List products (admin)
router.get('/', adminOnly, productController.listProducts);

// Public list products (read-only)
router.get('/public', optionalAuth, productController.publicListProducts);

// Update product
router.put('/:id', adminOnly, productController.updateProduct);

// Manually trigger low stock alert for a product
router.post('/:id/alerts/low-stock', adminOnly, productController.sendLowStockAlert);

// Delete product (soft by default, permanent with ?permanent=true)
router.delete('/:id', adminOnly, productController.deleteProduct);

// Import CSV
router.post('/import-csv', adminOnly, upload.single('file'), productController.importCSV);

module.exports = router;