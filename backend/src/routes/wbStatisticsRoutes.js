const express = require('express');
const router = express.Router();
const wbStatisticsController = require('../controllers/wbStatisticsController');
const { protect } = require('../middleware/authMiddleware');

// Применяем middleware аутентификации ко всем маршрутам
router.use(protect);

/**
 * @route   POST /api/wb-statistics/update-all-stocks
 * @desc    Обновить остатки FBY для всех кабинетов пользователя через Statistics API
 * @access  Private
 * @body    { dateFrom?: string, filters?: object }
 */
router.post('/update-all-stocks', wbStatisticsController.updateAllStocks);

/**
 * @route   POST /api/wb-statistics/update-stocks/:cabinetId
 * @desc    Обновить остатки FBY для конкретного кабинета через Statistics API
 * @access  Private
 * @body    { dateFrom?: string, filters?: object }
 */
router.post('/update-stocks/:cabinetId', wbStatisticsController.updateCabinetStocks);

/**
 * @route   GET /api/wb-statistics/stocks/:cabinetId
 * @desc    Получить отфильтрованные остатки FBY без сохранения в БД
 * @access  Private
 * @query   { dateFrom?: string, warehouseName?: string, supplierArticle?: string, nmId?: number, barcode?: string, quantity?: number, category?: string, subject?: string, brand?: string, techSize?: string, Price?: number, Discount?: number }
 */
router.get('/stocks/:cabinetId', wbStatisticsController.getFilteredStocks);

/**
 * @route   GET /api/wb-statistics/stats
 * @desc    Получить статистику остатков FBY
 * @access  Private
 */
router.get('/stats', wbStatisticsController.getStocksStats);

/**
 * @route   GET /api/wb-statistics/test/:cabinetId
 * @desc    Тестовый метод для проверки Statistics API
 * @access  Private
 * @query   { dateFrom?: string }
 */
router.get('/test/:cabinetId', wbStatisticsController.testStatisticsApi);

module.exports = router;
