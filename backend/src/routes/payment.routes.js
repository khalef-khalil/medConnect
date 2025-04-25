const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// All payment routes require authentication
router.use(authMiddleware.verifyToken);

// Process a new payment
router.post('/process', paymentController.processPayment);

// Process a payment without an existing appointment
router.post('/process/new', paymentController.newProcessPayment);

// Get payment history for the logged-in user
router.get('/history', paymentController.getPaymentHistory);

// Get a specific payment by ID
router.get('/:paymentId', paymentController.getPaymentById);

// Get all payments for a specific appointment
router.get('/appointment/:appointmentId', paymentController.getPaymentsByAppointment);

// Update payment status (admin only)
router.put('/:paymentId/status', roleMiddleware.isAdmin, paymentController.updatePaymentStatus);

// Refund a payment (admin only)
router.post('/:paymentId/refund', roleMiddleware.isAdmin, paymentController.refundPayment);

module.exports = router; 