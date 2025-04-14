const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const twilio = require('twilio');

// Create a Twilio client using environment variables
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Generate a new WebRTC session using Twilio Video
 * @param {string} appointmentId - ID of the appointment
 * @param {string} doctorId - ID of the doctor
 * @param {string} patientId - ID of the patient
 * @returns {Object} - WebRTC session details
 */
exports.createWebRTCSession = async (appointmentId, doctorId, patientId) => {
  try {
    logger.info(`Creating WebRTC session for appointment ${appointmentId}`);
    
    // Generate a unique room name based on the appointment ID
    const roomUniqueName = `medconnect-${appointmentId}`;
    
    // Check if room already exists
    let room;
    try {
      room = await twilioClient.video.v1.rooms(roomUniqueName).fetch();
      logger.info(`Room ${roomUniqueName} already exists`);
    } catch (error) {
      // Room doesn't exist, create it
      if (error.code === 20404) {
        logger.info(`Creating new Twilio Video room: ${roomUniqueName}`);
        room = await twilioClient.video.v1.rooms.create({
          uniqueName: roomUniqueName,
          type: 'group', // Use group rooms for multi-party video
          recordParticipantsOnConnect: process.env.TWILIO_RECORD_ENABLED === 'true',
          statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
          maxParticipants: 10 // Adjust based on your requirements
        });
      } else {
        throw error;
      }
    }
    
    // Generate access tokens for participants
    const doctorToken = await generateAccessToken(roomUniqueName, doctorId, 'doctor');
    const patientToken = await generateAccessToken(roomUniqueName, patientId, 'patient');
    
    // Create session configuration
    const sessionId = uuidv4();
    const sessionConfig = {
      sessionId,
      roomSid: room.sid,
      roomName: roomUniqueName,
      appointmentId,
      createdAt: new Date().toISOString(),
      participants: {
        doctor: {
          userId: doctorId,
          token: doctorToken,
          role: 'doctor'
        },
        patient: {
          userId: patientId,
          token: patientToken,
          role: 'patient'
        }
      },
      screenSharingEnabled: true,
      recordingEnabled: process.env.TWILIO_RECORD_ENABLED === 'true',
      waitingRoomEnabled: true,
      webrtcData: {
        sessionId,
        appointmentId,
        doctorId,
        patientId,
        createdAt: new Date().toISOString(),
        waitingRoomEnabled: true,
        recordingEnabled: process.env.TWILIO_RECORD_ENABLED === 'true',
        screenSharingEnabled: true,
        maxBitrate: parseInt(process.env.TWILIO_MAX_BITRATE || '1000000'),
        maxFramerate: parseInt(process.env.TWILIO_MAX_FRAMERATE || '30'),
        iceServers: [
          { urls: 'stun:global.stun.twilio.com:3478' },
          {
            urls: `turn:global.turn.twilio.com:3478?transport=udp`,
            username: room.sid,
            credential: doctorToken // Use token as credential (Twilio validates this)
          },
          {
            urls: `turn:global.turn.twilio.com:3478?transport=tcp`,
            username: room.sid,
            credential: doctorToken
          }
        ],
        participants: {
          doctor: {
            userId: doctorId,
            token: doctorToken,
            role: 'doctor'
          },
          patient: {
            userId: patientId,
            token: patientToken,
            role: 'patient'
          }
        }
      }
    };
    
    logger.info(`WebRTC session created successfully: ${sessionId}`);
    return sessionConfig;
  } catch (error) {
    logger.error('Error creating WebRTC session:', error);
    throw error;
  }
};

/**
 * Update an existing WebRTC session
 * @param {Object} sessionConfig - Existing session configuration
 * @param {Object} updates - Updates to apply
 * @returns {Object} - Updated session configuration
 */
