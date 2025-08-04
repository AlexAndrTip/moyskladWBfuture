const express = require('express');
const { createSubscriptionPayment, checkPaymentStatus } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/subscription', protect, createSubscriptionPayment);
router.get('/:qrcId/status', protect, checkPaymentStatus);

module.exports = router; 