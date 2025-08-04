require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({}, 'email role isEmailVerified createdAt');
    console.log('=== ALL USERS IN DATABASE ===');
    console.log(`Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.isEmailVerified}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();