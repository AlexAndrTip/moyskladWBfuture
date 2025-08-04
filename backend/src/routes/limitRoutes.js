const express = require('express');
const { getUserLimits } = require('../controllers/limitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Получить лимиты текущего пользователя
router.get('/', protect, getUserLimits);

module.exports = router; 