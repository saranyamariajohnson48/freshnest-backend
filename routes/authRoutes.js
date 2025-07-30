const express = require("express");
const router = express.Router();
const { 
  signup, 
  login, 
  msg, 
  getAllUsers, 
  getRetailers, 
  getRegularUsers
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.get("/msg", msg);

// Admin routes
router.get("/admin/users", getAllUsers);
router.get("/admin/retailers", getRetailers);
router.get("/admin/regular-users", getRegularUsers);

module.exports = router;   
