const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All notification routes require authentication
router.use(authMiddleware.verifyToken);

// Get all notifications for current user
router.get('/', notificationController.getNotifications);

// Mark a notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router; 