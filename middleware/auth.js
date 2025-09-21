const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');

// Authenticate JWT Token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is still verified
    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'TOKEN_INVALID'
    });
  }
};

// Authorize specific roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      
      if (user && user.isEmailVerified) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Admin only middleware
const adminOnly = [authenticateToken, authorizeRoles('admin', 'Admin')];

// Admin or Staff middleware (for product management)
const adminOrStaff = [authenticateToken, authorizeRoles('admin', 'Admin', 'staff', 'Staff')];

// Retailer or Admin middleware
const retailerOrAdmin = [authenticateToken, authorizeRoles('retailer', 'admin', 'Admin')];

// User, Retailer, or Admin middleware
const authenticatedUser = [authenticateToken, authorizeRoles('user', 'retailer', 'admin', 'Admin')];

module.exports = {
  authenticateToken,
  authorizeRoles,
  optionalAuth,
  adminOnly,
  adminOrStaff,
  retailerOrAdmin,
  authenticatedUser
};