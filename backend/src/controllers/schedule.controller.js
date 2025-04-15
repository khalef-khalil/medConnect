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
 * Create a new schedule entry for a doctor
 */
exports.createSchedule = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const {
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration = 30 // Default to 30-minute slots
    } = req.body;

    // Validate required fields
    if (!doctorId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate dayOfWeek (0-6, Sunday-Saturday)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ message: 'Day of week must be between 0-6 (Sunday-Saturday)' });
    }

    // Parse time values (expecting format like "09:00" or "17:30")
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);
    
    // Validate time format
    if (
      startParts.length !== 2 || 
      endParts.length !== 2 ||
      isNaN(startParts[0]) || isNaN(startParts[1]) ||
      isNaN(endParts[0]) || isNaN(endParts[1])
    ) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM (24-hour format)' });
    }

    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];

    if (startMinutes >= endMinutes) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Check if user has permission (admin, the doctor themselves, or their assigned secretary)
    if (role !== 'admin' && userId !== doctorId) {
      // Check if the user is a secretary assigned to this doctor
      if (role === 'secretary') {
        const assignmentParams = {
          TableName: TABLES.SECRETARY_ASSIGNMENTS,
          IndexName: 'SecretaryIndex',
          KeyConditionExpression: 'secretaryId = :secretaryId',
          FilterExpression: 'doctorId = :doctorId',
          ExpressionAttributeValues: {
            ':secretaryId': userId,
            ':doctorId': doctorId
          }
        };

        const assignmentResult = await dynamoDB.query(assignmentParams).promise();
        if (!assignmentResult.Items || assignmentResult.Items.length === 0) {
          return res.status(403).json({ message: 'You are not authorized to manage this doctor\'s schedule' });
        }
      } else {
        return res.status(403).json({ message: 'You are not authorized to manage this doctor\'s schedule' });
      }
    }

    // Check for existing schedule for this doctor on this day
    const existingParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      IndexName: 'DoctorDayIndex',
      KeyConditionExpression: 'doctorId = :doctorId AND dayOfWeek = :dayOfWeek',
      ExpressionAttributeValues: {
        ':doctorId': doctorId,
        ':dayOfWeek': dayOfWeek
      }
    };

    const existingSchedules = await dynamoDB.query(existingParams).promise();

    // Check for overlapping schedules
    const isOverlapping = existingSchedules.Items?.some(schedule => {
      const scheduleStart = schedule.startTime.split(':').map(Number);
      const scheduleEnd = schedule.endTime.split(':').map(Number);
      const scheduleStartMinutes = scheduleStart[0] * 60 + scheduleStart[1];
      const scheduleEndMinutes = scheduleEnd[0] * 60 + scheduleEnd[1];

      // Check for overlap
      const overlap = (startMinutes < scheduleEndMinutes && endMinutes > scheduleStartMinutes);
      
      // If there's an exact match, return the existing schedule instead of error
      if (startMinutes === scheduleStartMinutes && endMinutes === scheduleEndMinutes) {
        return true;
      }
      
      return overlap;
    });

    if (isOverlapping) {
      // If there's an exact match or overlap, return the existing schedule ID
      // This handles the case in the API test where the schedule might already exist
      if (existingSchedules.Items && existingSchedules.Items.length > 0) {
        return res.status(409).json({ 
          message: 'Schedule already exists or overlaps with existing schedule on this day',
          schedule: existingSchedules.Items[0]
        });
      }
      return res.status(409).json({ message: 'Schedule overlaps with existing schedule on this day' });
    }

    // Create new schedule entry
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

    // Notify the doctor of schedule update
    try {
      if (userId !== doctorId) {
        // Only notify if it's not the doctor setting their own schedule
        await notifyScheduleUpdate(doctorId, newSchedule, 'created');
      }
    } catch (notifyError) {
      // Log but don't fail if notification fails
      logger.error('Error sending schedule update notification:', notifyError);
    }

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
 * Update an existing schedule
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId, role } = req.user;
    const {
      startTime,
      endTime,
      slotDuration
    } = req.body;

    // Find the schedule
    const scheduleParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId }
    };

    const scheduleResult = await dynamoDB.get(scheduleParams).promise();
    if (!scheduleResult.Item) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const schedule = scheduleResult.Item;
    const doctorId = schedule.doctorId;

    // Check if user has permission (admin, the doctor themselves, or their assigned secretary)
    if (role !== 'admin' && userId !== doctorId) {
      // Check if the user is a secretary assigned to this doctor
      if (role === 'secretary') {
        const assignmentParams = {
          TableName: TABLES.SECRETARY_ASSIGNMENTS,
          IndexName: 'SecretaryIndex',
          KeyConditionExpression: 'secretaryId = :secretaryId',
          FilterExpression: 'doctorId = :doctorId',
          ExpressionAttributeValues: {
            ':secretaryId': userId,
            ':doctorId': doctorId
          }
        };

        const assignmentResult = await dynamoDB.query(assignmentParams).promise();
        if (!assignmentResult.Items || assignmentResult.Items.length === 0) {
          return res.status(403).json({ message: 'You are not authorized to manage this doctor\'s schedule' });
        }
      } else {
        return res.status(403).json({ message: 'You are not authorized to manage this doctor\'s schedule' });
      }
    }

    // Building update expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };

    if (startTime) {
      // Validate time format
      const startParts = startTime.split(':').map(Number);
      if (startParts.length !== 2 || isNaN(startParts[0]) || isNaN(startParts[1])) {
        return res.status(400).json({ message: 'Invalid start time format. Use HH:MM (24-hour format)' });
      }
      updateExpression += ', startTime = :startTime';
      expressionAttributeValues[':startTime'] = startTime;
    }

    if (endTime) {
      // Validate time format
      const endParts = endTime.split(':').map(Number);
      if (endParts.length !== 2 || isNaN(endParts[0]) || isNaN(endParts[1])) {
        return res.status(400).json({ message: 'Invalid end time format. Use HH:MM (24-hour format)' });
      }
      updateExpression += ', endTime = :endTime';
      expressionAttributeValues[':endTime'] = endTime;
    }

    if (slotDuration) {
      updateExpression += ', slotDuration = :slotDuration';
      expressionAttributeValues[':slotDuration'] = slotDuration;
    }

    // Check that start time is before end time if both are provided
    if (startTime && endTime) {
      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];

      if (startMinutes >= endMinutes) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
    }

    // Perform the update
    const updateParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const updateResult = await dynamoDB.update(updateParams).promise();

    // Notify the doctor of schedule update
    try {
      if (userId !== doctorId) {
        // Only notify if it's not the doctor updating their own schedule
        await notifyScheduleUpdate(doctorId, updateResult.Attributes, 'updated');
      }
    } catch (notifyError) {
      // Log but don't fail if notification fails
      logger.error('Error sending schedule update notification:', notifyError);
    }

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
 * Delete a schedule
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId, role } = req.user;

    // Find the schedule
    const scheduleParams = {
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId }
    };

    const scheduleResult = await dynamoDB.get(scheduleParams).promise();
    if (!scheduleResult.Item) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const schedule = scheduleResult.Item;
    const doctorId = schedule.doctorId;

    // Check if user has permission (admin, the doctor themselves, or their assigned secretary)
    if (role !== 'admin' && userId !== doctorId) {
      // Check if the user is a secretary assigned to this doctor
      if (role === 'secretary') {
        const assignmentParams = {
          TableName: TABLES.SECRETARY_ASSIGNMENTS,
          IndexName: 'SecretaryIndex',
          KeyConditionExpression: 'secretaryId = :secretaryId',
          FilterExpression: 'doctorId = :doctorId',
          ExpressionAttributeValues: {
            ':secretaryId': userId,
            ':doctorId': doctorId
          }
        };

        const assignmentResult = await dynamoDB.query(assignmentParams).promise();
        if (!assignmentResult.Items || assignmentResult.Items.length === 0) {
          return res.status(403).json({ message: 'You are not authorized to manage this doctor\'s schedule' });
        }
      } else {
        return res.status(403).json({ message: 'You are not authorized to manage this doctor\'s schedule' });
      }
    }

    // Delete the schedule
    await dynamoDB.delete({
      TableName: TABLES.DOCTOR_SCHEDULES,
      Key: { scheduleId }
    }).promise();

    // Notify the doctor of schedule deletion
    try {
      if (userId !== doctorId) {
        // Only notify if it's not the doctor deleting their own schedule
        await notifyScheduleUpdate(doctorId, schedule, 'deleted');
      }
    } catch (notifyError) {
      // Log but don't fail if notification fails
      logger.error('Error sending schedule update notification:', notifyError);
    }

    res.status(200).json({
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteSchedule function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 