const bcrypt = require('bcrypt');
const User = require('../models/User');

// Build a projection that hides sensitive fields
const SAFE_PROJECTION = '-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires -refreshToken -refreshTokenExpires';

// Helper: build query from filters
function buildUserQuery(queryParams = {}) {
  const { role, status, search, category } = queryParams;
  const query = {};

  if (role) {
    query.role = role;
  }
  if (status) {
    query.status = status;
  }
  // category applies to suppliers: supplierDetails.category
  if (category) {
    query['supplierDetails.category'] = category;
  }
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { 'supplierDetails.contactPerson': { $regex: search, $options: 'i' } },
      { 'supplierDetails.category': { $regex: search, $options: 'i' } },
    ];
  }

  return query;
}

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      role = 'user',
      username,
      address,
      status = 'active',
      provider = 'local',
      password,
      supplierDetails,
    } = req.body;

    // Basic validation
    if (!fullName || !email || !phone) {
      return res.status(400).json({ error: 'Full name, email, and phone are required' });
    }

    // Uniqueness checks
    const existing = await User.findOne({ $or: [ { email }, ...(username ? [{ username }] : []) ] });
    if (existing) {
      const field = existing.email === email ? 'Email' : 'Username';
      return res.status(400).json({ error: `${field} already exists` });
    }

    const isAdminCreating = req.user && (req.user.role === 'admin' || req.user.role === 'Admin');

    const userDoc = new User({
      fullName,
      email,
      phone,
      role,
      username,
      address,
      status,
      provider,
      // If an admin is creating a local user (with password), mark as verified by default
      // or honor explicit isEmailVerified flag in request body
      isEmailVerified: typeof req.body.isEmailVerified === 'boolean'
        ? req.body.isEmailVerified
        : (isAdminCreating && provider === 'local')
    });

    // Handle password for local users
    if (provider === 'local') {
      if (!password) {
        return res.status(400).json({ error: 'Password is required for local provider' });
      }
      const hashed = await bcrypt.hash(password, 10);
      userDoc.password = hashed;
    }

    // Attach supplier details if provided
    if (role === 'supplier' && supplierDetails) {
      userDoc.supplierDetails = {
        contactPerson: supplierDetails.contactPerson,
        category: supplierDetails.category,
        paymentTerms: supplierDetails.paymentTerms,
        notes: supplierDetails.notes,
        totalOrders: supplierDetails.totalOrders || 0,
        totalSpent: supplierDetails.totalSpent || 0,
        rating: supplierDetails.rating || 0,
        lastOrderDate: supplierDetails.lastOrderDate || null,
      };
    }

    await userDoc.save();

    const safeUser = await User.findById(userDoc._id).select(SAFE_PROJECTION);

    res.status(201).json({ message: 'User created successfully', user: safeUser });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = buildUserQuery(req.query);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select(SAFE_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select(SAFE_PROJECTION);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Do not allow changing these via this endpoint
    delete updates.password;
    delete updates.refreshToken;
    delete updates.refreshTokenExpires;
    delete updates.otp;
    delete updates.otpExpires;

    // If supplierDetails present, map to nested fields to ensure validators run
    if (updates.supplierDetails) {
      const sd = updates.supplierDetails;
      updates['supplierDetails.contactPerson'] = sd.contactPerson;
      updates['supplierDetails.category'] = sd.category;
      updates['supplierDetails.paymentTerms'] = sd.paymentTerms;
      updates['supplierDetails.notes'] = sd.notes;
      updates['supplierDetails.totalOrders'] = sd.totalOrders;
      updates['supplierDetails.totalSpent'] = sd.totalSpent;
      updates['supplierDetails.rating'] = sd.rating;
      updates['supplierDetails.lastOrderDate'] = sd.lastOrderDate;
      delete updates.supplierDetails;
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .select(SAFE_PROJECTION);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    if (permanent === 'true') {
      const result = await User.findByIdAndDelete(id);
      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ message: 'User permanently deleted' });
    }

    const user = await User.findByIdAndUpdate(id, { status: 'inactive' }, { new: true }).select(SAFE_PROJECTION);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// PATCH /api/users/:id/toggle-status
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select(SAFE_PROJECTION + ' status');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    user.status = newStatus;
    await user.save();

    const safeUser = await User.findById(id).select(SAFE_PROJECTION);

    res.json({ message: 'Status updated', status: newStatus, user: safeUser });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// GET /api/users/search
exports.searchUsers = async (req, res) => {
  try {
    const query = buildUserQuery(req.query);

    const users = await User.find(query)
      .select(SAFE_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};