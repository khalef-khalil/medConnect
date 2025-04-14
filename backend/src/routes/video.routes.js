const express = require('express');
const router = express.Router();
const videoController = require('../controllers/video.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// All video routes require authentication
router.use(authMiddleware.verifyToken);

// Create a new video session for an appointment
router.post('/session', videoController.createVideoSession);

// Get video session details by appointment ID
router.get('/session/:appointmentId', videoController.getVideoSession);

// Save recording - only doctors can save recordings
router.post('/session/:appointmentId/recording', 
  roleMiddleware.isResourceOwnerOrHasRole(['admin', 'doctor'], 'doctorId'),
  videoController.saveRecording
);

module.exports = router; 