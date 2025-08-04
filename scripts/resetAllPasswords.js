require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function resetAllPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const users = [
      { email: 'jwttest@gmail.com', password: 'User@123', role: 'user' },
      { email: 'shervinthomas2026@mca.ajce.in', password: 'User@123', role: 'user' },
      { email: 'saranyamariajohnson2026@mca.ajce.in', password: 'Admin@123', role: 'Admin' }
    ];
    
    for (const userData of users) {
      const user = await User.findOne({ email: userData.email });
      if (user) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user.password = hashedPassword;
        await user.save();
        console.log(`✅ Password reset for ${userData.email} (${userData.role})`);
        console.log(`   Password: ${userData.password}`);
      } else {
        console.log(`❌ User not found: ${userData.email}`);
      }
    }
    
    console.log('\n=== LOGIN CREDENTIALS ===');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

resetAllPasswords();