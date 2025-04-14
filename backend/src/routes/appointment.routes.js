const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// All appointment routes require authentication
router.use(authMiddleware.verifyToken);

// Get all appointments (filtered by user role)
router.get('/', appointmentController.getAppointments);

// Get doctor availability
router.get('/doctor/:doctorId/availability', appointmentController.getDoctorAvailability);

// Get appointment by ID
router.get('/:appointmentId', appointmentController.getAppointmentById);

// Create appointment - secretary, admin, or patient can create
router.post('/', appointmentController.createAppointment);

// Update appointment - only doctor, secretary, or admin can update
router.put('/:appointmentId', appointmentController.updateAppointment);

// Delete appointment - only doctor, secretary, or admin can delete
router.delete('/:appointmentId', appointmentController.deleteAppointment);

module.exports = router; 