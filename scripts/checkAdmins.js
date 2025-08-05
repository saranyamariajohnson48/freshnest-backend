const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('../models/User');

async function checkAdmins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check all admin users
    const admins = await User.find({ role: 'admin' })
      .select('fullName email username role createdAt');
    
    console.log(`\n=== ADMIN USERS (${admins.length}) ===`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Name: ${admin.fullName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Username: ${admin.username || 'N/A'}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log('   ---');
    });
    
    // Check all users
    const allUsers = await User.find({})
      .select('fullName email role')
      .sort({ role: 1, createdAt: -1 });
    
    console.log(`\n=== ALL USERS (${allUsers.length}) ===`);
    const usersByRole = {};
    allUsers.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    Object.keys(usersByRole).forEach(role => {
      console.log(`\n${role.toUpperCase()} (${usersByRole[role].length}):`);
      usersByRole[role].forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.fullName} (${user.email})`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

checkAdmins();