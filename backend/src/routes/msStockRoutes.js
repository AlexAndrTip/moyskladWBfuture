// backend/src/routes/msStockRoutes.js

const express = require('express');
const router = express.Router();
const msStockController = require('../controllers/msStockController');
const { protect } = require('../middleware/authMiddleware');

// Все маршруты требуют аутентификации
router.use(protect);

// @route   POST /api/ms-stock/update-all
// @desc    Обновить остатки МойСклад для всех интеграций пользователя
// @access  Private
router.post('/update-all', msStockController.updateAllStock);

// @route   POST /api/ms-stock/update/:integrationLinkId
// @desc    Обновить остатки МойСклад для конкретной интеграционной связки
// @access  Private
router.post('/update/:integrationLinkId', msStockController.updateIntegrationStock);

// @route   GET /api/ms-stock/stats
// @desc    Получить статистику остатков МойСклад
// @access  Private
router.get('/stats', msStockController.getStockStats);

// @route   GET /api/ms-stock/test/:integrationLinkId
// @desc    Тестовый метод для проверки API остатков МойСклад
// @access  Private
router.get('/test/:integrationLinkId', msStockController.testStockApi);

module.exports = router;
