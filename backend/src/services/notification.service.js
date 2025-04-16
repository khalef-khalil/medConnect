const { dynamoDB, TABLES } = require('../config/aws');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Create a new notification for a user
 * @param {string} userId - User to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (appointment, message, payment, etc.)
 * @param {Object} metadata - Additional data related to the notification
 * @returns {Promise<Object>} - The created notification
 */
const createNotification = async (userId, title, message, type, metadata = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!message) {
      throw new Error('Message is required');
    }

    // Create notification object
    const notification = {
      notificationId: uuidv4(),
      userId,
      title: title || type,
      message,
      type: type || 'general',
      metadata,
      isRead: false,
      createdAt: Date.now(),
    };

    // Store in DynamoDB as part of user record
    const params = {
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: 'SET notifications = list_append(if_not_exists(notifications, :empty_list), :notification)',
      ExpressionAttributeValues: {
        ':notification': [notification],
        ':empty_list': []
      },
      ReturnValues: 'UPDATED_NEW'
    };

    await dynamoDB.update(params).promise();
    logger.info(`Created notification for user ${userId}`);

    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get all notifications for a user
 * @param {string} userId - User ID
 * @param {boolean} unreadOnly - Get only unread notifications
 * @returns {Promise<Array>} - List of notifications
 */
const getUserNotifications = async (userId, unreadOnly = false) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Get user record with notifications
    const params = {
      TableName: TABLES.USERS,
      Key: { userId },
      ProjectionExpression: 'notifications'
    };

    const result = await dynamoDB.get(params).promise();
    
    if (!result.Item || !result.Item.notifications) {
      return [];
    }

    const notifications = result.Item.notifications;
    
    // Filter by read status if requested
    if (unreadOnly) {
      return notifications.filter(notification => !notification.isRead);
    }
    
    return notifications;
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} - Success status
 */
const markNotificationAsRead = async (userId, notificationId) => {
  try {
    if (!userId || !notificationId) {
      throw new Error('User ID and notification ID are required');
    }

    // Get user notifications
    const userNotifications = await getUserNotifications(userId);
    
    // Find notification index
    const notificationIndex = userNotifications.findIndex(n => n.notificationId === notificationId);
    
    if (notificationIndex === -1) {
      throw new Error('Notification not found');
    }
    
    // Update the notification
    const params = {
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: `SET notifications[${notificationIndex}].isRead = :isRead`,
      ExpressionAttributeValues: {
        ':isRead': true
      }
    };
    
    await dynamoDB.update(params).promise();
    logger.info(`Marked notification ${notificationId} as read for user ${userId}`);
    
    return true;
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Create an appointment notification
 * @param {string} userId - User ID to notify
 * @param {Object} appointment - Appointment data
 * @param {string} action - Action type (created, updated, cancelled)
 * @returns {Promise<Object>} - Created notification
 */
const notifyAppointment = async (userId, appointment, action) => {
  try {
    let title, message;
    
    switch (action) {
      case 'created':
        title = 'New Appointment';
        message = `You have a new appointment scheduled on ${new Date(appointment.startTime).toLocaleString()}`;
        break;
      case 'updated':
        title = 'Appointment Updated';
        message = `Your appointment on ${new Date(appointment.startTime).toLocaleString()} has been updated`;
        break;
      case 'cancelled':
        title = 'Appointment Cancelled';
        message = `Your appointment on ${new Date(appointment.startTime).toLocaleString()} has been cancelled`;
        break;
      default:
        title = 'Appointment Update';
        message = `There's an update to your appointment on ${new Date(appointment.startTime).toLocaleString()}`;
    }
    
    return await createNotification(
      userId,
      title,
      message,
      'appointment',
      { appointmentId: appointment.appointmentId }
    );
  } catch (error) {
    logger.error('Error creating appointment notification:', error);
    throw error;
  }
};

/**
 * Create a message notification
 * @param {string} userId - User ID to notify
 * @param {Object} message - Message data
 * @returns {Promise<Object>} - Created notification
 */
const notifyMessage = async (userId, message) => {
  try {
    const title = 'New Message';
    const notificationMessage = `You have a new message from ${message.senderName || 'a user'}`;
    
    return await createNotification(
      userId,
      title,
      notificationMessage,
      'message',
      { 
        conversationId: message.conversationId,
        messageId: message.messageId
      }
    );
  } catch (error) {
    logger.error('Error creating message notification:', error);
    throw error;
  }
};

/**
 * Create a payment notification
 * @param {string} userId - User ID to notify
 * @param {Object} payment - Payment data
 * @param {string} status - Payment status
 * @returns {Promise<Object>} - Created notification
 */
const notifyPayment = async (userId, payment, status) => {
  try {
    let title, message;
    
    switch (status) {
      case 'success':
        title = 'Payment Successful';
        message = `Your payment of $${payment.amount} has been processed successfully`;
        break;
      case 'failed':
        title = 'Payment Failed';
        message = `Your payment of $${payment.amount} could not be processed`;
        break;
      default:
        title = 'Payment Update';
        message = `There's an update to your payment of $${payment.amount}`;
    }
    
    return await createNotification(
      userId,
      title,
      message,
      'payment',
      { 
        paymentId: payment.paymentId,
        appointmentId: payment.appointmentId
      }
    );
  } catch (error) {
    logger.error('Error creating payment notification:', error);
    throw error;
  }
};

/**
 * Create notification for schedule changes
 * @param {string} doctorId - Doctor ID to notify
 * @param {Object} schedule - Schedule data
 * @param {string} action - Action type (created, updated, deleted)
 * @returns {Promise<Object>} - Created notification
 */
const notifyScheduleUpdate = async (doctorId, schedule, action) => {
  try {
    let title, message;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayNames[schedule.dayOfWeek];
    
    switch (action) {
      case 'created':
        title = 'Schedule Created';
        message = `You have created a new schedule for ${day} from ${schedule.startTime} to ${schedule.endTime}`;
        break;
      case 'updated':
        title = 'Schedule Updated';
        message = `Your schedule for ${day} has been updated`;
        break;
      case 'deleted':
        title = 'Schedule Deleted';
        message = `Your schedule for ${day} has been deleted`;
        break;
      default:
        title = 'Schedule Update';
        message = `There's an update to your ${day} schedule`;
    }
    
    return await createNotification(
      doctorId,
      title,
      message,
      'schedule',
      { 
        scheduleId: schedule.scheduleId,
        dayOfWeek: schedule.dayOfWeek
      }
    );
  } catch (error) {
    logger.error('Error creating schedule notification:', error);
    // Don't throw the error to prevent affecting the main flow
    return null;
  }
};

// Export all notification creators
module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  notifyAppointment,
  notifyMessage,
  notifyPayment,
  notifyScheduleUpdate
}; 