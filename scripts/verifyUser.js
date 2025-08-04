require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function verifyUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'jwttest@gmail.com' });
    if (user) {
      user.isEmailVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();
      console.log('User verified successfully:', user.email);
    } else {
      console.log('User not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyUser();