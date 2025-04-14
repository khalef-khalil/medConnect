const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// All payment routes require authentication
router.use(authMiddleware.verifyToken);

// Process a payment
router.post('/', paymentController.processPayment);

// Get payment by ID
router.get('/:paymentId', paymentController.getPaymentById);

// Get payment history
router.get('/', paymentController.getPaymentHistory);

// Get payments for a specific appointment
router.get('/appointment/:appointmentId', paymentController.getAppointmentPayments);

module.exports = router; 