const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');

// Import controllers
const userController = require('../controllers/user.controller');
const appointmentController = require('../controllers/appointment.controller');
const scheduleController = require('../controllers/schedule.controller');
const videoController = require('../controllers/video.controller');

// User routes
const userRoutes = require('./user.routes');
const appointmentRoutes = require('./appointment.routes');
const messageRoutes = require('./message.routes');
const scheduleRoutes = require('./schedule.routes');
const videoRoutes = require('./video.routes');
const paymentRoutes = require('./payment.routes');

// API routes
router.use('/users', userRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/messages', messageRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/video', videoRoutes);
router.use('/payments', paymentRoutes);

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