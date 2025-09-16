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

const testUserTransactions = async () => {
  try {
    await connectDB();
    
    // Get all users
    const users = await User.find({}).select('email role fullName');
    console.log('\n📋 All users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.fullName}`);
    });
    
    // Get all transactions
    const allTransactions = await Transaction.find({}).sort({ paymentDate: -1 });
    console.log(`\n📊 Total transactions in database: ${allTransactions.length}`);
    
    if (allTransactions.length > 0) {
      console.log('\n🛒 Recent transactions:');
      allTransactions.slice(0, 5).forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.customer?.email} - ₹${tx.order?.totalAmount} - ${tx.status} - ${tx.paymentDate}`);
      });
    }
    
    // Check transactions for specific users
    for (const user of users) {
      const userTransactions = await Transaction.find({ 
        'customer.email': user.email 
      }).sort({ paymentDate: -1 });
      
      console.log(`\n👤 ${user.email} (${user.role}):`);
      console.log(`   Transactions: ${userTransactions.length}`);
      
      if (userTransactions.length > 0) {
        userTransactions.slice(0, 3).forEach((tx, index) => {
          console.log(`   ${index + 1}. ₹${tx.order?.totalAmount} - ${tx.status} - ${tx.paymentDate}`);
        });
      }
    }
    
    // Check for transactions with userId field
    const transactionsWithUserId = await Transaction.find({ 
      userId: { $exists: true, $ne: null } 
    });
    console.log(`\n🔗 Transactions with userId field: ${transactionsWithUserId.length}`);
    
    if (transactionsWithUserId.length > 0) {
      console.log('Recent transactions with userId:');
      transactionsWithUserId.slice(0, 3).forEach((tx, index) => {
        console.log(`${index + 1}. UserId: ${tx.userId} - Email: ${tx.customer?.email} - ₹${tx.order?.totalAmount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing user transactions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
};

// Run the test
testUserTransactions();
