const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Sales = require('../models/Sales');
const Prediction = require('../models/Prediction');
const { spawn } = require('child_process');
const path = require('path');

dotenv.config({ path: '.env' });

const runPrediction = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({}).lean();
        const sales = await Sales.find({}).lean();

        const inputData = {
            products: products.map(p => ({
                sku: p.sku,
                name: p.name,
                stock: p.stock,
                category: p.category,
                brand: p.brand
            })),
            sales: sales.map(s => ({
                product_sku: s.product_sku,
                date: s.date.toISOString(),
                quantity_sold: s.quantity_sold
            }))
        };

        const pythonScriptPath = path.join(__dirname, '../ml/stock_prediction.py');
        const pythonProcess = spawn('python3', [pythonScriptPath]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdin.write(JSON.stringify(inputData));
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error('Python script error:', errorString);
                process.exit(1);
            }

            try {
                const predictions = JSON.parse(dataString);
                console.log(`Received ${predictions.length} predictions`);

                const bulkOps = predictions.map(pred => ({
                    updateOne: {
                        filter: { product_sku: pred.product_sku },
                        update: { $set: pred },
                        upsert: true
                    }
                }));

                if (bulkOps.length > 0) {
                    await Prediction.bulkWrite(bulkOps);
                    console.log('Updated predictions in DB');
                }

                // Check 5 Star prediction specifically
                const starPrediction = await Prediction.findOne({ product_sku: 'CHO-CAD-014' });
                console.log('5 Star Prediction:', JSON.stringify(starPrediction, null, 2));

                process.exit(0);
            } catch (err) {
                console.error('Error parsing/saving:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

runPrediction();
