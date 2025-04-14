const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const { notifyPayment } = require('../services/notification.service');

/**
 * Process a payment for an appointment
 */
exports.processPayment = async (req, res) => {
  try {
    const { appointmentId, amount, paymentMethod, cardDetails } = req.body;
    const { userId, role } = req.user;

    if (!appointmentId || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify the appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Validate that the user has permission to make a payment for this appointment
    if (role !== 'admin' && role !== 'secretary' && 
        userId !== appointment.patientId) {
      return res.status(403).json({ message: 'You do not have permission to make a payment for this appointment' });
    }

    // In a real implementation, you would integrate with a payment gateway here
    // For example, Stripe, PayPal, etc.
    
    // Simulate payment processing
    const paymentId = uuidv4();
    const paymentTimestamp = Date.now();
    const paymentStatus = 'completed'; // In a real system, this would come from the payment gateway

    // Store payment record
    const paymentRecord = {
      paymentId,
      appointmentId,
      userId: appointment.patientId,
      amount,
      currency: 'USD', // Hardcoded for simplicity
      paymentMethod,
      status: paymentStatus,
      timestamp: paymentTimestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDB.put({
      TableName: TABLES.PAYMENTS,
      Item: paymentRecord
    }).promise();

    // Update appointment with payment info
    const updateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'set paymentId = :paymentId, paymentStatus = :paymentStatus, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':paymentId': paymentId,
        ':paymentStatus': paymentStatus,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    await dynamoDB.update(updateParams).promise();

    // Send payment notification to patient
    try {
      await notifyPayment(appointment.patientId, paymentRecord, 'success');
      
      // Also notify doctor of the payment
      await notifyPayment(appointment.doctorId, paymentRecord, 'success');
    } catch (notifyError) {
      // Log but don't fail if notification fails
      logger.error('Error sending payment notification:', notifyError);
    }

    // Return payment details
    res.status(200).json({ 
      message: 'Payment processed successfully',
      payment: {
        paymentId,
        appointmentId,
        amount,
        currency: 'USD',
        paymentMethod,
        status: paymentStatus,
        timestamp: new Date(paymentTimestamp).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in processPayment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get payment details by ID
 */
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { userId, role } = req.user;

    const params = {
      TableName: TABLES.PAYMENTS,
      Key: { paymentId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.Item;

    // Verify user has permission to view this payment
    if (role !== 'admin' && role !== 'secretary' && 
        userId !== payment.userId) {
      return res.status(403).json({ message: 'You do not have permission to view this payment' });
    }

    res.status(200).json({ payment });
  } catch (error) {
    logger.error('Error in getPaymentById function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get payment history for the current user or by user ID (for admin/secretary)
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { user: queryUserId } = req.query;

    let params = {};

    // Admin and secretary can view any user's payment history
    if ((role === 'admin' || role === 'secretary') && queryUserId) {
      params = {
        TableName: TABLES.PAYMENTS,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': queryUserId
        }
      };
    } else {
      // Regular users can only view their own payment history
      params = {
        TableName: TABLES.PAYMENTS,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };
    }

    const result = await dynamoDB.query(params).promise();
    
    // Sort payments by timestamp (newest first)
    const payments = result.Items?.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    ) || [];

    res.status(200).json({ 
      payments,
      count: payments.length 
    });
  } catch (error) {
    logger.error('Error in getPaymentHistory function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get payments for a specific appointment
 */
exports.getAppointmentPayments = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    // First verify the appointment exists and user has permission
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify user has permission to view payments for this appointment
    if (role !== 'admin' && role !== 'secretary' && 
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to view payments for this appointment' });
    }

    // Get payments for this appointment
    const paymentParams = {
      TableName: TABLES.PAYMENTS,
      IndexName: 'AppointmentIndex',
      KeyConditionExpression: 'appointmentId = :appointmentId',
      ExpressionAttributeValues: {
        ':appointmentId': appointmentId
      }
    };

    const result = await dynamoDB.query(paymentParams).promise();
    
    const payments = result.Items || [];

    res.status(200).json({ 
      payments,
      count: payments.length 
    });
  } catch (error) {
    logger.error('Error in getAppointmentPayments function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 