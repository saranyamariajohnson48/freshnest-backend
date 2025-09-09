const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
require('dotenv').config();

// Sample transaction data
const sampleTransactions = [
  {
    razorpay_payment_id: 'pay_sample_001',
    razorpay_order_id: 'order_sample_001',
    razorpay_signature: 'sig_sample_001',
    customer: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 98765 43210',
      address: '123 Main Street, Mumbai, Maharashtra 400001'
    },
    order: {
      items: [
        {
          id: 'prod_001',
          name: 'Organic Tomatoes',
          price: 150,
          quantity: 2,
          category: 'vegetables'
        },
        {
          id: 'prod_002',
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
    paymentMethod: 'upi',
    paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    razorpay_payment_id: 'pay_sample_002',
    razorpay_order_id: 'order_sample_002',
    razorpay_signature: 'sig_sample_002',
    customer: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+91 87654 32109',
      address: '456 Park Avenue, Delhi, Delhi 110001'
    },
    order: {
      items: [
        {
          id: 'prod_003',
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
    paymentMethod: 'cards',
    paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    razorpay_payment_id: 'pay_sample_003',
    razorpay_order_id: 'order_sample_003',
    razorpay_signature: 'sig_sample_003',
    customer: {
      name: 'Mike Johnson',
      email: 'mike.johnson@example.com',
      phone: '+91 76543 21098',
      address: '789 Garden Road, Bangalore, Karnataka 560001'
    },
    order: {
      items: [
        {
          id: 'prod_004',
          name: 'Organic Milk',
          price: 60,
          quantity: 5,
          category: 'dairy'
        },
        {
          id: 'prod_005',
          name: 'Whole Grain Bread',
          price: 45,
          quantity: 2,
          category: 'bakery'
        }
      ],
      totalAmount: 390,
      currency: 'INR'
    },
    status: 'completed',
    paymentMethod: 'netbanking',
    paymentDate: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
  }
];

async function seedTransactions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing transactions
    await Transaction.deleteMany({});
    console.log('🗑️ Cleared existing transactions');

    // Insert sample transactions
    const insertedTransactions = await Transaction.insertMany(sampleTransactions);
    console.log(`✅ Inserted ${insertedTransactions.length} sample transactions`);

    // Display summary
    console.log('\n📊 Transaction Summary:');
    console.log(`Total transactions: ${insertedTransactions.length}`);
    
    const totalAmount = insertedTransactions.reduce((sum, t) => sum + t.order.totalAmount, 0);
    console.log(`Total amount: ₹${totalAmount.toLocaleString('en-IN')}`);
    
    const paymentMethods = [...new Set(insertedTransactions.map(t => t.paymentMethod))];
    console.log(`Payment methods: ${paymentMethods.join(', ')}`);

    console.log('\n🎉 Sample transactions seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding transactions:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding function
seedTransactions();
