// backend/src/routes/authRoutes.js
const express = require('express');
const { login, register } = require('../controllers/authController');
const router = express.Router();

router.post('/login', login);
router.post('/register', register); // Используйте этот маршрут для первого создания админа

module.exports = router;