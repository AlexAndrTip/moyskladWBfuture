const express = require('express');
const { 
  getSubscriptionStatus, 
  getSubscriptionPlans, 
  updateSubscription 
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Получить статус подписки пользователя (требует авторизации)
router.get('/status', protect, getSubscriptionStatus);

// Получить доступные планы подписки (публичный доступ)
router.get('/plans', getSubscriptionPlans);

// Обновить подписку пользователя (требует авторизации)
router.post('/update', protect, updateSubscription);

module.exports = router; 