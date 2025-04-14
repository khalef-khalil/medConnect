const { logger } = require('../utils/logger');
const notificationService = require('../services/notification.service');

/**
 * Get all notifications for the current user
 */
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.user;
    const { unreadOnly } = req.query;
    
    // Convert string query param to boolean
    const onlyUnread = unreadOnly === 'true';
    
    const notifications = await notificationService.getUserNotifications(userId, onlyUnread);
    
    res.status(200).json({ 
      count: notifications.length,
      notifications 
    });
  } catch (error) {
    logger.error('Error in getNotifications function:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    const { notificationId } = req.params;
    
    if (!notificationId) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }
    
    await notificationService.markNotificationAsRead(userId, notificationId);
    
    res.status(200).json({ 
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error in markAsRead function:', error);
    
    if (error.message === 'Notification not found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get all notifications
    const notifications = await notificationService.getUserNotifications(userId);
    
    // Mark each notification as read
    const markPromises = notifications.map(notification => 
      notificationService.markNotificationAsRead(userId, notification.notificationId)
    );
    
    await Promise.all(markPromises);
    
    res.status(200).json({ 
      message: 'All notifications marked as read',
      count: notifications.length
    });
  } catch (error) {
    logger.error('Error in markAllAsRead function:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 