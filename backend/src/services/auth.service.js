const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'medconnect-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User information to include in token
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  try {
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Error verifying JWT token:', error);
    throw error;
  }
};

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw error;
  }
};

/**
 * Compare password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - Whether passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw error;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword
}; 