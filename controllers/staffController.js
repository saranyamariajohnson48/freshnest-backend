const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { sendStaffWelcomeEmail } = require("../services/emailService");

// Generate random password
function generateRandomPassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Generate employee ID
function generateEmployeeId() {
  const prefix = "EMP";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

// Create new staff member
exports.createStaff = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      role = "staff",
      username,
      address,
      joiningDate,
      salary,
      shift,
      permissions = [],
      password: providedPassword
    } = req.body;

    console.log("Creating staff member:", req.body);
    console.log("Username provided:", username);
    console.log("Username after processing:", username && username.trim() !== '' ? username.trim() : undefined);

    // Validate required fields
    if (!fullName || !email || !phone) {
      return res.status(400).json({
        error: "Full name, email, and phone are required"
      });
    }

    // Check if user already exists
    const queryConditions = [{ email }];
    
    // Only check username if it's provided and not empty
    if (username && username.trim() !== '') {
      queryConditions.push({ username: username.trim() });
    }
    
    console.log("Query conditions:", queryConditions);
    
    const existingUser = await User.findOne({ 
      $or: queryConditions
    });

    console.log("Existing user found:", existingUser ? {
      id: existingUser._id,
      email: existingUser.email,
      username: existingUser.username,
      role: existingUser.role
    } : null);

    if (existingUser) {
      const errorMessage = existingUser.email === email ? "Email already exists" : "Username already exists";
      console.log("Returning error:", errorMessage);
      return res.status(400).json({
        error: errorMessage
      });
    }

    // Generate password if not provided
    const password = providedPassword || generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate employee ID
    const employeeId = generateEmployeeId();

    // Create staff member
    const staffMember = new User({
      fullName,
      email,
      phone,
      password: hashedPassword,
      role: "staff",
      username: username && username.trim() !== '' ? username.trim() : undefined,
      address,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      salary: salary ? parseFloat(salary) : null,
      shift,
      permissions,
      employeeId,
      isEmailVerified: true, // Staff accounts are pre-verified
      status: "active"
    });

    await staffMember.save();

    // Send welcome email with credentials
    try {
      await sendStaffWelcomeEmail(email, {
        fullName,
        username: username || email,
        password,
        employeeId
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the request if email fails
    }

    // Return staff member without password
    const staffResponse = staffMember.toObject();
    delete staffResponse.password;
    delete staffResponse.otp;
    delete staffResponse.otpExpires;
    delete staffResponse.resetPasswordToken;
    delete staffResponse.resetPasswordExpires;
    delete staffResponse.refreshToken;
    delete staffResponse.refreshTokenExpires;

    res.status(201).json({
      message: "Staff member created successfully",
      staff: staffResponse,
      credentials: {
        username: username || email,
        password, // Include password in response for admin to share
        employeeId
      }
    });

  } catch (error) {
    console.error("Create staff error:", error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'employeeId' ? 'Employee ID' : 
                       field === 'username' ? 'Username' : 
                       field === 'email' ? 'Email' : field;
      
      console.error(`Duplicate ${fieldName} error:`, error.keyValue);
      
      return res.status(400).json({
        error: `${fieldName} already exists`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        error: `Validation error: ${validationErrors.join(', ')}`
      });
    }
    
    console.error("Unexpected error creating staff:", error);
    res.status(500).json({
      error: "Failed to create staff member"
    });
  }
};

// Get all staff members
exports.getAllStaff = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, shift, search } = req.query;
    
    // Build query
    const query = { role: "staff" };
    
    if (status) {
      query.status = status;
    }
    
    if (shift) {
      query.shift = shift;
    }
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const staff = await User.find(query)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      staff,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get staff error:", error);
    res.status(500).json({
      error: "Failed to fetch staff members"
    });
  }
};

// Get staff member by ID
exports.getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const staff = await User.findOne({ _id: id, role: "staff" })
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires');

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found"
      });
    }

    res.json({ staff });

  } catch (error) {
    console.error("Get staff by ID error:", error);
    res.status(500).json({
      error: "Failed to fetch staff member"
    });
  }
};

// Update staff member
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.role;
    delete updates.employeeId;
    delete updates.otp;
    delete updates.otpExpires;
    delete updates.resetPasswordToken;
    delete updates.resetPasswordExpires;
    delete updates.refreshToken;
    delete updates.refreshTokenExpires;

    // Convert salary to number if provided
    if (updates.salary) {
      updates.salary = parseFloat(updates.salary);
    }

    // Convert joiningDate to Date if provided
    if (updates.joiningDate) {
      updates.joiningDate = new Date(updates.joiningDate);
    }

    const staff = await User.findOneAndUpdate(
      { _id: id, role: "staff" },
      updates,
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires');

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found"
      });
    }

    res.json({
      message: "Staff member updated successfully",
      staff
    });

  } catch (error) {
    console.error("Update staff error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    res.status(500).json({
      error: "Failed to update staff member"
    });
  }
};

