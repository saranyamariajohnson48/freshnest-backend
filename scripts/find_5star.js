const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Sales = require('../models/Sales');

dotenv.config({ path: '.env' });

const findProduct = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Search for 5 star or cadbury
        const products = await Product.find({
            $or: [
                { name: /5 star/i },
                { name: /cadbury/i },
                { sku: /5star/i }
            ]
        });

        if (products.length === 0) {
            console.log('Product "5 star" not found.');
        } else {
            for (const p of products) {
                const sales = await Sales.find({ product_sku: p.sku });
                console.log(`Product: ${p.name}, SKU: ${p.sku}, Stock: ${p.stock}`);
                console.log(`Sales Records: ${sales.length}`);
                if (sales.length > 0) {
                    const totalSold = sales.reduce((acc, s) => acc + s.quantity_sold, 0);
                    console.log(`Total Sold: ${totalSold}`);
                }
                console.log('---');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

findProduct();
