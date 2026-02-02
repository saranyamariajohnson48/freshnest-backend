const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Sales = require('../models/Sales');

dotenv.config({ path: '.env' });

const seedSales = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const product_sku = 'CHO-CAD-014'; // 5 Star
        const salesData = [];
        const months = 12;

        for (let i = 0; i < months; i++) {
            // High demand: 15-25 units per month
            const base = Math.floor(Math.random() * 10) + 15;
            const date = new Date();
            date.setMonth(date.getMonth() - i);

            salesData.push({
                product_sku: product_sku,
                date: date,
                quantity_sold: base,
                revenue: base * 20
            });
        }

        // Clear only for this product
        await Sales.deleteMany({ product_sku: product_sku });
        await Sales.insertMany(salesData);

        console.log(`Seeded ${salesData.length} sales records for ${product_sku}`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

seedSales();
