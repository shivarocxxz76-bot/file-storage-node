/**
 * Billing and Demo Checkout Routes
 */

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { isAuth } = require('../middleware/auth');

router.get('/storage-plans', isAuth, billingController.getPlans);
router.get('/checkout', isAuth, billingController.getCheckout);
router.post('/checkout/process', isAuth, billingController.processPayment);
router.post('/process-payment', isAuth, billingController.processPayment);
router.get('/payment-history', isAuth, billingController.getPaymentHistory);

module.exports = router;
