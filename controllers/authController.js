const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendOTPEmail, sendPasswordResetEmail } = require("../services/emailService");
const { 
  generateTokenPair, 
  verifyRefreshToken, 
  generateSecureToken,
  getTokenExpirationDate 
} = require("../utils/jwt");

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
    console.log("=== LOGIN REQUEST ===");
    console.log("Request body:", req.body);
    console.log("Email:", email);
    console.log("Password provided:", !!password);
    
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        details: { email: !email, password: !password }
      });
    }
    
    if (!email || !password) {
      console.log("Missing credentials - Email or password not provided");
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await User.findOne({ email });
    console.log("User found:", !!user);
    
    if (!user) {
      console.log("User not found with email:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      console.log("Invalid password for user:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        error: "Please verify your email address before logging in",
        emailNotVerified: true 
      });
    }
    
    // Generate JWT tokens
    let tokens;
    try {
      tokens = generateTokenPair(user);
      if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
        throw new Error('Failed to generate authentication tokens');
      }
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return res.status(500).json({ error: 'Authentication failed' });
    }
    
    // Save refresh token to database
    try {
      user.refreshToken = tokens.refreshToken;
      user.refreshTokenExpires = getTokenExpirationDate(process.env.JWT_REFRESH_EXPIRE || '7d');
      await user.save();
    } catch (saveError) {
      console.error('Error saving refresh token:', saveError);
      return res.status(500).json({ error: 'Failed to complete authentication' });
    }
    
    // Prepare user data (exclude sensitive fields)
    const { password: _, otp, otpExpires, refreshToken, ...userData } = user.toObject();
    
    res.json({ 
      message: "Login successful", 
      user: userData,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: "Bearer"
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

// Refresh Token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    console.log("=== REFRESH TOKEN REQUEST ===");
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: "Refresh token required",
        code: "REFRESH_TOKEN_MISSING"
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: refreshToken,
      refreshTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({ 
        error: "Invalid or expired refresh token",
        code: "REFRESH_TOKEN_INVALID"
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);
    
    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpires = getTokenExpirationDate(process.env.JWT_REFRESH_EXPIRE || '7d');
    await user.save();

    res.json({
      message: "Token refreshed successfully",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: "Bearer"
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(401).json({ 
      error: "Invalid refresh token",
      code: "REFRESH_TOKEN_INVALID"
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    console.log("=== LOGOUT REQUEST ===");
    
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (userId) {
      // Clear refresh token from database
      await User.findByIdAndUpdate(userId, {
        $unset: { 
          refreshToken: 1,
          refreshTokenExpires: 1
        }
      });
    } else if (refreshToken) {
      // If no authenticated user but refresh token provided, clear it
      await User.findOneAndUpdate(
        { refreshToken },
        {
          $unset: { 
            refreshToken: 1,
            refreshTokenExpires: 1
          }
        }
      );
    }

    res.json({ 
      message: "Logged out successfully",
      success: true
    });

  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get Current User Profile
exports.getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const { password, refreshToken, otp, otpExpires, ...userData } = req.user.toObject();
    
    res.json({
      message: "Profile retrieved successfully",
      user: userData
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