exports.updateWebRTCSession = async (sessionConfig, updates) => {
  try {
    logger.info(`Updating WebRTC session: ${sessionConfig.sessionId}`);
    
    // Apply updates to the session configuration
    const updatedConfig = {
      ...sessionConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // If adding a new participant, generate a token for them
    if (updates.newParticipant) {
      const { userId, role } = updates.newParticipant;
      const token = await generateAccessToken(sessionConfig.roomName, userId, role);
      
      // Add the new participant to the session
      updatedConfig.participants = {
        ...updatedConfig.participants,
        [role]: {
          userId,
          token,
          role
        }
      };
      
      // Also update in webrtcData
      if (updatedConfig.webrtcData && updatedConfig.webrtcData.participants) {
        updatedConfig.webrtcData.participants[role] = {
          userId,
          token,
          role
        };
      }
      
      // Clean up the temporary property
      delete updatedConfig.newParticipant;
    }
    
    logger.info(`WebRTC session updated: ${sessionConfig.sessionId}`);
    return updatedConfig;
  } catch (error) {
    logger.error('Error updating WebRTC session:', error);
    throw error;
  }
};

/**
 * Add a participant to waiting room
 * @param {string} roomName - WebRTC room name
 * @param {string} userId - User ID of the participant
 * @param {string} role - Role of the participant
 * @returns {Object} - Waiting room token
 */
exports.addToWaitingRoom = async (roomName, userId, role) => {
  try {
    logger.info(`Adding user ${userId} to waiting room for ${roomName}`);
    
    // For waiting room, we'll use a limited capability token
    // This token doesn't allow joining the actual room yet
    const identity = `${userId}_waiting`;
    const token = await generateWaitingRoomToken(roomName, identity);
    
    return {
      roomName,
      userId,
      role,
      waitingRoomToken: token,
      status: 'waiting',
      joinedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error adding to waiting room:', error);
    throw error;
  }
};

/**
 * Admit a participant from waiting room
 * @param {string} roomName - WebRTC room name
 * @param {string} userId - User ID of the participant
 * @param {string} role - Role of the participant
 * @returns {Object} - Session token
 */
exports.admitFromWaitingRoom = async (roomName, userId, role) => {
  try {
    logger.info(`Admitting user ${userId} from waiting room for room ${roomName}`);
    
    // Generate a full-access token for the participant
    const token = await generateAccessToken(roomName, userId, role);
    
    return {
      roomName,
      userId,
      role,
      token,
      status: 'admitted',
      admittedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error admitting from waiting room:', error);
    throw error;
  }
};

/**
 * Generate signaling data for screen sharing
 * @param {string} roomName - WebRTC room name
 * @param {string} userId - User ID of the sharing participant
 * @returns {Object} - Screen sharing configuration
 */
exports.generateScreenSharingConfig = async (roomName, userId) => {
  try {
    logger.info(`Generating screen sharing config for user ${userId} in room ${roomName}`);
    
    // For screen sharing, we create a special token with screen sharing permissions
    const screenSharingToken = await generateScreenShareToken(roomName, userId);
    
    return {
      roomName,
      userId,
      screenSharingId: uuidv4(),
      screenSharingToken,
      startedAt: new Date().toISOString(),
      constraints: {
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          logicalSurface: true,
          framerate: { max: 15 }
        },
        audio: true
      }
    };
  } catch (error) {
    logger.error('Error generating screen sharing config:', error);
    throw error;
  }
};

/**
 * Generate an access token for a participant using Twilio Video
 * @param {string} roomName - Room name
 * @param {string} userId - User ID
 * @param {string} role - Role of the participant
 * @returns {string} - Access token
 */
async function generateAccessToken(roomName, userId, role) {
  try {
    // Create an Access Token
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;
    
    // Create a Video grant for this specific room
    const videoGrant = new VideoGrant({
      room: roomName
    });
    
    // Create the access token with the specified identity and grant
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: `${userId}_${role}` }
    );
    
    // Add the video grant to the token
    token.addGrant(videoGrant);
    
    // Serialize the token to a JWT string
    return token.toJwt();
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw error;
  }
}

/**
 * Generate a waiting room token with limited capabilities
 * @param {string} roomName - Room name
 * @param {string} identity - User identity
 * @returns {string} - Waiting room token
 */
async function generateWaitingRoomToken(roomName, identity) {
  try {
    // Create an Access Token
    const AccessToken = twilio.jwt.AccessToken;
    
    // For waiting room, we don't add a video grant yet
    // This token can be used for presence/chat but not video
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity }
    );
    
    // Serialize the token to a JWT string
    return token.toJwt();
  } catch (error) {
    logger.error('Error generating waiting room token:', error);
    throw error;
  }
}

/**
 * Generate a token specifically for screen sharing
 * @param {string} roomName - Room name
 * @param {string} userId - User ID
 * @returns {string} - Screen sharing token
 */
async function generateScreenShareToken(roomName, userId) {
  try {
    // Create an Access Token
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;
    
    // Create a Video grant for this specific room
    const videoGrant = new VideoGrant({
      room: roomName
    });
    
    // Create the access token with a special screen sharing identity
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: `${userId}_screen` }
    );
    
    // Add the video grant to the token
    token.addGrant(videoGrant);
    
    // Serialize the token to a JWT string
    return token.toJwt();
  } catch (error) {
    logger.error('Error generating screen sharing token:', error);
    throw error;
  }
} 