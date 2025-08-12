const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const staffRoutes = require("./routes/staffRoutes");
const leaveRoutes = require("./routes/leaveRoutes");

dotenv.config();
const app = express();

// Trust proxy for accurate IP addresses (needed for rate limiting)
app.set('trust proxy', true);

// Configure CORS with more specific options
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['set-cookie'],
  maxAge: 600 // Cache preflight requests for 10 minutes
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint - should be before other routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/leave", leaveRoutes);


// Connect to MongoDB Atlas and Start Server
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000, // Timeout after 10s for Atlas
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
  })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`🚀 Server started on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB Atlas connection error:', err.message);
    process.exit(1);
  }); 