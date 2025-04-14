const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const { notifyAppointment } = require('../services/notification.service');

/**
 * Get all appointments for the logged-in user based on their role
 */
exports.getAppointments = async (req, res) => {
  try {
    const { userId, role } = req.user;
    let params = {};

    // Different query parameters based on user role
    if (role === 'patient') {
      params = {
        TableName: TABLES.APPOINTMENTS,
        IndexName: 'PatientIndex',
        KeyConditionExpression: 'patientId = :patientId',
        ExpressionAttributeValues: {
          ':patientId': userId
        }
      };
    } else if (role === 'doctor') {
      params = {
        TableName: TABLES.APPOINTMENTS,
        IndexName: 'DoctorIndex',
        KeyConditionExpression: 'doctorId = :doctorId',
        ExpressionAttributeValues: {
          ':doctorId': userId
        }
      };
    } else if (role === 'secretary' || role === 'admin') {
      // Admin and secretary can see all appointments
      params = {
        TableName: TABLES.APPOINTMENTS
      };
    } else {
      return res.status(403).json({ message: 'Unauthorized role for this action' });
    }

    const result = await dynamoDB.query(params).promise();
    
    res.status(200).json({ 
      appointments: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    logger.error('Error in getAppointments function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a specific appointment by ID
 */
exports.getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    const params = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user has permission to view this appointment
    const appointment = result.Item;
    if (role !== 'admin' && role !== 'secretary' &&
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to view this appointment' });
    }

    res.status(200).json({ appointment: result.Item });
  } catch (error) {
    logger.error('Error in getAppointmentById function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new appointment
 */
exports.createAppointment = async (req, res) => {
  try {
    const { 
      patientId, 
      doctorId, 
      startTime, 
      endTime, 
      appointmentType,
      notes
    } = req.body;

    // Validate required fields
    if (!patientId || !doctorId || !startTime || !endTime || !appointmentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse dates to ensure they are valid
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Check for overlapping appointments for the doctor
    const doctorParams = {
      TableName: TABLES.APPOINTMENTS,
      IndexName: 'DoctorIndex',
      KeyConditionExpression: 'doctorId = :doctorId',
      ExpressionAttributeValues: {
        ':doctorId': doctorId
      }
    };

    const doctorAppointments = await dynamoDB.query(doctorParams).promise();

    // Check for overlap
    const overlap = doctorAppointments.Items?.some(appointment => {
      const appointmentStart = new Date(appointment.startTime);
      const appointmentEnd = new Date(appointment.endTime);
      
      return (startDate < appointmentEnd && endDate > appointmentStart);
    });

    if (overlap) {
      return res.status(409).json({ message: 'Appointment overlaps with existing doctor schedule' });
    }

    // Create new appointment
    const appointmentId = uuidv4();
    const newAppointment = {
      appointmentId,
      patientId,
      doctorId,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      appointmentType,
      notes: notes || '',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDB.put({
      TableName: TABLES.APPOINTMENTS,
      Item: newAppointment
    }).promise();

    // Send notifications to both patient and doctor
    try {
      await notifyAppointment(patientId, newAppointment, 'created');
      await notifyAppointment(doctorId, newAppointment, 'created');
    } catch (notifyError) {
      // Log but don't fail if notifications fail
      logger.error('Error sending appointment notifications:', notifyError);
    }

    res.status(201).json({ 
      message: 'Appointment created successfully',
      appointment: newAppointment 
    });
  } catch (error) {
    logger.error('Error in createAppointment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update an existing appointment
 */
exports.updateAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }
    
    const { userId, role } = req.user;
    const { 
      startTime, 
      endTime, 
      appointmentType, 
      notes, 
      status 
    } = req.body;

    // Check if the appointment exists
    try {
      const getParams = {
        TableName: TABLES.APPOINTMENTS,
        Key: { appointmentId }
      };

      const appointmentResult = await dynamoDB.get(getParams).promise();
      
      if (!appointmentResult.Item) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      const appointment = appointmentResult.Item;

      // Check permissions
      if (role !== 'admin' && role !== 'secretary' && 
          userId !== appointment.doctorId) {
        return res.status(403).json({ message: 'You do not have permission to update this appointment' });
      }

      // Building update expression with proper handling of reserved words
      let updateExpression = 'SET #updatedAt = :updatedAt';
      
      // Initialize expression attributes
      const expressionAttributeNames = {
        '#updatedAt': 'updatedAt'
      };
      
      const expressionAttributeValues = {
        ':updatedAt': new Date().toISOString()
      };

      if (startTime) {
        const startDate = new Date(startTime);
        if (isNaN(startDate)) {
          return res.status(400).json({ message: 'Invalid start time format' });
        }
        updateExpression += ', #startTime = :startTime';
        expressionAttributeNames['#startTime'] = 'startTime';
        expressionAttributeValues[':startTime'] = startDate.toISOString();
      }

      if (endTime) {
        const endDate = new Date(endTime);
        if (isNaN(endDate)) {
          return res.status(400).json({ message: 'Invalid end time format' });
        }
        updateExpression += ', #endTime = :endTime';
        expressionAttributeNames['#endTime'] = 'endTime';
        expressionAttributeValues[':endTime'] = endDate.toISOString();
      }

      if (appointmentType) {
        updateExpression += ', #appointmentType = :appointmentType';
        expressionAttributeNames['#appointmentType'] = 'appointmentType';
        expressionAttributeValues[':appointmentType'] = appointmentType;
      }

      if (notes !== undefined) {
        updateExpression += ', #notes = :notes';
        expressionAttributeNames['#notes'] = 'notes';
        expressionAttributeValues[':notes'] = notes;
      }

      if (status) {
        const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ message: 'Invalid status value' });
        }
        updateExpression += ', #status = :status';
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = status;
      }

      // If only updatedAt is being updated, no need to proceed
      if (Object.keys(expressionAttributeValues).length === 1) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      // Update the appointment with properly configured parameters
      const updateParams = {
        TableName: TABLES.APPOINTMENTS,
        Key: { appointmentId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      };

      const updateResult = await dynamoDB.update(updateParams).promise();
      const updatedAppointment = updateResult.Attributes;

      // Send notifications to patient and doctor
      try {
        await notifyAppointment(updatedAppointment.patientId, updatedAppointment, 'updated');
        await notifyAppointment(updatedAppointment.doctorId, updatedAppointment, 'updated');
      } catch (notifyError) {
        // Log but don't fail if notifications fail
        logger.error('Error sending appointment update notifications:', notifyError);
      }

      return res.status(200).json({
        message: 'Appointment updated successfully',
        appointment: updatedAppointment
      });
    } catch (dbError) {
      logger.error('DynamoDB error in updateAppointment:', dbError);
      return res.status(500).json({ message: 'Error updating appointment' });
    }
  } catch (error) {
    logger.error('Error in updateAppointment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete an appointment
 */
exports.deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    // Check if the appointment exists
    const getParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(getParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Check permissions
    if (role !== 'admin' && role !== 'secretary' && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to delete this appointment' });
    }

    // Save appointment info for notifications before deletion
    const { patientId, doctorId } = appointment;

    // Delete the appointment
    const deleteParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    await dynamoDB.delete(deleteParams).promise();

    // Send notifications to patient and doctor about cancellation
    try {
      await notifyAppointment(patientId, appointment, 'cancelled');
      await notifyAppointment(doctorId, appointment, 'cancelled');
    } catch (notifyError) {
      // Log but don't fail if notifications fail
      logger.error('Error sending appointment cancellation notifications:', notifyError);
    }

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteAppointment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get doctor's availability (free time slots)
 */
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Get all doctor appointments within the time range
    const params = {
      TableName: TABLES.APPOINTMENTS,
      IndexName: 'DoctorIndex',
      KeyConditionExpression: 'doctorId = :doctorId',
      FilterExpression: '(startTime BETWEEN :start AND :end) OR (endTime BETWEEN :start AND :end) OR (:start BETWEEN startTime AND endTime)',
      ExpressionAttributeValues: {
        ':doctorId': doctorId,
        ':start': start.toISOString(),
        ':end': end.toISOString()
      }
    };

    const result = await dynamoDB.query(params).promise();
    
    // Create a list of busy time slots
    const busySlots = result.Items?.map(appointment => ({
      start: new Date(appointment.startTime),
      end: new Date(appointment.endTime)
    })) || [];

    // Assume doctor works from 9 AM to 5 PM, 7 days a week
    // This is a simplification - in a real system, you'd have a doctor's schedule table
    const availableSlots = [];
    const currentDate = new Date(start);
    const workDayStart = 9; // 9 AM
    const workDayEnd = 17;  // 5 PM
    const slotDuration = 30; // 30 minutes per slot

    // Loop through each day in the range
    while (currentDate < end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(workDayStart, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(workDayEnd, 0, 0, 0);

      // If the day is already past, move to next day
      if (dayEnd < new Date()) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Loop through each 30-minute slot in the day
      let slotStart = dayStart;
      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + slotDuration);

        // Check if this slot overlaps with any busy slots
        const isOverlapping = busySlots.some(busy => 
          (slotStart < busy.end && slotEnd > busy.start)
        );

        if (!isOverlapping) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString()
          });
        }

        slotStart = new Date(slotEnd);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({ 
      availableSlots,
      count: availableSlots.length
    });
  } catch (error) {
    logger.error('Error in getDoctorAvailability function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 