// backend/src/routes/organizationRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const organizationController = require('../controllers/organizationController');

// Маршруты для собственных организаций пользователя (существующие)
router.route('/')
  .get(protect, organizationController.getOrganizations)
  .post(protect, organizationController.createOrganization);

router.route('/:id')
  .get(protect, organizationController.getOrganization)
  .put(protect, organizationController.updateOrganization)
  .delete(protect, organizationController.deleteOrganization);

// --- НОВЫЕ МАРШРУТЫ ДЛЯ СВЯЗОК СУЩНОСТЕЙ МОЙСКЛАД (ОБНОВЛЕННЫЕ НАЗВАНИЯ) ---

// Получение, создание/обновление, удаление связки МойСклад сущностей для интеграции
router.route('/link/:integrationLinkId') // Обновлен путь с 'moysklad-link' на 'link'
  .get(protect, organizationController.getOrganizationLink) // Обновлено имя функции контроллера
  .delete(protect, organizationController.deleteOrganizationLink); // Обновлено имя функции контроллера

router.route('/link') // Обновлен путь с 'moysklad-link' на 'link'
  .post(protect, organizationController.createOrUpdateOrganizationLink); // Обновлено имя функции контроллера

// --- НОВЫЕ МАРШРУТЫ ДЛЯ ПОЛУЧЕНИЯ СПИСКОВ СУЩНОСТЕЙ ИЗ МОЙСКЛАД API ---

// Получение списка организаций из МойСклад
router.get('/moysklad-list/organizations/:integrationLinkId', protect, organizationController.getMoyskladOrganizationsList);

// Получение списка контрагентов из МойСклад
router.get('/moysklad-list/counterparties/:integrationLinkId', protect, organizationController.getMoyskladCounterpartiesList);

// Получение списка складов из МойСклад
router.get('/moysklad-list/stores/:integrationLinkId', protect, organizationController.getMoyskladStoresList);

// Получение списка договоров из МойСклад (заглушка)
router.get('/moysklad-list/contracts/:integrationLinkId', protect, organizationController.getMoyskladContractsList);

// НОВЫЙ МАРШРУТ: Создание организации в МойСклад
router.post('/moysklad-create/organization', protect, organizationController.createMoyskladOrganization);

// НОВЫЙ МАРШРУТ: Создание контрагента в МойСклад
router.post('/moysklad-create/counterparty', protect, organizationController.createMoyskladCounterparty);

router.post('/moysklad-create/contract', protect, organizationController.createMoyskladContract);

// НОВЫЙ МАРШРУТ: Создание склада в МойСклад
router.post('/moysklad-create/store', protect, organizationController.createMoyskladStore);



module.exports = router;
