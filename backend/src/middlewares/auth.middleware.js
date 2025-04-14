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
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = verifyJwt(token);
    
    // Check if user exists and is active
    const params = {
      TableName: TABLES.USERS,
      Key: { userId: decoded.userId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(401).json({ message: 'Invalid token: User not found.' });
    }

    if (!result.Item.isActive) {
      return res.status(403).json({ message: 'Account is disabled. Please contact support.' });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    
    logger.error('Error in verifyToken middleware:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}; 