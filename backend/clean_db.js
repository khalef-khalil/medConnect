const AWS = require('aws-sdk');
const { TABLES } = require('./src/config/aws');

// Configure AWS SDK
const awsConfig = {
  region: process.env.AWS_REGION || 'eu-north-1'
};

// Apply AWS configuration
AWS.config.update(awsConfig);

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const dynamoDBClient = new AWS.DynamoDB();

/**
 * Truncate a DynamoDB table by scanning and deleting all items
 */
const truncateTable = async (tableName) => {
  console.log(`Truncating table: ${tableName}`);
  
  try {
    // Scan all items in the table
    const scanResult = await dynamoDB.scan({
      TableName: tableName
    }).promise();
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log(`Found ${scanResult.Items.length} items to delete in ${tableName}`);
      
      // Delete each item
      const deletePromises = scanResult.Items.map(item => {
        // Determine the primary key for this item
        let key = {};
        
        // Predefined keys for our tables
        if (tableName === TABLES.USERS) {
          key = { userId: item.userId };
        } else if (tableName === TABLES.APPOINTMENTS) {
          key = { appointmentId: item.appointmentId };
        } else if (tableName === TABLES.MESSAGES) {
          key = { messageId: item.messageId };
        } else if (tableName === TABLES.PAYMENTS) {
          key = { paymentId: item.paymentId };
        }
        
        return dynamoDB.delete({
          TableName: tableName,
          Key: key
        }).promise();
      });
      
      await Promise.all(deletePromises);
      console.log(`Successfully deleted all items from ${tableName}`);
    } else {
      console.log(`No items found in ${tableName}`);
    }
  } catch (error) {
    console.error(`Error truncating table ${tableName}:`, error);
  }
};

/**
 * Clean all DynamoDB tables
 */
const cleanDatabase = async () => {
  try {
    console.log('Starting database cleanup...');
    
    // Truncate all tables
    await truncateTable(TABLES.USERS);
    await truncateTable(TABLES.APPOINTMENTS);
    await truncateTable(TABLES.MESSAGES);
    await truncateTable(TABLES.PAYMENTS);
    
    console.log('Database cleanup complete!');
  } catch (error) {
    console.error('Error cleaning database:', error);
  }
};

// Run cleanup
cleanDatabase()
  .then(() => {
    console.log('Database reset complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during database reset:', error);
    process.exit(1);
  }); 