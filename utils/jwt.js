const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate Access Token
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
    issuer: 'freshnest-api',
    audience: 'freshnest-client'
  });
};

// Generate Refresh Token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'freshnest-api',
    audience: 'freshnest-client'
  });
};

// Verify Access Token
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'freshnest-api',
      audience: 'freshnest-client'
    });
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

// Verify Refresh Token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer: 'freshnest-api',
      audience: 'freshnest-client'
    });
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Generate Token Pair
const generateTokenPair = (user) => {
  if (!user || !user._id) {
    throw new Error('Invalid user object for token generation');
  }
  
  const payload = {
    userId: user._id.toString(), // Ensure it's a string
    email: user.email,
    role: user.role,
    fullName: user.fullName
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: user._id });

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRE || '15m'
  };
};

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Generate secure random token (for password reset, etc.)
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Calculate token expiration date
const getTokenExpirationDate = (expiresIn) => {
  const now = new Date();
  
  if (expiresIn.endsWith('m')) {
    const minutes = parseInt(expiresIn.slice(0, -1));
    return new Date(now.getTime() + minutes * 60 * 1000);
  } else if (expiresIn.endsWith('h')) {
    const hours = parseInt(expiresIn.slice(0, -1));
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  } else if (expiresIn.endsWith('d')) {
    const days = parseInt(expiresIn.slice(0, -1));
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  // Default to 15 minutes
  return new Date(now.getTime() + 15 * 60 * 1000);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  extractTokenFromHeader,
  generateSecureToken,
  getTokenExpirationDate
};