const express = require('express');
const router = express.Router();
const MsPriceController = require('../controllers/msPriceController');
const { protect } = require('../middleware/authMiddleware');

const msPriceController = new MsPriceController();

// Все маршруты требуют авторизации
router.use(protect);

/**
 * @route POST /api/ms-prices/:integrationId/update
 * @desc Обновляет цены МойСклад для всех товаров интеграции
 * @access Private
 */
router.post('/:integrationId/update', msPriceController.updatePrices.bind(msPriceController));

/**
 * @route POST /api/ms-prices/:integrationId/update-single-size
 * @desc Обновляет цены для товаров с одним размером
 * @access Private
 */
router.post('/:integrationId/update-single-size', msPriceController.updateSingleSizePrices.bind(msPriceController));

/**
 * @route POST /api/ms-prices/:integrationId/update-multi-size
 * @desc Обновляет цены для товаров с несколькими размерами
 * @access Private
 */
router.post('/:integrationId/update-multi-size', msPriceController.updateMultiSizePrices.bind(msPriceController));

/**
 * @route GET /api/ms-prices/:integrationId/stats
 * @desc Получает статистику по ценам МойСклад
 * @access Private
 */
router.get('/:integrationId/stats', msPriceController.getPriceStats.bind(msPriceController));

/**
 * @route POST /api/ms-prices/:integrationId/product/:productId/update
 * @desc Обновляет цены для конкретного товара
 * @access Private
 */
router.post('/:integrationId/product/:productId/update', msPriceController.updateProductPrices.bind(msPriceController));

module.exports = router;
