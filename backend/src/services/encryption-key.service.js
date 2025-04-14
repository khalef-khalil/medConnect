const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const encryptionService = require('./encryption.service');

/**
 * Store encryption key for a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {Array} participantIds - Array of participant user IDs
 * @param {Object} encryptionKey - Encryption key and IV to store
 * @returns {string} - Key ID
 */
exports.storeEncryptionKey = async (conversationId, participantIds, encryptionKey) => {
  try {
    const keyId = uuidv4();
    const keyHash = encryptionService.generateConversationKeyHash(conversationId, participantIds);
    
    const keyItem = {
      keyId,
      conversationId,
      keyHash,
      encryptionKey: JSON.stringify(encryptionKey), // Store the key and IV
      participantIds,
      createdAt: new Date().toISOString()
    };
    
    await dynamoDB.put({
      TableName: TABLES.ENCRYPTION_KEYS,
      Item: keyItem
    }).promise();
    
    return keyId;
  } catch (error) {
    logger.error('Error storing encryption key:', error);
    throw error;
  }
};

/**
 * Get encryption key for a conversation
 * @param {string} conversationId - ID of the conversation
 * @returns {Object} - Encryption key object containing key and IV
 */
exports.getEncryptionKey = async (conversationId) => {
  try {
    // Query for the encryption key by conversation ID
    const params = {
      TableName: TABLES.ENCRYPTION_KEYS,
      IndexName: 'ConversationKeyIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      },
      Limit: 1 // We only need the most recent key for each conversation
    };
    
    const result = await dynamoDB.query(params).promise();
    
    if (!result.Items || result.Items.length === 0) {
      logger.error(`No encryption key found for conversation: ${conversationId}`);
      return null;
    }
    
    // Parse the key and return it
    const keyItem = result.Items[0];
    return JSON.parse(keyItem.encryptionKey);
  } catch (error) {
    logger.error(`Error retrieving encryption key for conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Check if an encryption key exists for a conversation, if not, create one
 * @param {string} conversationId - ID of the conversation
 * @param {Array} participantIds - Array of participant user IDs
 * @returns {Object} - Encryption key object containing key and IV
 */
exports.ensureEncryptionKey = async (conversationId, participantIds) => {
  try {
    // Try to get an existing key
    const existingKey = await this.getEncryptionKey(conversationId);
    
    if (existingKey) {
      return existingKey;
    }
    
    // No key exists, create a new one
    const newKey = encryptionService.generateEncryptionKey();
    await this.storeEncryptionKey(conversationId, participantIds, newKey);
    
    return newKey;
  } catch (error) {
    logger.error(`Error ensuring encryption key for conversation ${conversationId}:`, error);
    throw error;
  }
}; 