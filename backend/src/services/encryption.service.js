const crypto = require('crypto');
const { logger } = require('../utils/logger');

// In a real-world implementation, this would be a more sophisticated key management system
// For simplicity, we're using server-side encryption with per-conversation keys
// In true end-to-end encryption, keys would be generated client-side and not accessible by the server

/**
 * Generate a new encryption key for a conversation
 * @returns {Object} Object containing key and iv for encryption
 */
exports.generateEncryptionKey = () => {
  try {
    // Generate a random encryption key and initialization vector
    const key = crypto.randomBytes(32).toString('hex'); // 256-bit key
    const iv = crypto.randomBytes(16).toString('hex');  // 128-bit IV
    
    return { key, iv };
  } catch (error) {
    logger.error('Error generating encryption key:', error);
    throw error;
  }
};

/**
 * Encrypt a message using AES-256-CBC
 * @param {string} message - Plain text message to encrypt
 * @param {Object} encryptionParams - Object containing key and iv for encryption
 * @returns {string} - Encrypted message as base64 string
 */
exports.encryptMessage = (message, encryptionParams) => {
  try {
    if (!message) return '';
    
    const { key, iv } = encryptionParams;
    
    // Convert hex to binary
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    
    // Encrypt the message
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  } catch (error) {
    logger.error('Error encrypting message:', error);
    throw error;
  }
};

/**
 * Decrypt a message using AES-256-CBC
 * @param {string} encryptedMessage - Encrypted message as base64 string
 * @param {Object} encryptionParams - Object containing key and iv for encryption
 * @returns {string} - Decrypted plain text message
 */
exports.decryptMessage = (encryptedMessage, encryptionParams) => {
  try {
    if (!encryptedMessage) return '';
    
    const { key, iv } = encryptionParams;
    
    // Convert hex to binary
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    
    // Decrypt the message
    let decrypted = decipher.update(encryptedMessage, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Error decrypting message:', error);
    throw error;
  }
};

/**
 * Generate a hash of the conversation ID and participants for key retrieval
 * @param {string} conversationId - ID of the conversation
 * @param {Array} participantIds - Array of participant IDs
 * @returns {string} - Hash for key lookup
 */
exports.generateConversationKeyHash = (conversationId, participantIds) => {
  try {
    // Sort participants for consistent hash regardless of order
    const sortedParticipants = [...participantIds].sort();
    const hashData = `${conversationId}-${sortedParticipants.join('-')}`;
    
    // Create a SHA-256 hash
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');
    
    return hash;
  } catch (error) {
    logger.error('Error generating conversation key hash:', error);
    throw error;
  }
}; 