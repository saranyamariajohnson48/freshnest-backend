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
  resetPassword
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/msg", msg);

// Admin routes
router.get("/admin/users", getAllUsers);
router.get("/admin/retailers", getRetailers);
router.get("/admin/regular-users", getRegularUsers);

module.exports = router;   
