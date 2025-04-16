const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const { notifyScheduleUpdate } = require('../services/notification.service');

/**
 * Get all schedules for a specific doctor
 */
exports.getDoctorSchedules = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const params = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      IndexName: 'DoctorDayIndex',
      KeyConditionExpression: 'doctorId = :doctorId',
      ExpressionAttributeValues: {
        ':doctorId': doctorId
      }
    };

    const result = await dynamoDB.query(params).promise();
    
    res.status(200).json({ 
      schedules: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    logger.error('Error in getDoctorSchedules function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new doctor schedule
 */
exports.createSchedule = async (req, res) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime, slotDuration } = req.body;
    const { userId, role } = req.user;

    if (!doctorId || dayOfWeek === undefined || !startTime || !endTime || !slotDuration) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' });
    }

    // Validate times
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ message: 'Times must be in format HH:MM' });
    }

    // Validate slot duration
    if (slotDuration <= 0) {
      return res.status(400).json({ message: 'Slot duration must be positive' });
    }

    // Check if the doctor exists
    const doctorParams = {
      TableName: TABLES.USERS,
      Key: { userId: doctorId }
    };

    const doctorResult = await dynamoDB.get(doctorParams).promise();
    
    if (!doctorResult.Item) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (doctorResult.Item.role !== 'doctor') {
      return res.status(400).json({ message: 'The specified user is not a doctor' });
    }

    // Check if user has permission (admin or the doctor themselves)
    if (role !== 'admin' && userId !== doctorId) {
      return res.status(403).json({ message: 'You do not have permission to manage this doctor\'s schedule' });
    }

    // Check if schedule already exists for this doctor and day
    const existingParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      IndexName: 'DoctorDayIndex',
      KeyConditionExpression: 'doctorId = :doctorId AND dayOfWeek = :dayOfWeek',
      ExpressionAttributeValues: {
        ':doctorId': doctorId,
        ':dayOfWeek': dayOfWeek
      }
    };

    const existingResult = await dynamoDB.query(existingParams).promise();
    
    if (existingResult.Items && existingResult.Items.length > 0) {
      return res.status(409).json({ 
        message: 'A schedule already exists for this doctor on this day',
        schedule: existingResult.Items[0]
      });
    }

    // Create the schedule
    const scheduleId = uuidv4();
    const newSchedule = {
      scheduleId,
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDB.put({
      TableName: TABLES.DOCTOR_SCHEDULES,
      Item: newSchedule
    }).promise();

    res.status(201).json({ 
      message: 'Schedule created successfully',
      schedule: newSchedule 
    });
  } catch (error) {
    logger.error('Error in createSchedule function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a doctor's schedule
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { startTime, endTime, slotDuration } = req.body;
    const { userId, role } = req.user;

    // Validate at least one field to update
    if (!startTime && !endTime && !slotDuration) {
      return res.status(400).json({ message: 'At least one field to update is required' });
    }

    // Get the existing schedule
    const getParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId }
    };
    
    const scheduleResult = await dynamoDB.get(getParams).promise();
    
    if (!scheduleResult.Item) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const schedule = scheduleResult.Item;
    
    // Check if user has permission (admin or the doctor themselves)
    if (role !== 'admin' && userId !== schedule.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to update this schedule' });
    }

    // Validate times if provided
    if (startTime || endTime) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (startTime && !timeRegex.test(startTime)) {
        return res.status(400).json({ message: 'Start time must be in format HH:MM' });
      }
      
      if (endTime && !timeRegex.test(endTime)) {
        return res.status(400).json({ message: 'End time must be in format HH:MM' });
      }
    }

    // Build update expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };
    
    if (startTime) {
      updateExpression += ', startTime = :startTime';
      expressionAttributeValues[':startTime'] = startTime;
    }
    
    if (endTime) {
      updateExpression += ', endTime = :endTime';
      expressionAttributeValues[':endTime'] = endTime;
    }
    
    if (slotDuration) {
      updateExpression += ', slotDuration = :slotDuration';
      expressionAttributeValues[':slotDuration'] = slotDuration;
    }
    
    // Update the schedule
    const updateParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    
    const updateResult = await dynamoDB.update(updateParams).promise();
    
    res.status(200).json({ 
      message: 'Schedule updated successfully',
      schedule: updateResult.Attributes 
    });
  } catch (error) {
    logger.error('Error in updateSchedule function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a doctor's schedule
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId, role } = req.user;

    // Get the existing schedule
    const getParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId }
    };
    
    const scheduleResult = await dynamoDB.get(getParams).promise();
    
    if (!scheduleResult.Item) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    const schedule = scheduleResult.Item;
    
    // Check if user has permission (admin or the doctor themselves)
    if (role !== 'admin' && userId !== schedule.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to delete this schedule' });
    }

    // Delete the schedule
    const deleteParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId }
    };
    
    await dynamoDB.delete(deleteParams).promise();
    
    // Send notification about the schedule deletion
    await notifyScheduleUpdate(schedule.doctorId, schedule, 'deleted');
    
    res.status(200).json({ 
      message: 'Schedule deleted successfully',
      scheduleId 
    });
  } catch (error) {
    logger.error('Error in deleteSchedule function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 