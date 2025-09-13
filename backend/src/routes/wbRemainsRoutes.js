const express = require('express');
const router = express.Router();
const wbRemainsController = require('../controllers/wbRemainsController');
const { protect } = require('../middleware/authMiddleware');

// Все маршруты требуют аутентификации
router.use(protect);

// @route   POST /api/wb-remains/update-all
// @desc    Обновить остатки FBY для всех кабинетов пользователя
// @access  Private
router.post('/update-all', wbRemainsController.updateAllRemains);

// @route   POST /api/wb-remains/update/:cabinetId
// @desc    Обновить остатки FBY для конкретного кабинета
// @access  Private
router.post('/update/:cabinetId', wbRemainsController.updateCabinetRemains);

// @route   GET /api/wb-remains/stats
// @desc    Получить статистику остатков FBY
// @access  Private
router.get('/stats', wbRemainsController.getRemainsStats);

// @route   GET /api/wb-remains/test/:cabinetId
// @desc    Тестовый метод для проверки API остатков
// @access  Private
router.get('/test/:cabinetId', wbRemainsController.testRemainsApi);

module.exports = router;
