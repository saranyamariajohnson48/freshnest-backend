const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: function() {
      return !this.clerkId && !this.provider; // Phone not required for OAuth users
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.clerkId && this.provider === 'local'; // Password not required for OAuth users
    },
  },
  clerkId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
  },
  profileImage: {
    type: String,
  },
  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },
  role: {
    type: String,
    enum:["retailer","user","admin","staff"],
    default:"user",
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpires: {
    type: Date,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  refreshToken: {
    type: String,
  },
  refreshTokenExpires: {
    type: Date,
  },
  // Staff-specific fields
  username: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
  },
  address: {
    type: String,
  },
  joiningDate: {
    type: Date,
  },
  salary: {
    type: Number,
  },
  shift: {
    type: String,
    enum: ["morning", "evening", "night", "flexible"],
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  permissions: {
    type: [String],
    default: [],
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Leave balance for staff
  leaveBalance: {
    casual: {
      type: Number,
      default: 12
    },
    sick: {
      type: Number,
      default: 10
    },
    annual: {
      type: Number,
      default: 15
    }
  },
}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);
