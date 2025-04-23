const AWS = require('aws-sdk');
const { logger } = require('../utils/logger');

// Configure AWS SDK
// Priority: Environment variables > .env file > default values
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};

// Add credentials from environment variables (or .env file)
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  logger.info('Using AWS credentials from environment variables');
} else {
  logger.warn('AWS credentials not found in environment variables. AWS operations may fail if AWS CLI is not configured.');
}

// Apply AWS configuration
AWS.config.update(awsConfig);

// Create DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Create S3 client
const s3 = new AWS.S3();

// Initialize DynamoDB tables
const TABLES = {
  USERS: process.env.DYNAMODB_USER_TABLE || 'medconnect_users',
  APPOINTMENTS: process.env.DYNAMODB_APPOINTMENT_TABLE || 'medconnect_appointments',
  MESSAGES: process.env.DYNAMODB_CHAT_TABLE || 'medconnect_messages',
  PAYMENTS: process.env.DYNAMODB_PAYMENT_TABLE || 'medconnect_payments',
  ENCRYPTION_KEYS: process.env.DYNAMODB_ENCRYPTION_KEYS_TABLE || 'medconnect_encryption_keys',
  DOCTOR_SCHEDULES: process.env.DYNAMODB_DOCTOR_SCHEDULES_TABLE || 'medconnect_doctor_schedules'
};

// Initialize S3 bucket configuration
const S3_CONFIG = {
  BUCKET: process.env.S3_BUCKET_NAME || 'medconnect-files',
  PREFIXES: {
    RECORDINGS: process.env.S3_VIDEO_RECORDINGS_PREFIX || 'recordings/',
    DOCUMENTS: process.env.S3_MEDICAL_DOCUMENTS_PREFIX || 'documents/',
    PROFILES: process.env.S3_PROFILE_IMAGES_PREFIX || 'profiles/'
  }
};

// Helper function to check if tables exist and create them if they don't
const initializeDynamoDB = async () => {
  try {
    const dynamoDBClient = new AWS.DynamoDB();
    
    // Check and create Users table
    await ensureTableExists(dynamoDBClient, {
      TableName: TABLES.USERS,
      KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    });
    
    // Check and create Appointments table
    await ensureTableExists(dynamoDBClient, {
      TableName: TABLES.APPOINTMENTS,
      KeySchema: [{ AttributeName: 'appointmentId', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'appointmentId', AttributeType: 'S' },
        { AttributeName: 'patientId', AttributeType: 'S' },
        { AttributeName: 'doctorId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'PatientIndex',
          KeySchema: [{ AttributeName: 'patientId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        },
        {
          IndexName: 'DoctorIndex',
          KeySchema: [{ AttributeName: 'doctorId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    });
    
    // Check and create Messages table
    await ensureTableExists(dynamoDBClient, {
      TableName: TABLES.MESSAGES,
      KeySchema: [{ AttributeName: 'messageId', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'messageId', AttributeType: 'S' },
        { AttributeName: 'conversationId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ConversationIndex',
          KeySchema: [
            { AttributeName: 'conversationId', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    });
    
    // Check and create Payments table
    await ensureTableExists(dynamoDBClient, {
      TableName: TABLES.PAYMENTS,
      KeySchema: [{ AttributeName: 'paymentId', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'paymentId', AttributeType: 'S' },
        { AttributeName: 'appointmentId', AttributeType: 'S' },
        { AttributeName: 'userId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'AppointmentIndex',
          KeySchema: [{ AttributeName: 'appointmentId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        },
        {
          IndexName: 'UserIndex',
          KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    });
    
    // Check and create Encryption Keys table
    await ensureTableExists(dynamoDBClient, {
      TableName: TABLES.ENCRYPTION_KEYS,
      KeySchema: [{ AttributeName: 'keyId', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'keyId', AttributeType: 'S' },
        { AttributeName: 'conversationId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ConversationKeyIndex',
          KeySchema: [{ AttributeName: 'conversationId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    });
    
    // Check and create Doctor Schedules table
    await ensureTableExists(dynamoDBClient, {
      TableName: TABLES.DOCTOR_SCHEDULES,
      KeySchema: [
        { AttributeName: 'scheduleId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'scheduleId', AttributeType: 'S' },
        { AttributeName: 'doctorId', AttributeType: 'S' },
        { AttributeName: 'dayOfWeek', AttributeType: 'N' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'DoctorDayIndex',
          KeySchema: [
            { AttributeName: 'doctorId', KeyType: 'HASH' },
            { AttributeName: 'dayOfWeek', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    });
    
    logger.info('DynamoDB tables initialized successfully');
  } catch (error) {
    logger.error('Error initializing DynamoDB tables:', error);
    throw error;
  }
};

// Helper function to check if a table exists and create it if it doesn't
const ensureTableExists = async (dynamoDBClient, tableParams) => {
  try {
    await dynamoDBClient.describeTable({ TableName: tableParams.TableName }).promise();
    logger.info(`Table ${tableParams.TableName} already exists`);
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      logger.info(`Creating table ${tableParams.TableName}...`);
      await dynamoDBClient.createTable(tableParams).promise();
      logger.info(`Table ${tableParams.TableName} created successfully`);
    } else {
      logger.error(`Error checking table ${tableParams.TableName}:`, error);
      throw error;
    }
  }
};

// Initialize S3 bucket if it doesn't exist
const initializeS3 = async () => {
  try {
    // Check if bucket exists
    await s3.headBucket({ Bucket: S3_CONFIG.BUCKET }).promise();
    logger.info(`S3 bucket ${S3_CONFIG.BUCKET} already exists`);
  } catch (error) {
    if (error.code === 'NotFound' || error.code === 'NoSuchBucket') {
      logger.info(`Creating S3 bucket ${S3_CONFIG.BUCKET}...`);
      await s3.createBucket({ 
        Bucket: S3_CONFIG.BUCKET,
        ACL: 'private'
      }).promise();
      logger.info(`S3 bucket ${S3_CONFIG.BUCKET} created successfully`);
      
      // Set bucket policy for private access
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PrivateAccess',
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${S3_CONFIG.BUCKET}/*`,
            Condition: {
              StringNotEquals: {
                'aws:PrincipalArn': 'arn:aws:iam::*:role/medconnect-app-role'
              }
            }
          }
        ]
      };
      
      await s3.putBucketPolicy({
        Bucket: S3_CONFIG.BUCKET,
        Policy: JSON.stringify(bucketPolicy)
      }).promise();
      
      // Enable encryption
      await s3.putBucketEncryption({
        Bucket: S3_CONFIG.BUCKET,
        ServerSideEncryptionConfiguration: {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256'
              }
            }
          ]
        }
      }).promise();
    } else {
      logger.error(`Error checking S3 bucket ${S3_CONFIG.BUCKET}:`, error);
      throw error;
    }
  }
};

// Export AWS clients and configurations
module.exports = {
  dynamoDB,
  s3,
  TABLES,
  S3_CONFIG,
  initializeDynamoDB,
  initializeS3
}; 