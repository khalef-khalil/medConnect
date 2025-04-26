const { dynamoDB, TABLES } = require('../config/aws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger').logger;

/**
 * Create a new notification
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (notification) => {
  try {
    const notificationId = notification.notificationId || uuidv4();
    const timestamp = Date.now();
    
    const notificationItem = {
      notificationId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId || null, // ID of related entity (appointment, message, etc.)
      isRead: false,
      timestamp,
      createdAt: new Date().toISOString()
    };
    
    await dynamoDB.put({
      TableName: TABLES.NOTIFICATIONS,
      Item: notificationItem
    }).promise();
    
    logger.info(`Created notification: ${notificationId} for user: ${notification.userId}`);
    return notificationItem;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a user
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20, unreadOnly = false } = req.query;
    
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      IndexName: 'UserNotificationsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false, // DESC order by timestamp (newest first)
      Limit: parseInt(limit, 10)
    };
    
    // Only return unread notifications if requested
    if (unreadOnly === 'true') {
      params.FilterExpression = 'isRead = :isRead';
      params.ExpressionAttributeValues[':isRead'] = false;
    }
    
    const result = await dynamoDB.query(params).promise();
    
    res.status(200).json({
      notifications: result.Items || [],
      count: result.Count || 0
    });
  } catch (error) {
    logger.error('Error in getUserNotifications function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark notifications as read
 */
exports.markNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of notification IDs' });
    }
    
    // Process in batches if needed (DynamoDB batch writes are limited to 25 items)
    const batchSize = 25;
    const batches = [];
    
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      batches.push(notificationIds.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      // Verify user owns these notifications
      for (const notificationId of batch) {
        const getParams = {
          TableName: TABLES.NOTIFICATIONS,
          Key: { notificationId }
        };
        
        const notificationResult = await dynamoDB.get(getParams).promise();
        
        if (!notificationResult.Item) {
          logger.warn(`Notification not found: ${notificationId}`);
          continue;
        }
        
        if (notificationResult.Item.userId !== userId) {
          logger.warn(`User ${userId} attempted to mark notification ${notificationId} as read, but it belongs to ${notificationResult.Item.userId}`);
          return res.status(403).json({ message: 'You can only mark your own notifications as read' });
        }
        
        // Update notification
        await dynamoDB.update({
          TableName: TABLES.NOTIFICATIONS,
          Key: { notificationId },
          UpdateExpression: 'set isRead = :isRead',
          ExpressionAttributeValues: {
            ':isRead': true
          }
        }).promise();
      }
    }
    
    res.status(200).json({ message: 'Notifications marked as read successfully' });
  } catch (error) {
    logger.error('Error in markNotificationsAsRead function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get all unread notifications for the user
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      IndexName: 'UserNotificationsIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: 'isRead = :isRead',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':isRead': false
      }
    };
    
    const result = await dynamoDB.query(params).promise();
    
    if (result.Items && result.Items.length > 0) {
      // Process in batches if needed
      const batchSize = 25;
      const batches = [];
      
      for (let i = 0; i < result.Items.length; i += batchSize) {
        batches.push(result.Items.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        for (const notification of batch) {
          await dynamoDB.update({
            TableName: TABLES.NOTIFICATIONS,
            Key: { notificationId: notification.notificationId },
            UpdateExpression: 'set isRead = :isRead',
            ExpressionAttributeValues: {
              ':isRead': true
            }
          }).promise();
        }
      }
    }
    
    res.status(200).json({ 
      message: 'All notifications marked as read',
      count: result.Items ? result.Items.length : 0
    });
  } catch (error) {
    logger.error('Error in markAllNotificationsAsRead function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export the createNotification function for use in other controllers
exports.createNotification = createNotification; 