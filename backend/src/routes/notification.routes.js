const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');

// Get notifications for the authenticated user
router.get('/', verifyToken, notificationController.getUserNotifications);

// Mark specific notifications as read
router.put('/read', verifyToken, notificationController.markNotificationsAsRead);

// Mark all notifications as read
router.put('/read-all', verifyToken, notificationController.markAllNotificationsAsRead);

module.exports = router; 