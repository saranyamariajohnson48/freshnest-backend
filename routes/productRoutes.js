const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const { adminOnly } = require('../middleware/auth');
const productController = require('../controllers/productController');

// Create product
router.post('/', adminOnly, productController.createProduct);

// List products
router.get('/', adminOnly, productController.listProducts);

// Update product
router.put('/:id', adminOnly, productController.updateProduct);

// Delete product (soft by default, permanent with ?permanent=true)
router.delete('/:id', adminOnly, productController.deleteProduct);

// Import CSV
router.post('/import-csv', adminOnly, upload.single('file'), productController.importCSV);

module.exports = router;