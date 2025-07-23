const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const postavkiController = require('../controllers/postavkiController');

router.use(protect);

// Получить поставки по integrationLinkId (только из БД)
router.get('/:integrationLinkId', postavkiController.getPostavki);

// Обновить поставки из WB API
router.post('/:integrationLinkId/refresh', postavkiController.refreshPostavkiFromWB);

// Создать отгрузку в МойСклад по integrationLinkId и incomeId
router.post('/:integrationLinkId/demand/:incomeId', postavkiController.createDemand);

// Удалить ms_href у поставки
router.delete('/:integrationLinkId/demand/:incomeId', postavkiController.deleteDemandMsHref);

module.exports = router; 