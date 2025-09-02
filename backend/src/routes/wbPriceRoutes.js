const express = require('express');
const router = express.Router();
const wbPriceController = require('../controllers/wbPriceController');
const { protect } = require('../middleware/authMiddleware');

// Получение цен с WB API и обновление БД
// GET /api/wb-prices/update
router.get('/update', protect, wbPriceController.getWbPrices);

// Получение статуса последнего обновления цен
// GET /api/wb-prices/status
router.get('/status', protect, wbPriceController.getLastUpdateStatus);

// Обновление цен для конкретного WB кабинета
// GET /api/wb-prices/cabinet/:cabinetId
router.get('/cabinet/:cabinetId', protect, wbPriceController.updatePricesForCabinet);

// Тестирование получения всех товаров с WB API
// GET /api/wb-prices/test-all-goods/:cabinetId
router.get('/test-all-goods/:cabinetId', protect, wbPriceController.testGetAllGoods);

// Тестирование обновления цен для конкретного товара
// GET /api/wb-prices/test-update-product/:cabinetId/:nmID
router.get('/test-update-product/:cabinetId/:nmID', protect, wbPriceController.testUpdateProduct);

// Тестирование токена и получения информации о кабинете
// GET /api/wb-prices/test-token/:cabinetId
router.get('/test-token/:cabinetId', protect, wbPriceController.testToken);

module.exports = router; 