const Product = require('../models/Product');
const Sales = require('../models/Sales');
const Prediction = require('../models/Prediction');
const { spawn } = require('child_process');
const path = require('path');

exports.runPrediction = async (req, res) => {
  try {
    // 1. Fetch all products and sales history
    const products = await Product.find({}).lean();
    const sales = await Sales.find({}).lean();

    if (products.length === 0) {
      return res.status(400).json({ message: 'No products found to predict' });
    }

    // Prepare data for Python script
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

    // 2. Spawn Python process
    const pythonScriptPath = path.join(__dirname, '../ml/stock_prediction.py');
    const pythonProcess = spawn('python3', [pythonScriptPath]);

    let dataString = '';
    let errorString = '';

    // Send data to script via stdin
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
        return res.status(500).json({ message: 'Prediction failed', error: errorString });
      }

      try {
        const predictions = JSON.parse(dataString);

        if (predictions.error) {
          return res.status(500).json({ message: 'Prediction script error', error: predictions.error });
        }

        // 3. Save predictions to MongoDB
        // Clear old predictions first (optional, or keep history)
        // For dashboard "current state", we might just update or upsert.
        // Let's upsert based on SKU.

        const bulkOps = predictions.map(pred => ({
          updateOne: {
            filter: { product_sku: pred.product_sku },
            update: { $set: pred },
            upsert: true
          }
        }));

        if (bulkOps.length > 0) {
          await Prediction.bulkWrite(bulkOps);
        }

        res.json({ success: true, message: 'Predictions updated successfully', count: predictions.length });

      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, dataString);
        res.status(500).json({ message: 'Failed to parse prediction results' });
      }
    });

  } catch (error) {
    console.error('runPrediction Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const predictions = await Prediction.find().sort({ risk_status: 1 }); // CRITICAL first usually if sorted alphabetically C < S < W? No. 
    // Let's sort manually or just return all using frontend sort.

    // Aggregates
    const totalProducts = predictions.length;
    const criticalCount = predictions.filter(p => p.risk_status === 'CRITICAL').length;
    const warningCount = predictions.filter(p => p.risk_status === 'WARNING').length;
    const safeCount = predictions.filter(p => p.risk_status === 'SAFE').length;

    // Get top 5 risky products
    // Custom sort: CRITICAL > WARNING > SAFE
    const riskOrder = { 'CRITICAL': 0, 'WARNING': 1, 'SAFE': 2 };
    const sortedPredictions = [...predictions].sort((a, b) => riskOrder[a.risk_status] - riskOrder[b.risk_status]);
    const topRisky = sortedPredictions.slice(0, 5);

    res.json({
      summary: {
        total: totalProducts,
        critical: criticalCount,
        warning: warningCount,
        safe: safeCount
      },
      predictions: sortedPredictions,
      topRisky
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper: Seed dummy sales data
exports.seedSalesData = async (req, res) => {
  try {
    const products = await Product.find({});
    const salesData = [];
    const months = 12;

    for (const p of products) {
      for (let i = 0; i < months; i++) {
        // Random sales between 10 and 100
        // Add seasonality: more in months 10,11 (Festival)
        let base = Math.floor(Math.random() * 50) + 10;
        const month = (new Date().getMonth() - i + 12) % 12;
        if ([9, 10].includes(month)) base *= 2;

        const date = new Date();
        date.setMonth(date.getMonth() - i);

        salesData.push({
          product_sku: p.sku,
          date: date,
          quantity_sold: base,
          revenue: base * p.price
        });
      }
    }

    await Sales.deleteMany({});
    await Sales.insertMany(salesData);

    res.json({ message: `Seeded ${salesData.length} sales records` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
