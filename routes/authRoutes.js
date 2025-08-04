const express = require("express");
const router = express.Router();
const { 
  signup, 
  login, 
  msg, 
  getAllUsers, 
  getRetailers, 
  getRegularUsers,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getProfile,
  googleSignIn
} = require("../controllers/authController");

const { authenticateToken, adminOnly, optionalAuth } = require("../middleware/auth");

// Public routes (no authentication required)
router.post("/signup", signup);
router.post("/login", login);
router.post("/google-signin", googleSignIn);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/msg", msg);

// JWT routes
router.post("/refresh-token", refreshToken);
router.post("/logout", optionalAuth, logout);

// Protected routes (authentication required)
router.get("/profile", authenticateToken, getProfile);

// Admin routes (protected)
router.get("/admin/users", adminOnly, getAllUsers);
router.get("/admin/retailers", adminOnly, getRetailers);
router.get("/admin/regular-users", adminOnly, getRegularUsers);

module.exports = router;   
