const express = require('express');
const { getSubscription, updateSubscription, getAllSubscriptions } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Маршруты для подписок
router.get('/', protect, getSubscription);
router.put('/:userId', protect, updateSubscription);
router.get('/all', protect, getAllSubscriptions);

module.exports = router; 