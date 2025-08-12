const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import your models
const User = require('./models/User');
const Leave = require('./models/Leave');

async function checkExistingData() {
  try {
    console.log('🔄 Checking existing data in MongoDB Atlas...');
    
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    
    // Check Users collection
    const userCount = await User.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount > 0) {
      const sampleUsers = await User.find().limit(3).select('email role createdAt');
      console.log('📋 Sample users:');
      sampleUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) - Created: ${user.createdAt}`);
      });
    }
    
    // Check Leaves collection
    const leaveCount = await Leave.countDocuments();
    console.log(`🏖️ Leave applications in database: ${leaveCount}`);
    
    if (leaveCount > 0) {
      const sampleLeaves = await Leave.find().limit(3).select('type status startDate endDate createdAt');
      console.log('📋 Sample leaves:');
      sampleLeaves.forEach(leave => {
        console.log(`  - ${leave.type} (${leave.status}) - ${leave.startDate} to ${leave.endDate}`);
      });
    }
    
    console.log('🎉 Data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking data:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  }
}

checkExistingData();