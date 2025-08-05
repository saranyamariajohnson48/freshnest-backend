// Simple in-memory rate limiter for login attempts
class RateLimiter {
  constructor() {
    this.attempts = new Map(); // Store attempts by IP
    this.maxAttempts = 5; // Max attempts per window
    this.windowMs = 15 * 60 * 1000; // 15 minutes
    this.blockDuration = 30 * 60 * 1000; // 30 minutes block
  }

  // Clean up old entries
  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.attempts.entries()) {
      if (now - data.firstAttempt > this.windowMs && !data.blocked) {
        this.attempts.delete(ip);
      } else if (data.blocked && now - data.blockedAt > this.blockDuration) {
        this.attempts.delete(ip);
      }
    }
  }

  // Check if IP is rate limited
  isRateLimited(ip) {
    this.cleanup();
    
    const attemptData = this.attempts.get(ip);
    if (!attemptData) return false;

    // Check if currently blocked
    if (attemptData.blocked) {
      const timeLeft = this.blockDuration - (Date.now() - attemptData.blockedAt);
      if (timeLeft > 0) {
        return {
          blocked: true,
          timeLeft: Math.ceil(timeLeft / 1000 / 60), // minutes
          message: `Too many login attempts. Try again in ${Math.ceil(timeLeft / 1000 / 60)} minutes.`
        };
      } else {
        // Block period expired, reset
        this.attempts.delete(ip);
        return false;
      }
    }

    return false;
  }

  // Record a failed attempt
  recordFailedAttempt(ip) {
    this.cleanup();
    
    const now = Date.now();
    const attemptData = this.attempts.get(ip);

    if (!attemptData) {
      // First attempt
      this.attempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false
      });
    } else {
      // Subsequent attempt
      attemptData.count++;
      attemptData.lastAttempt = now;

      // Check if should be blocked
      if (attemptData.count >= this.maxAttempts) {
        attemptData.blocked = true;
        attemptData.blockedAt = now;
        console.log(`🚫 IP ${ip} blocked after ${attemptData.count} failed login attempts`);
      }

      this.attempts.set(ip, attemptData);
    }
  }

  // Record a successful attempt (reset counter)
  recordSuccessfulAttempt(ip) {
    this.attempts.delete(ip);
  }

  // Get remaining attempts
  getRemainingAttempts(ip) {
    const attemptData = this.attempts.get(ip);
    if (!attemptData || attemptData.blocked) return 0;
    return Math.max(0, this.maxAttempts - attemptData.count);
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Middleware function
const loginRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  
  const rateLimitResult = rateLimiter.isRateLimited(ip);
  
  if (rateLimitResult) {
    console.log(`🚫 Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: rateLimitResult.message,
      code: 'RATE_LIMIT_EXCEEDED',
      timeLeft: rateLimitResult.timeLeft
    });
  }

  // Add rate limiter to request for use in controller
  req.rateLimiter = rateLimiter;
  req.clientIp = ip;
  
  next();
};

module.exports = {
  loginRateLimit,
  rateLimiter
};