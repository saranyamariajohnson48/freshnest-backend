const User = require("../models/User");
const bcrypt = require("bcrypt");

// Signup
exports.signup = async (req, res) => {
  const { fullName, phone, email, password, role } = req.body;
  try {
    console.log("Signup request:", req.body);
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({ 
      fullName, 
      phone, 
      email, 
      password: hashedPassword,
      role: role || "user"
    });
    
    await user.save();
    
    res.status(201).json({ 
      message: "Signup successful!"
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
    
    const { password: _, ...userData } = user.toObject();
    res.json({ message: "Login successful", user: userData });
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
