const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Sales = require('../models/Sales');
const Prediction = require('../models/Prediction');

dotenv.config({ path: '.env' });

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const productCount = await Product.countDocuments();
        const salesCount = await Sales.countDocuments();
        const predictionCount = await Prediction.countDocuments();

        console.log(`Products: ${productCount}`);
        console.log(`Sales: ${salesCount}`);
        console.log(`Predictions: ${predictionCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData();
