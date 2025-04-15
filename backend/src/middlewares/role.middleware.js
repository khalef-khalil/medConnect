const { logger } = require('../utils/logger');

/**
 * Middleware to check if user is an admin
 */
exports.isAdmin = (req, res, next) => {
  try {
    // User info comes from JWT verification middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    next();
  } catch (error) {
    logger.error('Error in isAdmin middleware:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Middleware to check if user is a doctor
 */
exports.isDoctor = (req, res, next) => {
  try {
    // User info comes from JWT verification middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Doctor role required.' });
    }

    next();
  } catch (error) {
    logger.error('Error in isDoctor middleware:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/**
 * Middleware to check if user is either the resource owner or has specified roles
 * @param {Array} allowedRoles - Array of roles that have access
 * @param {String} paramName - URL parameter name that contains the resource owner ID
 */
exports.isResourceOwnerOrHasRole = (allowedRoles, paramName) => {
  return (req, res, next) => {
    try {
      // User info comes from JWT verification middleware
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has one of the allowed roles
      const hasAllowedRole = allowedRoles.includes(req.user.role);
      
      // Check if user is the resource owner
      const resourceOwnerId = req.params[paramName];
      const isResourceOwner = req.user.userId === resourceOwnerId;

      if (!hasAllowedRole && !isResourceOwner) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (error) {
      logger.error('Error in isResourceOwnerOrHasRole middleware:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
};

/**
 * Middleware to check if user has any of the specified roles
 * @param {Array} allowedRoles - Array of roles that have access
 */
exports.hasRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // User info comes from JWT verification middleware
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has one of the allowed roles
      const hasAllowedRole = allowedRoles.includes(req.user.role);
      
      if (!hasAllowedRole) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      next();
    } catch (error) {
      logger.error('Error in hasRole middleware:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };
}; 