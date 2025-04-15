const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Get all schedules for a doctor
// GET /api/v1/schedules/doctor/:doctorId
router.get('/doctor/:doctorId', verifyToken, scheduleController.getDoctorSchedules);

// Create a new schedule
// POST /api/v1/schedules
router.post('/', verifyToken, scheduleController.createSchedule);

// Update a schedule
// PUT /api/v1/schedules/:scheduleId
router.put('/:scheduleId', verifyToken, scheduleController.updateSchedule);

// Delete a schedule
// DELETE /api/v1/schedules/:scheduleId
router.delete('/:scheduleId', verifyToken, scheduleController.deleteSchedule);

module.exports = router; 