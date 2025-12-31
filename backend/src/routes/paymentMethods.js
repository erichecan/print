// Payment method management routes for Issue #112
const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', paymentMethodController.getPaymentMethods);
router.post('/', paymentMethodController.savePaymentMethod);
router.get('/:id', paymentMethodController.getPaymentMethod);
router.patch('/:id/default', paymentMethodController.setDefaultPaymentMethod);
router.delete('/:id', paymentMethodController.deletePaymentMethod);

module.exports = router;

