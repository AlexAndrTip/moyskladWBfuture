const express = require('express');
const router = express.Router();
const wbPriceController = require('../controllers/wbPriceController');
const wbPriceControllerWithQueue = require('../controllers/wbPriceControllerWithQueue');
const { protect } = require('../middleware/authMiddleware');

// Все маршруты требуют аутентификации
router.use(protect);

// === СИНХРОННЫЕ МЕТОДЫ (для совместимости) ===

// Получение цен с WB API и обновление БД
// GET /api/wb-prices/update
router.get('/update', wbPriceController.getWbPrices);

// Обновление цен для всех кабинетов пользователя
// GET /api/wb-prices/update-user
router.get('/update-user', wbPriceController.updatePricesForUser);

// Получение статуса последнего обновления цен
// GET /api/wb-prices/status
router.get('/status', wbPriceController.getLastUpdateStatus);

// Обновление цен для конкретного WB кабинета
// GET /api/wb-prices/cabinet/:cabinetId
router.get('/cabinet/:cabinetId', wbPriceController.updatePricesForCabinet);

// Тестирование получения всех товаров с WB API
// GET /api/wb-prices/test-all-goods/:cabinetId
router.get('/test-all-goods/:cabinetId', wbPriceController.testGetAllGoods);

// Тестирование обновления цен для конкретного товара
// GET /api/wb-prices/test-update-product/:cabinetId/:nmID
router.get('/test-update-product/:cabinetId/:nmID', wbPriceController.testUpdateProduct);

// Тестирование токена и получения информации о кабинете
// GET /api/wb-prices/test-token/:cabinetId
router.get('/test-token/:cabinetId', wbPriceController.testToken);

// === АСИНХРОННЫЕ МЕТОДЫ (через очереди) ===

// Добавление задачи обновления цен в очередь
// POST /api/wb-prices/queue-update
router.post('/queue-update', wbPriceControllerWithQueue.queuePriceUpdate);

// Добавление задач обновления цен для всех кабинетов пользователя в очередь
// POST /api/wb-prices/queue-update-all
router.post('/queue-update-all', wbPriceControllerWithQueue.queueUpdateAllPrices);

// Добавление задачи обновления цен для конкретного кабинета в очередь
// POST /api/wb-prices/queue-update/:cabinetId
router.post('/queue-update/:cabinetId', wbPriceControllerWithQueue.queueUpdatePricesForCabinet);

module.exports = router;