// Delete staff member (soft delete by setting status to inactive)
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Permanent deletion
      const staff = await User.findOneAndDelete({ _id: id, role: "staff" });
      
      if (!staff) {
        return res.status(404).json({
          error: "Staff member not found"
        });
      }

      res.json({
        message: "Staff member permanently deleted"
      });
    } else {
      // Soft delete - set status to inactive
      const staff = await User.findOneAndUpdate(
        { _id: id, role: "staff" },
        { status: "inactive" },
        { new: true }
      ).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires');

      if (!staff) {
        return res.status(404).json({
          error: "Staff member not found"
        });
      }

      res.json({
        message: "Staff member deactivated successfully",
        staff
      });
    }

  } catch (error) {
    console.error("Delete staff error:", error);
    res.status(500).json({
      error: "Failed to delete staff member"
    });
  }
};

// Reset staff password
exports.resetStaffPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password: newPassword } = req.body;

    // Generate password if not provided
    const password = newPassword || generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await User.findOneAndUpdate(
      { _id: id, role: "staff" },
      { password: hashedPassword },
      { new: true }
    ).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires');

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found"
      });
    }

    res.json({
      message: "Password reset successfully",
      newPassword: password // Return new password for admin to share
    });

  } catch (error) {
    console.error("Reset staff password error:", error);
    res.status(500).json({
      error: "Failed to reset password"
    });
  }
};

// Get staff statistics
exports.getStaffStats = async (req, res) => {
  try {
    const totalStaff = await User.countDocuments({ role: "staff" });
    const activeStaff = await User.countDocuments({ role: "staff", status: "active" });
    const inactiveStaff = await User.countDocuments({ role: "staff", status: "inactive" });
    
    // Get staff by shift
    const shiftStats = await User.aggregate([
      { $match: { role: "staff", status: "active" } },
      { $group: { _id: "$shift", count: { $sum: 1 } } }
    ]);

    // Recent joinings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJoinings = await User.countDocuments({
      role: "staff",
      joiningDate: { $gte: thirtyDaysAgo }
    });

    res.json({
      totalStaff,
      activeStaff,
      inactiveStaff,
      recentJoinings,
      shiftDistribution: shiftStats.reduce((acc, item) => {
        acc[item._id || 'unassigned'] = item.count;
        return acc;
      }, {})
    });

  } catch (error) {
    console.error("Get staff stats error:", error);
    res.status(500).json({
      error: "Failed to fetch staff statistics"
    });
  }
};

// Generate QR code for staff member
exports.generateStaffQR = async (req, res) => {
  try {
    const { id } = req.params;
    
    const staff = await User.findOne({ _id: id, role: "staff" })
      .select('fullName email employeeId phone');

    if (!staff) {
      return res.status(404).json({
        error: "Staff member not found"
      });
    }

    // Create QR code data
    const qrData = {
      employeeId: staff.employeeId,
      name: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      type: "staff_id",
      generatedAt: new Date().toISOString()
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    res.json({
      message: "QR code generated successfully",
      qrCode: qrCodeDataURL,
      data: qrData,
      staff: {
        id: staff._id,
        fullName: staff.fullName,
        employeeId: staff.employeeId
      }
    });

  } catch (error) {
    console.error("Generate QR code error:", error);
    res.status(500).json({
      error: "Failed to generate QR code"
    });
  }
};

// Export staff data
exports.exportStaffData = async (req, res) => {
  try {
    const { format = 'csv', status, shift } = req.query;
    
    // Build query
    const query = { role: "staff" };
    
    if (status) {
      query.status = status;
    }
    
    if (shift) {
      query.shift = shift;
    }

    const staff = await User.find(query)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Employee ID',
        'Full Name',
        'Email',
        'Phone',
        'Shift',
        'Salary',
        'Status',
        'Joining Date',
        'Created At'
      ];

      const csvRows = staff.map(member => [
        member.employeeId || '',
        member.fullName || '',
        member.email || '',
        member.phone || '',
        member.shift || '',
        member.salary || '',
        member.status || '',
        member.joiningDate ? new Date(member.joiningDate).toLocaleDateString() : '',
        new Date(member.createdAt).toLocaleDateString()
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="staff_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        message: "Staff data exported successfully",
        data: staff,
        exportedAt: new Date().toISOString(),
        totalRecords: staff.length
      });
    }

  } catch (error) {
    console.error("Export staff data error:", error);
    res.status(500).json({
      error: "Failed to export staff data"
    });
  }
};