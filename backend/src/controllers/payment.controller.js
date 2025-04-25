const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');

// Update the AWS config with a new PAYMENTS table
if (!TABLES.PAYMENTS) {
  TABLES.PAYMENTS = 'DocConnectPayments';
}

/**
 * Process a new payment for an appointment
 */
exports.processPayment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      appointmentId, 
      amount, 
      cardNumber, 
      cardExpiry, 
      cardCvc, 
      cardholderName,
      billingAddress
    } = req.body;

    // Validate required fields
    if (!appointmentId || !amount || !cardNumber || !cardExpiry || !cardCvc || !cardholderName) {
      return res.status(400).json({ message: 'Missing required payment fields' });
    }

    // Get appointment details to verify it exists and belongs to the user
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };
    
    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;
    
    // Verify the user is the patient making the payment
    if (appointment.patientId !== userId) {
      return res.status(403).json({ message: 'You can only make payments for your own appointments' });
    }

    // Check if payment already exists for this appointment
    const existingPaymentParams = {
      TableName: TABLES.PAYMENTS,
      IndexName: 'AppointmentIndex',
      KeyConditionExpression: 'appointmentId = :appointmentId',
      ExpressionAttributeValues: {
        ':appointmentId': appointmentId
      }
    };
    
    const existingPayments = await dynamoDB.query(existingPaymentParams).promise();
    
    if (existingPayments.Items && existingPayments.Items.length > 0) {
      return res.status(409).json({ 
        message: 'Payment already exists for this appointment',
        payment: existingPayments.Items[0]
      });
    }

    // In a real system, we would integrate with a payment processor here
    // For this simulation, we'll just create a payment record
    
    // Mask card number for storage (keep only last 4 digits)
    const maskedCardNumber = cardNumber.slice(-4).padStart(cardNumber.length, '*');
    
    const paymentId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const payment = {
      paymentId,
      appointmentId,
      patientId: userId,
      doctorId: appointment.doctorId,
      amount,
      currency: 'USD',
      paymentMethod: {
        type: 'creditCard',
        lastFour: cardNumber.slice(-4),
        expiryMonth: cardExpiry.split('/')[0],
        expiryYear: cardExpiry.split('/')[1],
        cardholderName
      },
      billingAddress,
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store payment details
    const params = {
      TableName: TABLES.PAYMENTS,
      Item: payment,
      ConditionExpression: 'attribute_not_exists(paymentId)'
    };

    await dynamoDB.put(params).promise();

    // Update appointment status to 'confirmed' now that payment is complete
    const updateAppointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'SET paymentStatus = :paymentStatus, status = :status, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':paymentStatus': 'paid',
        ':status': 'confirmed',
        ':updatedAt': timestamp
      }
    };

    await dynamoDB.update(updateAppointmentParams).promise();

    // Return payment confirmation without sensitive data
    const { paymentMethod, ...paymentWithoutSensitiveData } = payment;
    
    res.status(201).json({
      message: 'Payment processed successfully',
      payment: {
        ...paymentWithoutSensitiveData,
        paymentMethod: {
          type: paymentMethod.type,
          lastFour: paymentMethod.lastFour,
          cardholderName: paymentMethod.cardholderName
        }
      }
    });
  } catch (error) {
    logger.error('Error in processPayment function:', error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
};

/**
 * Process a payment without an existing appointment
 * This is used when the payment is made before the appointment is created
 */
exports.newProcessPayment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { 
      amount, 
      cardNumber, 
      cardExpiry, 
      cardCvc, 
      cardholderName,
      billingAddress,
      doctorId // This might be passed from frontend
    } = req.body;

    // Validate required fields
    if (!amount || !cardNumber || !cardExpiry || !cardCvc || !cardholderName) {
      return res.status(400).json({ message: 'Missing required payment fields' });
    }

    // In a real system, we would integrate with a payment processor here
    // For this simulation, we'll just validate the card info and return success
    
    // Mask card number for storage (keep only last 4 digits)
    const maskedCardNumber = cardNumber.slice(-4).padStart(cardNumber.length, '*');
    
    const paymentId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Check if doctorId is valid (if provided)
    let validDoctorId = 'pending';
    if (doctorId && doctorId !== 'pending') {
      try {
        const doctorParams = {
          TableName: TABLES.USERS,
          Key: { userId: doctorId }
        };
        
        const doctorResult = await dynamoDB.get(doctorParams).promise();
        if (doctorResult.Item && doctorResult.Item.role === 'doctor') {
          validDoctorId = doctorId;
        }
      } catch (error) {
        logger.warn(`Invalid doctorId provided: ${doctorId}, using 'pending' instead`);
      }
    }
    
    const payment = {
      paymentId,
      patientId: userId,
      doctorId: validDoctorId,
      amount,
      currency: 'USD',
      paymentMethod: {
        type: 'creditCard',
        lastFour: cardNumber.slice(-4),
        expiryMonth: cardExpiry.split('/')[0],
        expiryYear: cardExpiry.split('/')[1],
        cardholderName
      },
      billingAddress,
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store payment in database
    const params = {
      TableName: TABLES.PAYMENTS,
      Item: payment,
      ConditionExpression: 'attribute_not_exists(paymentId)'
    };

    await dynamoDB.put(params).promise();

    // Return payment confirmation without sensitive data
    const { paymentMethod, ...paymentWithoutSensitiveData } = payment;
    
    res.status(201).json({
      message: 'Payment processed successfully',
      payment: {
        ...paymentWithoutSensitiveData,
        paymentMethod: {
          type: paymentMethod.type,
          lastFour: paymentMethod.lastFour,
          cardholderName: paymentMethod.cardholderName
        }
      }
    });
  } catch (error) {
    logger.error('Error in newProcessPayment function:', error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
};

/**
 * Get payment history for the logged-in user
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const { userId, role } = req.user;
    let items = [];
    
    try {
      // Try to use indexes first if they exist
      let params = {};
      
      if (role === 'patient') {
        params = {
          TableName: TABLES.PAYMENTS,
          IndexName: 'PatientIndex',
          KeyConditionExpression: 'patientId = :patientId',
          ExpressionAttributeValues: {
            ':patientId': userId
          }
        };
        
        const result = await dynamoDB.query(params).promise();
        items = result.Items || [];
      } else if (role === 'doctor') {
        params = {
          TableName: TABLES.PAYMENTS,
          IndexName: 'DoctorIndex',
          KeyConditionExpression: 'doctorId = :doctorId',
          ExpressionAttributeValues: {
            ':doctorId': userId
          }
        };
        
        const result = await dynamoDB.query(params).promise();
        items = result.Items || [];
      } else if (role === 'admin') {
        // Admin can see all payments
        params = {
          TableName: TABLES.PAYMENTS
        };
        
        const result = await dynamoDB.scan(params).promise();
        items = result.Items || [];
      } else {
        return res.status(403).json({ message: 'Unauthorized role for this action' });
      }
    } catch (error) {
      // If index doesn't exist, fall back to scan operation
      if (error.message && (error.message.includes('specified index') || error.code === 'ValidationException')) {
        logger.warn('Index not found, falling back to scan operation for payments');
        
        const scanParams = {
          TableName: TABLES.PAYMENTS,
          FilterExpression: role === 'patient' ? 'patientId = :userId' :
                           role === 'doctor' ? 'doctorId = :userId' : '',
          ExpressionAttributeValues: role !== 'admin' ? { ':userId': userId } : undefined
        };
        
        // Remove FilterExpression for admin role
        if (role === 'admin') {
          delete scanParams.FilterExpression;
          delete scanParams.ExpressionAttributeValues;
        }
        
        const scanResult = await dynamoDB.scan(scanParams).promise();
        items = scanResult.Items || [];
      } else {
        // Rethrow if it's not an index-related error
        throw error;
      }
    }
    
    // Add appointment details to each payment
    const paymentsWithDetails = await Promise.all(items.map(async (payment) => {
      try {
        // Check if payment has an appointmentId (some direct payments might not have one)
        if (payment.appointmentId) {
          // Get appointment details
          const appointmentParams = {
            TableName: TABLES.APPOINTMENTS,
            Key: { appointmentId: payment.appointmentId }
          };
          
          const appointmentResult = await dynamoDB.get(appointmentParams).promise();
          
          if (appointmentResult.Item) {
            payment.appointmentDetails = appointmentResult.Item;
          }
        }
        
        // Always get the other party's details regardless of appointment existence
        // Get patient details if doctor is viewing, or doctor details if patient is viewing
        const userIdToFetch = role === 'doctor' ? payment.patientId : payment.doctorId;
        
        if (userIdToFetch && userIdToFetch !== 'pending') {
          const userParams = {
            TableName: TABLES.USERS,
            Key: { userId: userIdToFetch }
          };
          
          try {
            const userResult = await dynamoDB.get(userParams).promise();
            
            if (userResult.Item) {
              const { password, ...userWithoutPassword } = userResult.Item;
              payment.userDetails = userWithoutPassword;
            }
          } catch (userError) {
            logger.error(`Error fetching user details for ${userIdToFetch}:`, userError);
            // Don't fail the whole request if user details can't be fetched
          }
        }
        
        return payment;
      } catch (error) {
        logger.error('Error fetching payment details:', error);
        return payment;
      }
    }));
    
    res.status(200).json({ 
      payments: paymentsWithDetails,
      count: paymentsWithDetails.length
    });
  } catch (error) {
    logger.error('Error in getPaymentHistory function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a specific payment by ID
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
    
    // Check if user has permission to view this payment
    if (role !== 'admin' && 
        userId !== payment.patientId && 
        userId !== payment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to view this payment' });
    }

    // Get appointment details
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId: payment.appointmentId }
    };
    
    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (appointmentResult.Item) {
      payment.appointmentDetails = appointmentResult.Item;
    }

    res.status(200).json(payment);
  } catch (error) {
    logger.error('Error in getPaymentById function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all payments for a specific appointment
 */
exports.getPaymentsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    // Get appointment to check permissions
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };
    
    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;
    
    // Check if user has permission to view payments for this appointment
    if (role !== 'admin' && 
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to view payments for this appointment' });
    }

    // Get payments for the appointment
    const paymentParams = {
      TableName: TABLES.PAYMENTS,
      IndexName: 'AppointmentIndex',
      KeyConditionExpression: 'appointmentId = :appointmentId',
      ExpressionAttributeValues: {
        ':appointmentId': appointmentId
      }
    };
    
    const paymentResults = await dynamoDB.query(paymentParams).promise();
    
    res.status(200).json({ 
      payments: paymentResults.Items || [],
      count: paymentResults.Count || 0
    });
  } catch (error) {
    logger.error('Error in getPaymentsByAppointment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update payment status (admin only)
 */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get the current payment
    const getParams = {
      TableName: TABLES.PAYMENTS,
      Key: { paymentId }
    };
    
    const result = await dynamoDB.get(getParams).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update payment status
    const updateParams = {
      TableName: TABLES.PAYMENTS,
      Key: { paymentId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const updateResult = await dynamoDB.update(updateParams).promise();
    
    // Update appointment payment status if needed
    if (status === 'completed' || status === 'refunded') {
      const appointmentUpdateParams = {
        TableName: TABLES.APPOINTMENTS,
        Key: { appointmentId: result.Item.appointmentId },
        UpdateExpression: 'SET paymentStatus = :paymentStatus, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':paymentStatus': status === 'completed' ? 'paid' : 'refunded',
          ':updatedAt': new Date().toISOString()
        }
      };
      
      await dynamoDB.update(appointmentUpdateParams).promise();
    }

    res.status(200).json({ 
      message: 'Payment status updated successfully',
      payment: updateResult.Attributes
    });
  } catch (error) {
    logger.error('Error in updatePaymentStatus function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Refund a payment (admin only)
 */
exports.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    // Get the current payment
    const getParams = {
      TableName: TABLES.PAYMENTS,
      Key: { paymentId }
    };
    
    const result = await dynamoDB.get(getParams).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = result.Item;
    
    if (payment.status === 'refunded') {
      return res.status(400).json({ message: 'Payment has already been refunded' });
    }

    // In a real system, we would call the payment processor's refund API here
    
    // Update payment status
    const timestamp = new Date().toISOString();
    const updateParams = {
      TableName: TABLES.PAYMENTS,
      Key: { paymentId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, refundReason = :refundReason, refundedAt = :refundedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'refunded',
        ':updatedAt': timestamp,
        ':refundReason': reason || 'No reason provided',
        ':refundedAt': timestamp
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const updateResult = await dynamoDB.update(updateParams).promise();
    
    // Update appointment payment status
    const appointmentUpdateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId: payment.appointmentId },
      UpdateExpression: 'SET paymentStatus = :paymentStatus, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':paymentStatus': 'refunded',
        ':updatedAt': timestamp
      }
    };
    
    await dynamoDB.update(appointmentUpdateParams).promise();

    res.status(200).json({ 
      message: 'Payment refunded successfully',
      payment: updateResult.Attributes
    });
  } catch (error) {
    logger.error('Error in refundPayment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 