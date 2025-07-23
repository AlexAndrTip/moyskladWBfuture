const express = require('express');
const router = express.Router();
const uslugiController = require('../controllers/uslugiController');
const { protect } = require('../middleware/authMiddleware');

// Все роуты требуют аутентификации
router.use(protect);

// Синхронизация услуг
router.post('/sync-uslugi', uslugiController.syncUslugi);

// Синхронизация статей расходов
router.post('/sync-stat-rashodov', uslugiController.syncStatRashodov);

// Получение списка услуг для интеграции
router.get('/uslugi/:integrationLinkId', uslugiController.getUslugiByIntegration);

// Получение списка статей расходов для интеграции
router.get('/stat-rashodov/:integrationLinkId', uslugiController.getStatRashodovByIntegration);

// Разорвать все связи услуг для интеграции
router.delete('/uslugi/:integrationLinkId', uslugiController.unlinkUslugiByIntegration);

// Разорвать все связи статей расходов для интеграции
router.delete('/stat-rashodov/:integrationLinkId', uslugiController.unlinkStatRashodovByIntegration);

module.exports = router;
