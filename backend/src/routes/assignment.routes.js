const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Get all assignments for a secretary
// GET /api/v1/secretaries/:secretaryId/assignments
router.get('/secretary/:secretaryId', verifyToken, assignmentController.getSecretaryAssignments);

// Get all secretaries for a doctor
// GET /api/v1/doctors/:doctorId/assignments
router.get('/doctor/:doctorId', verifyToken, assignmentController.getDoctorSecretaries);

// Create a new assignment
// POST /api/v1/assignments
router.post('/', verifyToken, assignmentController.createAssignment);

// Delete an assignment
// DELETE /api/v1/assignments/:assignmentId
router.delete('/:assignmentId', verifyToken, assignmentController.deleteAssignment);

module.exports = router; 