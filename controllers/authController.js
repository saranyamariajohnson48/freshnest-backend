const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendOTPEmail, sendPasswordResetEmail } = require("../services/emailService");

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Signup
exports.signup = async (req, res) => {
  const { fullName, phone, email, password, role } = req.body;
  try {
    console.log("Signup request:", req.body);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const user = new User({ 
      fullName, 
      phone, 
      email, 
      password: hashedPassword,
      role: role || "user",
      otp,
      otpExpires,
      isEmailVerified: false
    });
    
    await user.save();
    
    // Send OTP email
    await sendOTPEmail(email, otp, role || "user");
    
    res.status(201).json({ 
      message: "Signup successful! Please check your email for verification code.",
      requiresVerification: true
    });
  } catch (err) {
    console.error("Signup error:", err);
    if (err.code === 11000) {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(400).json({ error: "Signup failed" });
    }
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Login attempt for:", email);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        error: "Please verify your email address before logging in",
        emailNotVerified: true 
      });
    }
    
    const { password: _, otp, otpExpires, ...userData } = user.toObject();
    res.json({ 
      message: "Login successful", 
      user: userData,
      token: "dummy-jwt-token" // Replace with actual JWT token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.msg = async(req,res) => {
  res.status(200).json({message:"Hello World"})
}

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.getRetailers = async (req, res) => {
  try {
    const retailers = await User.find({ role: 'retailer' }, '-password');
    res.json(retailers);
  } catch (err) {
    console.error("Get retailers error:", err);
    res.status(500).json({ error: "Failed to fetch retailers" });
  }
};

exports.getRegularUsers = async (req, res) => {
  try {
    const regularUsers = await User.find({ role: 'user' }, '-password');
    res.json(regularUsers);
  } catch (err) {
    console.error("Get regular users error:", err);
    res.status(500).json({ error: "Failed to fetch regular users" });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp, userType } = req.body;
  try {
    console.log("OTP verification request:", { email, otp, userType });
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if OTP is valid and not expired
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    if (user.otpExpires < new Date()) {
      return res.status(400).json({ error: "OTP has expired" });
    }
    
    // Verify the user
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    res.json({ 
      message: "Email verified successfully!",
      success: true
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  const { email, userType } = req.body;
  try {
    console.log("Resend OTP request:", { email, userType });
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();
    
    // Send OTP email
    await sendOTPEmail(email, otp, userType);
    
    res.json({ 
      message: "OTP sent successfully!",
      success: true
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    console.log("=== FORGOT PASSWORD REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Email:", email);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found with this email address" });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();
    
    // Send password reset email
    await sendPasswordResetEmail(email, resetToken);
    
    res.json({ 
      message: "Password reset link has been sent to your email address.",
      success: true
    });
  } catch (err) {
    console.error("=== FORGOT PASSWORD ERROR ===");
    console.error("Error details:", err);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ error: "Server error" });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    console.log("Reset password request with token:", token);
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ 
      message: "Password reset successful!",
      success: true
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
