const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./user.routes');
const appointmentRoutes = require('./appointment.routes');
const chatRoutes = require('./chat.routes');
const paymentRoutes = require('./payment.routes');
const videoRoutes = require('./video.routes');
const notificationRoutes = require('./notification.routes');

// Mount routes
router.use('/users', userRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/chats', chatRoutes);
router.use('/payments', paymentRoutes);
router.use('/video', videoRoutes);
router.use('/notifications', notificationRoutes);

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