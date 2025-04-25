const AWS = require('aws-sdk');
const { TABLES } = require('../src/config/aws');

// Configure AWS
const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1'
};

// Add credentials if available
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

// Apply AWS configuration
AWS.config.update(awsConfig);

// Create DynamoDB client
const dynamoDBClient = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

// Get the payments table name
const paymentsTable = TABLES.PAYMENTS || 'medconnect_payments';

async function recreatePaymentsTable() {
  console.log(`Starting recreation of payments table: ${paymentsTable}`);
  
  try {
    // Step 1: Check if table exists and delete it
    try {
      console.log('Checking if table exists...');
      await dynamoDBClient.describeTable({ TableName: paymentsTable }).promise();
      console.log('Table exists. Deleting...');
      
      await dynamoDBClient.deleteTable({ TableName: paymentsTable }).promise();
      console.log(`Table ${paymentsTable} deleted successfully`);
      
      // Wait for table to be deleted
      console.log('Waiting for table deletion to complete...');
      await dynamoDBClient.waitFor('tableNotExists', { TableName: paymentsTable }).promise();
      console.log('Table deletion confirmed');
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        console.log(`Table ${paymentsTable} does not exist, proceeding with creation`);
      } else {
        throw error;
      }
    }
    
    // Step 2: Create the table with the correct schema
    console.log(`Creating table ${paymentsTable} with correct schema...`);
    
    const createParams = {
      TableName: paymentsTable,
      KeySchema: [{ AttributeName: 'paymentId', KeyType: 'HASH' }],
      AttributeDefinitions: [
        { AttributeName: 'paymentId', AttributeType: 'S' },
        { AttributeName: 'appointmentId', AttributeType: 'S' },
        { AttributeName: 'patientId', AttributeType: 'S' },
        { AttributeName: 'doctorId', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'AppointmentIndex',
          KeySchema: [{ AttributeName: 'appointmentId', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
        },
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
    };
    
    await dynamoDBClient.createTable(createParams).promise();
    console.log(`Table ${paymentsTable} created successfully`);
    
    // Wait for table to be active
    console.log('Waiting for table to become active...');
    await dynamoDBClient.waitFor('tableExists', { TableName: paymentsTable }).promise();
    console.log('Table is now active and ready for use');
    
    console.log('Table recreation completed successfully');
  } catch (error) {
    console.error('Error recreating table:', error);
    process.exit(1);
  }
}

// Run the function
recreatePaymentsTable().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}); 