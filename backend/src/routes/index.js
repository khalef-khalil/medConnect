const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./user.routes');
const appointmentRoutes = require('./appointment.routes');
const chatRoutes = require('./chat.routes');
const paymentRoutes = require('./payment.routes');
const videoRoutes = require('./video.routes');
const notificationRoutes = require('./notification.routes');
const scheduleRoutes = require('./schedule.routes');
const assignmentRoutes = require('./assignment.routes');
const assignmentController = require('../controllers/assignment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Mount routes
router.use('/users', userRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/chats', chatRoutes);
router.use('/payments', paymentRoutes);
router.use('/video', videoRoutes);
router.use('/notifications', notificationRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/assignments', assignmentRoutes);

// Doctor-Secretary assignment routes
router.get('/doctors/:doctorId/assignments', verifyToken, assignmentController.getDoctorSecretaries);
router.get('/secretaries/:secretaryId/assignments', verifyToken, assignmentController.getSecretaryAssignments);

// Health check endpoint
router.get('/../health', (req, res) => {
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