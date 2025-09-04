const express = require('express');
const router = express.Router();
const MsCostController = require('../controllers/msCostController');
const { protect } = require('../middleware/authMiddleware');

const msCostController = new MsCostController();

// Все маршруты требуют авторизации
router.use(protect);

/**
 * @route   PUT /api/ms-costs/all
 * @desc    Обновляет себестоимость МойСклад для всех интеграций
 * @access  Private
 */
router.put('/all', msCostController.updateAllIntegrationsCosts.bind(msCostController));

/**
 * @route   PUT /api/ms-costs/:integrationId
 * @desc    Обновляет себестоимость МойСклад для всех товаров интеграции
 * @access  Private
 */
router.put('/:integrationId', msCostController.updateCosts.bind(msCostController));

/**
 * @route   PUT /api/ms-costs/:integrationId/product/:productId
 * @desc    Обновляет себестоимость МойСклад для конкретного товара
 * @access  Private
 */
router.put('/:integrationId/product/:productId', msCostController.updateProductCosts.bind(msCostController));

/**
 * @route   GET /api/ms-costs/:integrationId/stats
 * @desc    Получает статистику по себестоимости МойСклад для интеграции
 * @access  Private
 */
router.get('/:integrationId/stats', msCostController.getCostStats.bind(msCostController));

module.exports = router;
