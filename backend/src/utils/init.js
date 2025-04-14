const { initializeDynamoDB, initializeS3 } = require('../config/aws');
const { logger } = require('./logger');

/**
 * Initialize all required resources for the application
 */
const initializeResources = async () => {
  try {
    logger.info('Initializing application resources...');
    
    // Initialize DynamoDB tables
    await initializeDynamoDB();
    
    // Initialize S3 bucket
    await initializeS3();
    
    logger.info('All resources initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize resources:', error);
    // Don't throw here to allow the application to start even if initialization fails
    // This is helpful in development/testing environments
  }
};

module.exports = {
  initializeResources
}; 