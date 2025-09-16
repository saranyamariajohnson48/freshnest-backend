const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freshnest', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createSampleTransactions = async () => {
  try {
    await connectDB();
    
    // Get the admin user
    const adminUser = await User.findOne({ email: 'admin@test.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    // Also create a user with the email used in UserDashboard
    let testUser = await User.findOne({ email: 'saranyamariajohnson2026@mca.ajce.in' });
    if (!testUser) {
      // Create the test user
      testUser = new User({
        email: 'saranyamariajohnson2026@mca.ajce.in',
        fullName: 'Saranya Maria Johnson',
        role: 'user',
        isEmailVerified: true,
        password: 'hashedpassword' // This is just for testing
      });
      await testUser.save();
      console.log('✅ Created test user:', testUser.email);
    } else {
      console.log('👤 Found test user:', testUser.email);
    }
    
    console.log('👤 Found admin user:', adminUser.email);
    
    // Create sample transactions for both users
    const sampleTransactions = [
      // Transactions for admin user
      {
        userId: adminUser._id,
        razorpay_payment_id: 'pay_admin_001',
        razorpay_order_id: 'order_admin_001',
        razorpay_signature: 'sig_admin_001',
        customer: {
          name: 'Admin User',
          email: adminUser.email,
          phone: '+91 98765 43210',
          address: '123 Admin St, City, State 12345'
        },
        order: {
          items: [
            {
              id: 'product_001',
              name: 'Organic Tomatoes',
              price: 150,
              quantity: 2,
              category: 'vegetables'
            }
          ],
          totalAmount: 300,
          currency: 'INR'
        },
        status: 'completed',
        paymentMethod: 'cards',
        paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      // Transactions for test user (the one used in UserDashboard)
      {
        userId: testUser._id,
        razorpay_payment_id: 'pay_test_001',
        razorpay_order_id: 'order_test_001',
        razorpay_signature: 'sig_test_001',
        customer: {
          name: 'Saranya Maria Johnson',
          email: testUser.email,
          phone: '+91 98765 43210',
          address: '123 Main St, City, State 12345'
        },
        order: {
          items: [
            {
              id: 'product_001',
              name: 'Organic Tomatoes',
              price: 150,
              quantity: 2,
              category: 'vegetables'
            },
            {
              id: 'product_002',
              name: 'Fresh Spinach',
              price: 80,
              quantity: 1,
              category: 'vegetables'
            }
          ],
          totalAmount: 380,
          currency: 'INR'
        },
        status: 'completed',
        paymentMethod: 'cards',
        paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        userId: testUser._id,
        razorpay_payment_id: 'pay_test_002',
        razorpay_order_id: 'order_test_002',
        razorpay_signature: 'sig_test_002',
        customer: {
          name: 'Saranya Maria Johnson',
          email: testUser.email,
          phone: '+91 98765 43210',
          address: '123 Main St, City, State 12345'
        },
        order: {
          items: [
            {
              id: 'product_003',
              name: 'Premium Apples',
              price: 200,
              quantity: 3,
              category: 'fruits'
            }
          ],
          totalAmount: 600,
          currency: 'INR'
        },
        status: 'completed',
        paymentMethod: 'upi',
        paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        userId: testUser._id,
        razorpay_payment_id: 'pay_test_003',
        razorpay_order_id: 'order_test_003',
        razorpay_signature: 'sig_test_003',
        customer: {
          name: 'Saranya Maria Johnson',
          email: testUser.email,
          phone: '+91 98765 43210',
          address: '123 Main St, City, State 12345'
        },
        order: {
          items: [
            {
              id: 'product_004',
              name: 'Organic Milk',
              price: 120,
              quantity: 2,
              category: 'dairy'
            },
            {
              id: 'product_005',
              name: 'Whole Grain Bread',
              price: 90,
              quantity: 1,
              category: 'bakery'
            }
          ],
          totalAmount: 330,
          currency: 'INR'
        },
        status: 'completed',
        paymentMethod: 'netbanking',
        paymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      }
    ];
    
    // Insert sample transactions
    const createdTransactions = await Transaction.insertMany(sampleTransactions);
    console.log(`✅ Created ${createdTransactions.length} sample transactions`);
    
    // Verify the transactions were created
    const allTransactions = await Transaction.find({}).sort({ paymentDate: -1 });
    console.log(`\n📊 Total transactions in database: ${allTransactions.length}`);
    
    console.log('\n🛒 Sample transactions created:');
    allTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.customer?.email} - ₹${tx.order?.totalAmount} - ${tx.status} - ${tx.paymentDate.toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating sample transactions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Run the script
createSampleTransactions();
