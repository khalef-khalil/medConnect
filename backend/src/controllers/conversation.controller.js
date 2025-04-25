const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');

/**
 * Get all conversations for a user (either patient or doctor)
 */
exports.getConversations = async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    // Query all appointments for the user to find conversations
    // Use ExpressionAttributeNames to handle the reserved keyword 'status'
    const appointmentParams = {
      TableName: TABLES.APPOINTMENTS,
      FilterExpression: role === 'patient' ? 'patientId = :userId AND #appointmentStatus = :status' : 'doctorId = :userId AND #appointmentStatus = :status',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':status': 'confirmed'
      },
      ExpressionAttributeNames: {
        '#appointmentStatus': 'status'
      }
    };
    
    const appointmentResult = await dynamoDB.scan(appointmentParams).promise();
    
    // Get unique patient-doctor pairs from appointments
    const conversationPairs = new Map();
    
    if (appointmentResult.Items && appointmentResult.Items.length > 0) {
      for (const appointment of appointmentResult.Items) {
        const patientId = appointment.patientId;
        const doctorId = appointment.doctorId;
        
        // Construct conversation ID - always sort IDs to ensure consistency
        const participants = [patientId, doctorId].sort();
        const conversationId = `${participants[0]}_${participants[1]}`;
        
        // Skip if we already have this conversation
        if (conversationPairs.has(conversationId)) continue;
        
        // Get both user's details to add to conversation info
        const otherId = role === 'patient' ? doctorId : patientId;
        
        const otherUserParams = {
          TableName: TABLES.USERS,
          Key: { userId: otherId }
        };
        
        const userResult = await dynamoDB.get(otherUserParams).promise();
        
        if (userResult.Item) {
          // Create conversation object with user details
          const { firstName, lastName, profileImage, specialization } = userResult.Item;
          
          conversationPairs.set(conversationId, {
            conversationId,
            participantId: otherId,
            participantName: `${firstName} ${lastName}`,
            profileImage,
            specialization: specialization || null,
            role: role === 'patient' ? 'doctor' : 'patient',
            lastMessage: null, // Will populate this next
            unreadCount: 0 // Will populate this next
          });
        }
      }
    }
    
    // Now get the last message for each conversation
    for (const [conversationId, conversation] of conversationPairs) {
      // Query the last message
      const messageParams = {
        TableName: TABLES.MESSAGES,
        IndexName: 'ConversationIndex',
        KeyConditionExpression: 'conversationId = :conversationId',
        ExpressionAttributeValues: {
          ':conversationId': conversationId
        },
        Limit: 1,
        ScanIndexForward: false // DESC order
      };
      
      const messageResult = await dynamoDB.query(messageParams).promise();
      
      if (messageResult.Items && messageResult.Items.length > 0) {
        conversation.lastMessage = messageResult.Items[0];
      }
      
      // Count unread messages
      const unreadParams = {
        TableName: TABLES.MESSAGES,
        IndexName: 'ConversationIndex',
        KeyConditionExpression: 'conversationId = :conversationId',
        FilterExpression: 'recipientId = :recipientId AND isRead = :isRead',
        ExpressionAttributeValues: {
          ':conversationId': conversationId,
          ':recipientId': userId,
          ':isRead': false
        }
      };
      
      const unreadResult = await dynamoDB.query(unreadParams).promise();
      
      if (unreadResult.Items) {
        conversation.unreadCount = unreadResult.Count || 0;
      }
    }
    
    res.status(200).json({
      conversations: Array.from(conversationPairs.values()),
      count: conversationPairs.size
    });
  } catch (error) {
    logger.error('Error in getConversations function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get messages for a conversation between patient and doctor
 */
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.user;
    const { conversationId } = req.params;
    
    // Split conversation ID to get participants
    const participants = conversationId.split('_');
    
    // Check if the user is part of this conversation
    if (!participants.includes(userId)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }
    
    // Get messages for the conversation
    const messageParams = {
      TableName: TABLES.MESSAGES,
      IndexName: 'ConversationIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      },
      ScanIndexForward: true // ASC order by timestamp
    };
    
    const result = await dynamoDB.query(messageParams).promise();
    
    res.status(200).json({
      messages: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    logger.error('Error in getMessages function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new conversation (this actually just checks if users can message each other)
 */
exports.createConversation = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }
    
    // Check if the participant exists
    const participantParams = {
      TableName: TABLES.USERS,
      Key: { userId: participantId }
    };
    
    const participantResult = await dynamoDB.get(participantParams).promise();
    
    if (!participantResult.Item) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Check if there's a confirmed appointment between them
    // Use ExpressionAttributeNames for reserved keyword 'status'
    let appointmentParams;
    
    if (role === 'patient') {
      appointmentParams = {
        TableName: TABLES.APPOINTMENTS,
        IndexName: 'PatientIndex',
        KeyConditionExpression: 'patientId = :patientId',
        FilterExpression: 'doctorId = :doctorId AND #appointmentStatus = :status',
        ExpressionAttributeValues: {
          ':patientId': userId,
          ':doctorId': participantId,
          ':status': 'confirmed'
        },
        ExpressionAttributeNames: {
          '#appointmentStatus': 'status'
        }
      };
    } else if (role === 'doctor') {
      appointmentParams = {
        TableName: TABLES.APPOINTMENTS,
        IndexName: 'DoctorIndex',
        KeyConditionExpression: 'doctorId = :doctorId',
        FilterExpression: 'patientId = :patientId AND #appointmentStatus = :status',
        ExpressionAttributeValues: {
          ':doctorId': userId,
          ':patientId': participantId,
          ':status': 'confirmed'
        },
        ExpressionAttributeNames: {
          '#appointmentStatus': 'status'
        }
      };
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    
    const appointmentResult = await dynamoDB.query(appointmentParams).promise();
    
    if (!appointmentResult.Items || appointmentResult.Items.length === 0) {
      return res.status(403).json({ 
        message: 'You can only message users you have had confirmed appointments with'
      });
    }
    
    // Create conversation ID - always sort IDs to ensure consistency
    const participants = [userId, participantId].sort();
    const conversationId = `${participants[0]}_${participants[1]}`;
    
    // Get participant details
    const { firstName, lastName, profileImage, specialization } = participantResult.Item;
    
    res.status(200).json({
      conversationId,
      participantId,
      participantName: `${firstName} ${lastName}`,
      profileImage,
      specialization: specialization || null,
      role: participantResult.Item.role
    });
  } catch (error) {
    logger.error('Error in createConversation function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Send a message via REST API (alternative to WebSocket)
 */
exports.sendMessage = async (req, res) => {
  try {
    const { userId } = req.user;
    const { conversationId, content } = req.body;
    
    if (!conversationId || !content) {
      return res.status(400).json({ message: 'Conversation ID and content are required' });
    }
    
    // Split conversation ID to get participants
    const participants = conversationId.split('_');
    
    // Check if the user is part of this conversation
    if (!participants.includes(userId)) {
      return res.status(403).json({ message: 'You are not a participant in this conversation' });
    }
    
    // Determine recipient
    const recipientId = participants[0] === userId ? participants[1] : participants[0];
    
    // Create message
    const messageId = uuidv4();
    const message = {
      messageId,
      conversationId,
      senderId: userId,
      recipientId,
      content,
      timestamp: Date.now(),
      isRead: false
    };
    
    await dynamoDB.put({
      TableName: TABLES.MESSAGES,
      Item: message
    }).promise();
    
    res.status(201).json(message);
  } catch (error) {
    logger.error('Error in sendMessage function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark messages as read via REST API (alternative to WebSocket)
 */
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Message IDs are required' });
    }
    
    // Check if user is the recipient for all messages
    const messageChecks = [];
    
    for (const messageId of messageIds) {
      const messageParams = {
        TableName: TABLES.MESSAGES,
        Key: { messageId }
      };
      
      messageChecks.push(dynamoDB.get(messageParams).promise());
    }
    
    const messageResults = await Promise.all(messageChecks);
    
    for (const result of messageResults) {
      if (!result.Item) {
        return res.status(404).json({ message: 'One or more messages not found' });
      }
      
      if (result.Item.recipientId !== userId) {
        return res.status(403).json({ message: 'You can only mark your own received messages as read' });
      }
    }
    
    // Update each message
    const updatePromises = messageIds.map(messageId => {
      return dynamoDB.update({
        TableName: TABLES.MESSAGES,
        Key: { messageId },
        UpdateExpression: 'set isRead = :isRead',
        ExpressionAttributeValues: {
          ':isRead': true
        }
      }).promise();
    });
    
    await Promise.all(updatePromises);
    
    res.status(200).json({ success: true, messageIds });
  } catch (error) {
    logger.error('Error in markAsRead function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 