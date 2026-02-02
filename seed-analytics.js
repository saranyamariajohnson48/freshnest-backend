const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Transaction = require('./models/Transaction');
const Product = require('./models/Product');
const SupplierOrder = require('./models/SupplierOrder');
const User = require('./models/User');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        // 1. Find an Admin and a Supplier for references
        const admin = await User.findOne({ role: { $in: ['admin', 'Admin'] } });
        const supplier = await User.findOne({ role: 'supplier' });

        if (!admin) {
            console.error('No admin found. Please create an admin user first.');
            process.exit(1);
        }

        // 2. Clear old test data if needed (Optional: only clear transactions/orders)
        // await Transaction.deleteMany({ notes: 'Seed Data' });

        // 3. Seed Products if empty
        const productCount = await Product.countDocuments();
        let products = [];
        if (productCount === 0) {
            console.log('Seeding products...');
            products = await Product.insertMany([
                { name: 'Organic Apples', sku: 'APP001', category: 'Fruits', price: 120, costPrice: 80, stock: 50, status: 'active' },
                { name: 'Fresh Milk', sku: 'MILK001', category: 'Dairy', price: 60, costPrice: 40, stock: 5, status: 'active' }, // Low stock
                { name: 'Whole Wheat Bread', sku: 'BRD001', category: 'Bakery', price: 45, costPrice: 30, stock: 20, status: 'active' },
                { name: 'Carrots', sku: 'CAR001', category: 'Vegetables', price: 40, costPrice: 20, stock: 100, status: 'active' },
                { name: 'Greek Yogurt', sku: 'YOG001', category: 'Dairy', price: 80, costPrice: 50, stock: 0, status: 'active' }, // Out of stock
            ]);
        } else {
            products = await Product.find().limit(5);
        }

        // 4. Seed Transactions (Sales Trend)
        console.log('Seeding transactions...');
        const now = new Date();
        const transactions = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);

            // Random number of transactions per day (1 to 3)
            const count = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < count; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 5) + 1;
                transactions.push({
                    userId: admin._id,
                    razorpay_payment_id: `pay_seed_${i}_${j}`,
                    razorpay_order_id: `order_seed_${i}_${j}`,
                    razorpay_signature: 'seed_sig',
                    customer: {
                        name: 'Test Customer',
                        email: 'customer@example.com',
                        phone: '1234567890'
                    },
                    order: {
                        items: [{
                            id: product._id.toString(),
                            name: product.name,
                            price: product.price,
                            quantity: qty,
                            category: product.category
                        }],
                        totalAmount: product.price * qty,
                        currency: 'INR'
                    },
                    status: 'completed',
                    paymentMethod: 'upi',
                    paymentDate: date,
                    notes: 'Seed Data'
                });
            }
        }
        await Transaction.insertMany(transactions);

        // 5. Seed Supplier Orders (Supplier Performance)
        if (supplier) {
            console.log('Seeding supplier orders...');
            const supplierOrders = [
                {
                    supplierId: supplier._id,
                    category: 'Juice Pack',
                    product: 'Mixed Fruit Juice',
                    pricePerQuantity: 50,
                    quantity: 100,
                    status: 'Delivered',
                    expectedDelivery: new Date(),
                    adminConfirmed: true,
                    adminConfirmedAt: new Date(),
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
                },
                {
                    supplierId: supplier._id,
                    category: 'Noodles Pack',
                    product: 'Instant Noodles',
                    pricePerQuantity: 20,
                    quantity: 200,
                    status: 'Delivered',
                    expectedDelivery: new Date(),
                    adminConfirmed: true,
                    adminConfirmedAt: new Date(),
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
                },
                {
                    supplierId: supplier._id,
                    category: 'Chips Pack',
                    product: 'Potato Chips',
                    pricePerQuantity: 15,
                    quantity: 150,
                    status: 'Pending',
                    expectedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                }
            ];
            await SupplierOrder.insertMany(supplierOrders);
        }

        console.log('✅ Seeding completed! Your dashboard should now show data.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedData();
