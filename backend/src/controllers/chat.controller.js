const { v4: uuidv4 } = require('uuid');
const { dynamoDB, TABLES } = require('../config/aws');
const { logger } = require('../utils/logger');
const { notifyMessage } = require('../services/notification.service');
const encryptionService = require('../services/encryption.service');
const encryptionKeyService = require('../services/encryption-key.service');
const dialogflowService = require('../services/dialogflow.service');

/**
 * Get all conversations for the current user
 */
exports.getConversations = async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    // Build params for DynamoDB query
    let params = {
      TableName: TABLES.MESSAGES
    };
    
    // For admin, they can see all conversations
    // Otherwise, only return conversations where the user is a participant
    if (role !== 'admin') {
      params.FilterExpression = 'contains(participantIds, :userId)';
      params.ExpressionAttributeValues = {
        ':userId': userId
      };
    }

    // In a real application, you'd have a separate conversations table
    // This is a simplified version
    const result = await dynamoDB.scan(params).promise();
    
    // Group messages by conversationId to create conversation objects
    const conversations = {};
    
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach(message => {
        if (!conversations[message.conversationId]) {
          conversations[message.conversationId] = {
            conversationId: message.conversationId,
            participants: message.participantIds,
            lastMessage: null,
            createdAt: null,
            updatedAt: null
          };
        }
        
        // Find the most recent message for each conversation
        if (!conversations[message.conversationId].lastMessage || 
            new Date(message.timestamp) > new Date(conversations[message.conversationId].lastMessage.timestamp)) {
          conversations[message.conversationId].lastMessage = {
            messageId: message.messageId,
            senderId: message.senderId,
            content: message.content, // This will be encrypted but we don't decrypt in the list view
            isEncrypted: message.isEncrypted || false,
            timestamp: message.timestamp
          };
          
          // Update the conversation times
          if (!conversations[message.conversationId].createdAt || 
              new Date(message.createdAt) < new Date(conversations[message.conversationId].createdAt)) {
            conversations[message.conversationId].createdAt = message.createdAt;
          }
          
          if (!conversations[message.conversationId].updatedAt || 
              new Date(message.timestamp) > new Date(conversations[message.conversationId].updatedAt)) {
            conversations[message.conversationId].updatedAt = message.timestamp;
          }
        }
      });
    }
    
    // Convert the conversations object to an array and sort by most recent
    const conversationsArray = Object.values(conversations).sort((a, b) => 
      new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );

    res.status(200).json({ 
      conversations: conversationsArray,
      count: conversationsArray.length 
    });
  } catch (error) {
    logger.error('Error in getConversations function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const { participants, subject } = req.body;
    const { userId } = req.user;

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ message: 'At least two participants are required' });
    }

    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    // Ensure current user is one of the participants
    const participantIds = [...participants];
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    // Generate IDs
    const conversationId = uuidv4();
    const messageId = uuidv4();
    const timestamp = Date.now();
    
    // Create encryption key for the conversation
    const encryptionKey = await encryptionKeyService.ensureEncryptionKey(conversationId, participantIds);
    
    // Encrypt the initial subject message
    const encryptedContent = encryptionService.encryptMessage(subject, encryptionKey);

    // Create initial message using the subject
    const newMessage = {
      messageId,
      conversationId,
      senderId: userId,
      participantIds, // Store participants with each message for easy querying
      content: encryptedContent, // Use subject as the initial message but encrypted
      isEncrypted: true,
      originalLength: subject.length, // Store original length for UI purposes
      timestamp,
      createdAt: new Date().toISOString(),
      read: false
    };

    await dynamoDB.put({
      TableName: TABLES.MESSAGES,
      Item: newMessage
    }).promise();

    // In a real application, you'd also create a conversation record in a separate table
    // Here we're using a simplified approach where messages contain conversation metadata

    res.status(201).json({ 
      message: 'Conversation created successfully',
      conversation: {
        conversationId,
        participants: participantIds,
        subject,
        isEncrypted: true,
        lastMessage: {
          messageId,
          senderId: userId,
          content: subject, // Return the plaintext for the initial message
          timestamp: new Date(timestamp).toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date(timestamp).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in createConversation function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get messages for a specific conversation
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId, role } = req.user;
    
    // Query for messages in this conversation
    const params = {
      TableName: TABLES.MESSAGES,
      IndexName: 'ConversationIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      }
    };

    const result = await dynamoDB.query(params).promise();
    
    // Verify user has access to this conversation
    if (result.Items && result.Items.length > 0) {
      const participantIds = result.Items[0].participantIds;
      
      if (role !== 'admin' && !participantIds.includes(userId)) {
        return res.status(403).json({ message: 'You do not have permission to access this conversation' });
      }
      
      // Sort messages by timestamp (oldest first)
      const messages = result.Items.sort((a, b) => a.timestamp - b.timestamp);
      
      // Get the encryption key for the conversation
      const encryptionKey = await encryptionKeyService.getEncryptionKey(conversationId);
      
      // Decrypt messages if they are encrypted
      if (encryptionKey) {
        messages.forEach(message => {
          if (message.isEncrypted) {
            try {
              message.originalContent = message.content; // Store the encrypted content
              message.content = encryptionService.decryptMessage(message.content, encryptionKey);
            } catch (decryptError) {
              logger.error(`Error decrypting message ${message.messageId}:`, decryptError);
              message.content = "[Encrypted message - decryption failed]";
            }
          }
        });
      }
      
      res.status(200).json({ 
        messages,
        count: messages.length,
        isEncrypted: !!encryptionKey
      });
    } else {
      res.status(404).json({ message: 'Conversation not found' });
    }
  } catch (error) {
    logger.error('Error in getMessages function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Send a message in a conversation
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    const { userId, role } = req.user;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // First check if conversation exists and user is a participant
    const conversationParams = {
      TableName: TABLES.MESSAGES,
      IndexName: 'ConversationIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      Limit: 1,
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      }
    };

    const conversationResult = await dynamoDB.query(conversationParams).promise();
    
    if (!conversationResult.Items || conversationResult.Items.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const participantIds = conversationResult.Items[0].participantIds;
    
    // Check if user is a participant
    if (role !== 'admin' && !participantIds.includes(userId)) {
      return res.status(403).json({ message: 'You do not have permission to send messages in this conversation' });
    }

    // Get or create encryption key for the conversation
    const encryptionKey = await encryptionKeyService.ensureEncryptionKey(conversationId, participantIds);
    
    // Encrypt the message content
    const encryptedContent = encryptionService.encryptMessage(content, encryptionKey);

    // Create new message
    const messageId = uuidv4();
    const timestamp = Date.now();
    
    const newMessage = {
      messageId,
      conversationId,
      senderId: userId,
      participantIds, // Include participants for easy querying
      content: encryptedContent, // Store the encrypted content
      isEncrypted: true,
      originalLength: content.length, // Store original length for UI purposes
      timestamp,
      createdAt: new Date().toISOString(),
      read: false
    };

    await dynamoDB.put({
      TableName: TABLES.MESSAGES,
      Item: newMessage
    }).promise();

    // Get the sender's name for the notification
    const userParams = {
      TableName: TABLES.USERS,
      Key: { userId }
    };
    
    const userResult = await dynamoDB.get(userParams).promise();
    const senderName = userResult.Item ? 
      `${userResult.Item.firstName} ${userResult.Item.lastName}` : 
      'a user';
    
    // Add sender name to message for notification (don't include the full content)
    const messageWithSender = {
      ...newMessage,
      content: 'New encrypted message',  // Don't send the encrypted content in notifications
      senderName
    };

    // Send notifications to all participants except the sender
    for (const participantId of participantIds) {
      if (participantId !== userId) {
        try {
          await notifyMessage(participantId, messageWithSender);
        } catch (notifyError) {
          // Log but don't fail if notification fails
          logger.error(`Error sending message notification to user ${participantId}:`, notifyError);
        }
      }
    }

    res.status(201).json({ 
      message: 'Message sent successfully',
      messageDetails: {
        messageId,
        conversationId,
        senderId: userId,
        content, // Return the plaintext for the sender's confirmation
        isEncrypted: true,
        timestamp: new Date(timestamp).toISOString(),
        createdAt: new Date().toISOString(),
        read: false
      }
    });
  } catch (error) {
    logger.error('Error in sendMessage function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    const { userId, role } = req.user;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Message IDs are required' });
    }

    // Check if conversation exists and user is a participant
    const conversationParams = {
      TableName: TABLES.MESSAGES,
      IndexName: 'ConversationIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      Limit: 1,
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      }
    };

    const conversationResult = await dynamoDB.query(conversationParams).promise();
    
    if (!conversationResult.Items || conversationResult.Items.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const participantIds = conversationResult.Items[0].participantIds;
    
    // Check if user is a participant
    if (role !== 'admin' && !participantIds.includes(userId)) {
      return res.status(403).json({ message: 'You do not have permission to access this conversation' });
    }

    // Update each message to mark as read
    const updatePromises = messageIds.map(messageId => {
      const params = {
        TableName: TABLES.MESSAGES,
        Key: { messageId },
        UpdateExpression: 'set #read = :read, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#read': 'read' },
        ExpressionAttributeValues: {
          ':read': true,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'NONE'
      };
      
      return dynamoDB.update(params).promise();
    });

    await Promise.all(updatePromises);

    res.status(200).json({ 
      message: 'Messages marked as read',
      messageIds
    });
  } catch (error) {
    logger.error('Error in markMessagesAsRead function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get AI response to a message
 */
exports.getAIResponse = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, context } = req.body;
    const { userId, role } = req.user;

    if (!message) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check if conversation exists and user is a participant
    const conversationParams = {
      TableName: TABLES.MESSAGES,
      IndexName: 'ConversationIndex',
      KeyConditionExpression: 'conversationId = :conversationId',
      Limit: 1,
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      }
    };

    const conversationResult = await dynamoDB.query(conversationParams).promise();
    
    if (!conversationResult.Items || conversationResult.Items.length === 0) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const participantIds = conversationResult.Items[0].participantIds;
    
    // Check if user is a participant
    if (role !== 'admin' && !participantIds.includes(userId)) {
      return res.status(403).json({ message: 'You do not have permission to access this conversation' });
    }

    // Get AI response from Dialogflow - pass the userId for session management
    const aiResponseData = await dialogflowService.detectIntent(message, userId, context || {});
    
    logger.info(`Dialogflow response for user ${userId}: Intent=${aiResponseData.intent}, Confidence=${aiResponseData.intentConfidence}`);
    
    // Get intent information for special handling
    const intentInfo = dialogflowService.getHealthcareIntentInfo(aiResponseData.intent);
    
    // Create a message ID for the AI response
    const messageId = uuidv4();
    const timestamp = Date.now();
    
    // Get encryption key for the conversation
    const encryptionKey = await encryptionKeyService.getEncryptionKey(conversationId);
    
    // Encrypt the AI response
    const encryptedResponse = encryptionService.encryptMessage(aiResponseData.response, encryptionKey);
    
    // Additional metadata to store with the message
    const metadata = {
      intent: aiResponseData.intent,
      intentConfidence: aiResponseData.intentConfidence,
      intentCategory: intentInfo.category,
      intentPriority: intentInfo.priority,
      requiresFollowUp: intentInfo.requiresFollowUp || false
    };
    
    // If there are parameters, add them to metadata
    if (aiResponseData.parameters && Object.keys(aiResponseData.parameters).length > 0) {
      // Encrypt parameters before storage for security
      const encryptedParams = encryptionService.encryptMessage(
        JSON.stringify(aiResponseData.parameters), 
        encryptionKey
      );
      metadata.parameters = encryptedParams;
      metadata.hasParameters = true;
    }
    
    // Create the AI response message
    const aiMessage = {
      messageId,
      conversationId,
      senderId: 'AI_ASSISTANT', // Special ID for AI messages
      participantIds,
      content: encryptedResponse,
      isEncrypted: true,
      isAIGenerated: true,
      metadata: metadata,
      originalLength: aiResponseData.response.length,
      timestamp,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    // Save the AI message to the database
    await dynamoDB.put({
      TableName: TABLES.MESSAGES,
      Item: aiMessage
    }).promise();
    
    // Handle high priority intents with notifications
    if (intentInfo.priority === 'HIGH') {
      for (const participantId of participantIds) {
        // For doctors, send urgent notification
        const userParams = {
          TableName: TABLES.USERS,
          Key: { userId: participantId }
        };
        
        const userResult = await dynamoDB.get(userParams).promise();
        if (userResult.Item && userResult.Item.role === 'doctor') {
          try {
            await notifyMessage(participantId, {
              ...aiMessage,
              content: 'URGENT: Patient reported emergency symptoms',
              senderName: 'MedConnect Assistant',
              priority: 'HIGH'
            });
          } catch (notifyError) {
            logger.error(`Error sending urgent AI notification to doctor ${participantId}:`, notifyError);
          }
        }
      }
    } else {
      // Send regular notifications to all participants except the requester
      for (const participantId of participantIds) {
        if (participantId !== userId) {
          try {
            await notifyMessage(participantId, {
              ...aiMessage,
              content: 'New AI message available',
              senderName: 'MedConnect Assistant'
            });
          } catch (notifyError) {
            logger.error(`Error sending AI message notification to user ${participantId}:`, notifyError);
          }
        }
      }
    }
    
    // Return response to the user
    res.status(201).json({
      message: 'AI response generated successfully',
      messageDetails: {
        messageId,
        conversationId,
        senderId: 'AI_ASSISTANT',
        content: aiResponseData.response, // Return plaintext for immediate display
        intent: aiResponseData.intent,
        intentConfidence: aiResponseData.intentConfidence,
        intentCategory: intentInfo.category,
        intentPriority: intentInfo.priority,
        isAIGenerated: true,
        isEncrypted: true,
        timestamp: new Date(timestamp).toISOString(),
        createdAt: new Date().toISOString(),
        parameters: aiResponseData.parameters || {},
        read: false
      }
    });
  } catch (error) {
    logger.error('Error in getAIResponse function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 