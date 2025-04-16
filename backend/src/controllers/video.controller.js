const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES, S3_CONFIG } = require('../config/aws');
const { logger } = require('../utils/logger');
const { uploadBase64File } = require('../services/file.service');
const webrtcService = require('../services/webrtc.service');

/**
 * Create a new video session for an appointment
 */
exports.createVideoSession = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { userId, role } = req.user;

    if (!appointmentId) {
      return res.status(400).json({ message: 'Appointment ID is required' });
    }

    // Verify appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify user has permission to join this appointment
    if (role !== 'admin' && 
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to access this appointment' });
    }

    // Check if there's already a session for this appointment
    if (appointment.videoSessionId) {
      // If the session already exists, return it
      return res.status(200).json({
        message: 'Video session already exists',
        session: {
          sessionId: appointment.videoSessionId,
          appointmentId,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          createdAt: appointment.videoSessionCreatedAt,
          webrtcData: appointment.webrtcData
        }
      });
    }

    // Generate session ID
    const sessionId = uuidv4();
    
    // Create WebRTC session
    const webrtcData = await webrtcService.createWebRTCSession(
      appointmentId,
      appointment.doctorId,
      appointment.patientId
    );
    
    // Update appointment with session info
    const updateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'set videoSessionId = :sessionId, videoSessionCreatedAt = :createdAt, webrtcData = :webrtcData, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':sessionId': sessionId,
        ':createdAt': new Date().toISOString(),
        ':webrtcData': webrtcData,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const updatedResult = await dynamoDB.update(updateParams).promise();
    const updatedAppointment = updatedResult.Attributes;

    // Create response with session details
    const sessionDetails = {
      sessionId,
      appointmentId,
      createdAt: updatedAppointment.videoSessionCreatedAt,
      patientId: updatedAppointment.patientId,
      doctorId: updatedAppointment.doctorId,
      webrtcData: updatedAppointment.webrtcData
    };

    res.status(201).json({
      message: 'Video session created successfully',
      session: sessionDetails
    });
  } catch (error) {
    logger.error('Error in createVideoSession function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get video session details by appointment ID
 */
exports.getVideoSession = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    // Verify appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify user has permission to access this appointment
    if (role !== 'admin' && 
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to access this appointment' });
    }

    // Check if the session exists
    if (!appointment.videoSessionId) {
      return res.status(404).json({ message: 'No video session found for this appointment' });
    }

    // Determine the user's role in this session
    let userRole = role;
    if (role !== 'admin') {
      userRole = userId === appointment.doctorId ? 'doctor' : 'patient';
    }

    // Get the participant-specific configuration
    const webrtcData = appointment.webrtcData || {};
    const participantData = webrtcData.participants?.[userRole] || {};

    // Create response with session details
    const sessionDetails = {
      sessionId: appointment.videoSessionId,
      appointmentId,
      createdAt: appointment.videoSessionCreatedAt,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      // Return only the configuration needed for this user
      webrtcConfig: {
        sessionId: webrtcData.sessionId,
        iceServers: webrtcData.iceServers,
        token: participantData.token,
        role: userRole,
        screenSharingEnabled: webrtcData.screenSharingEnabled,
        recordingEnabled: webrtcData.recordingEnabled,
        waitingRoomEnabled: webrtcData.waitingRoomEnabled
      }
    };

    res.status(200).json({ session: sessionDetails });
  } catch (error) {
    logger.error('Error in getVideoSession function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Join waiting room for video session
 */
exports.joinWaitingRoom = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    // Verify appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify user has permission to access this appointment
    if (role !== 'admin' && 
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to access this appointment' });
    }

    // Check if the session exists
    if (!appointment.videoSessionId || !appointment.webrtcData) {
      return res.status(404).json({ message: 'No video session found for this appointment' });
    }

    // Determine the user's role for this appointment
    const userRole = userId === appointment.doctorId ? 'doctor' : 'patient';
    
    // Only patients go to the waiting room
    if (userRole === 'doctor') {
      return res.status(400).json({ message: 'Doctors do not need to join the waiting room' });
    }

    // Add user to waiting room
    const waitingRoomData = await webrtcService.addToWaitingRoom(
      appointment.webrtcData.sessionId,
      userId,
      userRole
    );
    
    // Update appointment with waiting room data
    const updateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'set waitingRoomStatus = :status, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':status': {
          [userId]: waitingRoomData
        },
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    await dynamoDB.update(updateParams).promise();

    res.status(200).json({
      message: 'Joined waiting room successfully',
      waitingRoomData
    });
  } catch (error) {
    logger.error('Error in joinWaitingRoom function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Admit patient from waiting room
 */
exports.admitFromWaitingRoom = async (req, res) => {
  try {
    const { appointmentId, patientId } = req.params;
    const { userId, role } = req.user;

    // Only doctors or admins can admit patients
    if (role !== 'admin' && role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors or admins can admit patients' });
    }

    // Verify appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify doctor is assigned to this appointment
    if (role === 'doctor' && userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You are not the doctor assigned to this appointment' });
    }

    // Check if patient is in waiting room
    if (!appointment.waitingRoomStatus || !appointment.waitingRoomStatus[patientId]) {
      return res.status(404).json({ message: 'Patient is not in the waiting room' });
    }

    // Admit patient from waiting room
    const admitData = await webrtcService.admitFromWaitingRoom(
      appointment.webrtcData.sessionId,
      patientId,
      'patient'
    );
    
    // Update WebRTC data with new patient token
    const webrtcData = appointment.webrtcData;
    webrtcData.participants.patient.token = admitData.token;
    
    // IMPORTANT: Set waitingRoomEnabled to false when patient is admitted
    webrtcData.waitingRoomEnabled = false;
    
    // Add updated timestamp for detection by clients
    webrtcData.updatedAt = new Date().toISOString();
    
    // Log the update for debugging
    logger.info(`Admitting patient ${patientId} to video session - setting waitingRoomEnabled=false for appointment ${appointmentId}`);
    
    // Update appointment
    const updateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'set webrtcData = :webrtcData, waitingRoomStatus.#patientId = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#patientId': patientId
      },
      ExpressionAttributeValues: {
        ':webrtcData': webrtcData,
        ':status': admitData,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    await dynamoDB.update(updateParams).promise();

    res.status(200).json({
      message: 'Patient admitted from waiting room',
      admitData
    });
  } catch (error) {
    logger.error('Error in admitFromWaitingRoom function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Generate screen sharing configuration
 */
exports.startScreenSharing = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId, role } = req.user;

    // Verify appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify user has permission to access this appointment
    if (role !== 'admin' && 
        userId !== appointment.patientId && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to access this appointment' });
    }

    // Check if the session exists
    if (!appointment.videoSessionId || !appointment.webrtcData) {
      return res.status(404).json({ message: 'No video session found for this appointment' });
    }

    // Generate screen sharing configuration
    const screenSharingConfig = await webrtcService.generateScreenSharingConfig(
      appointment.webrtcData.sessionId,
      userId
    );
    
    // Update appointment with screen sharing information
    const updateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'set screenSharing = :screenSharing, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':screenSharing': {
          [userId]: screenSharingConfig
        },
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    await dynamoDB.update(updateParams).promise();

    res.status(200).json({
      message: 'Screen sharing configuration generated',
      screenSharingConfig
    });
  } catch (error) {
    logger.error('Error in startScreenSharing function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Save a video recording to S3
 */
exports.saveRecording = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { recording } = req.body;
    const { userId, role } = req.user;

    if (!recording) {
      return res.status(400).json({ message: 'Recording data is required' });
    }

    // Verify appointment exists
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId }
    };

    const appointmentResult = await dynamoDB.get(appointmentParams).promise();
    
    if (!appointmentResult.Item) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const appointment = appointmentResult.Item;

    // Verify user has permission to save recording for this appointment
    if (role !== 'admin' && role !== 'doctor' && 
        userId !== appointment.doctorId) {
      return res.status(403).json({ message: 'You do not have permission to save recordings for this appointment' });
    }

    // Upload recording using file service
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${appointmentId}_${timestamp}`;
    const recordingUrl = await uploadBase64File(
      recording,
      fileName,
      S3_CONFIG.PREFIXES.RECORDINGS
    );

    // Update appointment with recording info
    const updateParams = {
      TableName: TABLES.APPOINTMENTS,
      Key: { appointmentId },
      UpdateExpression: 'set recordingUrl = :recordingUrl, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':recordingUrl': recordingUrl,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    await dynamoDB.update(updateParams).promise();

    res.status(200).json({
      message: 'Recording saved successfully',
      recordingUrl
    });
  } catch (error) {
    logger.error('Error in saveRecording function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 