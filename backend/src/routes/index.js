const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');

// Import controllers
const userController = require('../controllers/user.controller');
const appointmentController = require('../controllers/appointment.controller');
const scheduleController = require('../controllers/schedule.controller');
const videoController = require('../controllers/video.controller');
const chatController = require('../controllers/chat.controller');
const paymentController = require('../controllers/payment.controller');
const notificationController = require('../controllers/notification.controller');

// User routes
router.use('/users', require('./user.routes'));

// Appointment routes
router.use('/appointments', require('./appointment.routes'));

// Schedule routes
router.use('/schedules', require('./schedule.routes'));

// Video routes
router.use('/video', require('./video.routes'));

// Chat routes
router.use('/chats', require('./chat.routes'));

// Payment routes
router.use('/payments', require('./payment.routes'));

// Notification routes
router.use('/notifications', require('./notification.routes'));

// Additional Appointment routes
router.get('/doctors/:doctorId/availability', verifyToken, appointmentController.getDoctorAvailability);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

// API information endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'MedConnect API',
    version: process.env.API_VERSION || 'v1',
    description: 'Backend API for MedConnect telemedicine platform',
    documentation: '/api-docs'
  });
});

module.exports = router; 