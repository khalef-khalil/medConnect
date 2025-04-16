const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const { verifyToken: verifyJwt } = require('../services/auth.service');

/**
 * Middleware to verify JWT token
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Auth failed: No token or invalid format in request from ${req.ip} to ${req.originalUrl}`);
      return res.status(401).json({ 
        message: 'Access denied. No token provided.',
        details: 'Authorization header missing or not in Bearer format'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    let decoded;
    try {
      decoded = verifyJwt(token);
    } catch (tokenError) {
      logger.warn(`Token verification failed: ${tokenError.message} for request to ${req.originalUrl}`);
      
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token.', 
          details: tokenError.message 
        });
      }
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired.',
          details: 'Your login session has expired, please login again' 
        });
      }
      
      throw tokenError; // Re-throw unexpected errors
    }
    
    // Check if user exists and is active
    const params = {
      TableName: TABLES.USERS,
      Key: { userId: decoded.userId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      logger.warn(`Auth failed: User ${decoded.userId} not found in database for request to ${req.originalUrl}`);
      return res.status(401).json({ 
        message: 'Invalid token: User not found.',
        details: 'The user associated with this token no longer exists'
      });
    }

    if (!result.Item.isActive) {
      logger.warn(`Auth failed: Account for user ${decoded.userId} is disabled for request to ${req.originalUrl}`);
      return res.status(403).json({ 
        message: 'Account is disabled. Please contact support.',
        details: 'Your account has been deactivated'
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error(`Error in verifyToken middleware for path ${req.originalUrl}:`, error);
    return res.status(500).json({ 
      message: 'Internal server error.',
      details: 'An unexpected error occurred while authenticating your request'
    });
  }
}; 