const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const { notifyAssignment } = require('../services/notification.service');

/**
 * Get all doctor assignments for the specified secretary
 */
exports.getSecretaryAssignments = async (req, res) => {
  try {
    const { secretaryId } = req.params;
    const { userId, role } = req.user;

    // Check if user has permission
    if (role !== 'admin' && userId !== secretaryId) {
      return res.status(403).json({ message: 'You do not have permission to view these assignments' });
    }

    const params = {
      TableName: TABLES.SECRETARY_ASSIGNMENTS,
      IndexName: 'SecretaryIndex',
      KeyConditionExpression: 'secretaryId = :secretaryId',
      ExpressionAttributeValues: {
        ':secretaryId': secretaryId
      }
    };

    const result = await dynamoDB.query(params).promise();
    
    // If needed, fetch additional doctor details
    const assignments = [];
    for (const assignment of result.Items || []) {
      // Get doctor details
      const doctorParams = {
        TableName: TABLES.USERS,
        Key: { userId: assignment.doctorId }
      };
      
      const doctorResult = await dynamoDB.get(doctorParams).promise();
      
      if (doctorResult.Item) {
        const { password, ...doctorDetails } = doctorResult.Item;
        assignments.push({
          ...assignment,
          doctorDetails
        });
      } else {
        assignments.push(assignment);
      }
    }
    
    res.status(200).json({ 
      assignments: assignments,
      count: assignments.length
    });
  } catch (error) {
    logger.error('Error in getSecretaryAssignments function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all secretaries assigned to a doctor
 */
exports.getDoctorSecretaries = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { userId, role } = req.user;

    // Check if user has permission
    if (role !== 'admin' && userId !== doctorId) {
      return res.status(403).json({ message: 'You do not have permission to view these assignments' });
    }

    const params = {
      TableName: TABLES.SECRETARY_ASSIGNMENTS,
      IndexName: 'DoctorIndex',
      KeyConditionExpression: 'doctorId = :doctorId',
      ExpressionAttributeValues: {
        ':doctorId': doctorId
      }
    };

    const result = await dynamoDB.query(params).promise();
    
    // If needed, fetch additional secretary details
    const assignments = [];
    for (const assignment of result.Items || []) {
      // Get secretary details
      const secretaryParams = {
        TableName: TABLES.USERS,
        Key: { userId: assignment.secretaryId }
      };
      
      const secretaryResult = await dynamoDB.get(secretaryParams).promise();
      
      if (secretaryResult.Item) {
        const { password, ...secretaryDetails } = secretaryResult.Item;
        assignments.push({
          ...assignment,
          secretaryDetails
        });
      } else {
        assignments.push(assignment);
      }
    }
    
    res.status(200).json({ 
      assignments: assignments,
      count: assignments.length
    });
  } catch (error) {
    logger.error('Error in getDoctorSecretaries function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new secretary-doctor assignment
 */
exports.createAssignment = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { secretaryId, doctorId } = req.body;

    // Validate required fields
    if (!secretaryId || !doctorId) {
      return res.status(400).json({ message: 'Secretary ID and Doctor ID are required' });
    }

    // Only admins, the doctor themselves, or the secretary can create assignments
    if (role !== 'admin' && userId !== doctorId && userId !== secretaryId) {
      return res.status(403).json({ message: 'You do not have permission to create this assignment' });
    }

    // Check if the secretary and doctor exist and have the correct roles
    const secretaryParams = {
      TableName: TABLES.USERS,
      Key: { userId: secretaryId }
    };
    
    const doctorParams = {
      TableName: TABLES.USERS,
      Key: { userId: doctorId }
    };

    const [secretaryResult, doctorResult] = await Promise.all([
      dynamoDB.get(secretaryParams).promise(),
      dynamoDB.get(doctorParams).promise()
    ]);

    if (!secretaryResult.Item) {
      return res.status(404).json({ message: 'Secretary not found' });
    }

    if (!doctorResult.Item) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (secretaryResult.Item.role !== 'secretary') {
      return res.status(400).json({ message: 'Specified user is not a secretary' });
    }

    if (doctorResult.Item.role !== 'doctor') {
      return res.status(400).json({ message: 'Specified user is not a doctor' });
    }

    // Check if assignment already exists
    const existingParams = {
      TableName: TABLES.SECRETARY_ASSIGNMENTS,
      IndexName: 'SecretaryIndex',
      KeyConditionExpression: 'secretaryId = :secretaryId',
      FilterExpression: 'doctorId = :doctorId',
      ExpressionAttributeValues: {
        ':secretaryId': secretaryId,
        ':doctorId': doctorId
      }
    };

    const existingResult = await dynamoDB.query(existingParams).promise();
    
    if (existingResult.Items && existingResult.Items.length > 0) {
      // Return the existing assignment instead of just an error message
      // This allows the API test to continue with the existing assignment
      return res.status(409).json({ 
        message: 'Assignment already exists',
        assignment: existingResult.Items[0]
      });
    }

    // Create new assignment
    const assignmentId = uuidv4();
    const newAssignment = {
      assignmentId,
      secretaryId,
      doctorId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dynamoDB.put({
      TableName: TABLES.SECRETARY_ASSIGNMENTS,
      Item: newAssignment
    }).promise();

    // Notify both secretary and doctor
    try {
      if (userId !== secretaryId) {
        await notifyAssignment(secretaryId, newAssignment, 'created', 'secretary');
      }
      
      if (userId !== doctorId) {
        await notifyAssignment(doctorId, newAssignment, 'created', 'doctor');
      }
    } catch (notifyError) {
      // Log but don't fail if notification fails
      logger.error('Error sending assignment notifications:', notifyError);
    }

    res.status(201).json({ 
      message: 'Assignment created successfully',
      assignment: newAssignment 
    });
  } catch (error) {
    logger.error('Error in createAssignment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a secretary-doctor assignment
 */
exports.deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { userId, role } = req.user;

    // Find the assignment
    const assignmentParams = {
      TableName: TABLES.SECRETARY_ASSIGNMENTS,
      Key: { assignmentId }
    };

    const assignmentResult = await dynamoDB.get(assignmentParams).promise();
    
    if (!assignmentResult.Item) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const assignment = assignmentResult.Item;

    // Check if the user has permission to delete the assignment
    if (role !== 'admin' && 
        userId !== assignment.doctorId && 
        userId !== assignment.secretaryId) {
      return res.status(403).json({ message: 'You do not have permission to delete this assignment' });
    }

    // Delete the assignment
    await dynamoDB.delete({
      TableName: TABLES.SECRETARY_ASSIGNMENTS,
      Key: { assignmentId }
    }).promise();

    // Notify both secretary and doctor if they're not the one deleting
    try {
      if (userId !== assignment.secretaryId) {
        await notifyAssignment(assignment.secretaryId, assignment, 'deleted', 'secretary');
      }
      
      if (userId !== assignment.doctorId) {
        await notifyAssignment(assignment.doctorId, assignment, 'deleted', 'doctor');
      }
    } catch (notifyError) {
      // Log but don't fail if notification fails
      logger.error('Error sending assignment notifications:', notifyError);
    }

    res.status(200).json({
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteAssignment function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 