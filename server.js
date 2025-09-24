const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const staffRoutes = require("./routes/staffRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const productRoutes = require("./routes/productRoutes");
const usersRoutes = require("./routes/usersRoutes");
const orderRoutes = require("./routes/orderRoutes");
const chatRoutes = require("./routes/chatRoutes");
const taskRoutes = require("./routes/taskRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const supplierApplicationRoutes = require("./routes/supplierApplicationRoutes");
const salaryRoutes = require("./routes/salaryRoutes");

dotenv.config();
const app = express();

// Trust proxy for accurate IP addresses (needed for rate limiting)
app.set('trust proxy', true);

// Configure CORS with more specific options
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://freshnest-frontend.vercel.app" // ✅ fixed, no slash
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow curl/postman
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false); // ❌ don't throw error
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    exposedHeaders: ["set-cookie"]
  })
);



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
app.use("/api/products", productRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/supplier-applications", supplierApplicationRoutes);
app.use("/api/salary", salaryRoutes);


// Connect to MongoDB Atlas with retry and start server
const startServer = () => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
};

const connectWithRetry = async (retries = 10, delayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      console.log('✅ Connected to MongoDB Atlas successfully');
      return true;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, err.message);
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${Math.round(delayMs / 1000)}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error('❌ Exhausted all retries. Continuing to run server without DB connection.');
        return false;
      }
    }
  }
};

(async () => {
  await connectWithRetry();
  startServer();
})();