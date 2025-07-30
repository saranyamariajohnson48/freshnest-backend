const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");

dotenv.config();
const app = express();
app.use(cors());

// Allow requests from frontend

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);


// Connect to MongoDB and Start Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`Server started on port ${PORT}`)
    );
  })
  .catch((err) => console.error(err)); 