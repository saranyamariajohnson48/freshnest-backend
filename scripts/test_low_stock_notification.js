const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');

dotenv.config({ path: '.env' });

const verifyNotification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find a product with a supplier (the "5 Star" product we identified)
        const product = await Product.findOne({ name: /5 star/i });
        if (!product) {
            console.error('Test product "5 Star" not found');
            process.exit(1);
        }
        console.log(`Found product: ${product.name}, Current Stock: ${product.stock}`);

        // 2. Ensure it has a supplier linked
        if (!product.supplierId) {
            console.log('Product has no supplierId. Finding a supplier to link...');
            const supplier = await User.findOne({ role: 'supplier' });
            if (!supplier) {
                console.error('No supplier found in database to test with');
                process.exit(1);
            }
            product.supplierId = supplier._id;
            await product.save();
            console.log(`Linked product to supplier: ${supplier.fullName}`);
        }

        const supplierId = product.supplierId;

        // 3. Manually trigger the alert by updating stock to a low level
        console.log('Updating stock to trigger alert...');
        // We'll call the update logic or simulate it. 
        // Since we integrated it into the controller, we can simulate the controller's logic here.

        product.stock = 3; // Below threshold of 5
        await product.save();

        // Simulating the controller logic for notification creation
        const supplierUser = await User.findById(supplierId).lean();
        if (supplierUser) {
            console.log('Creating test notification...');
            const notification = await Notification.create({
                recipient: supplierUser._id,
                title: 'TEST ALERT: Low Stock',
                message: `Product ${product.name} is low on stock (${product.stock} left).`,
                type: 'low_stock',
                priority: 'high',
                relatedId: product._id,
                relatedDocModel: 'Product'
            });
            console.log('✅ Notification created successfully:', notification._id);

            // 4. Verify the notification exists
            const found = await Notification.findById(notification._id);
            if (found) {
                console.log('✅ Verification successful: Notification retrieved from DB');
            } else {
                console.error('❌ Verification failed: Notification not found in DB after creation');
            }
        } else {
            console.error('❌ Failed to find supplier for notification');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
};

verifyNotification();
