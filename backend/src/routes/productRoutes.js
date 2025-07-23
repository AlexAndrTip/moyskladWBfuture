// backend/src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Импортируем ВЕСЬ объект контроллера продуктов.
// Это гарантирует, что все экспортированные функции будут доступны через 'productController.имяФункции'.
const productController = require('../controllers/productController');


// Маршрут для получения товаров из МойСклад
router.get('/moysklad-products', protect, productController.getMoySkladProducts); // Обратите внимание: GET запрос

// ---МАРШРУТ ДЛЯ ПОЛУЧЕНИЯ МОДИФИКАЦИЙ ИЗ МОЙСКЛАД ---
// @desc     Получить список модификаций из МойСклад
// @route    GET /api/products/moysklad-variants
// @access   Private
router.get('/moysklad-variants', protect, productController.getMoySkladVariants); //

// @route    GET /api/products/moysklad-bundles
// @access   Private
router.get('/moysklad-bundles', protect, productController.getMoySkladBundles); //

// @desc     Получить товары для конкретной интеграции
// @route    GET /api/products/:integrationLinkId
// @access   Private
router.get('/:integrationLinkId', protect, productController.getProductsByIntegration);

// @desc     Запустить принудительную синхронизацию товаров с WB (через API)
// @route    POST /api/products/sync-now
// @access   Private
// Используем productController.syncProductsOnDemand для этого маршрута.
router.post('/sync-now', protect, productController.syncProductsOnDemand);

// @desc     Создать/обновить товары в МойСклад (массово или индивидуально)
// @route    POST /api/products/create-in-ms
// @access   Private
router.post('/create-in-ms', protect, productController.createProductInMoySklad);

// @desc     Создать модификации в МойСклад (массово или индивидуально)
// @route    POST /api/products/create-variants-in-ms
// @access   Private
router.post('/create-variants-in-ms', protect, productController.createVariantsInMoySklad);

// --- НОВЫЙ МАРШРУТ ДЛЯ УДАЛЕНИЯ СВЯЗОК (ИНДИВИДУАЛЬНО) ---
// @desc      Удалить связки МойСклад для конкретного товара
// @route     POST /api/products/unlink
// @access    Private
router.post('/unlink', protect, productController.unlinkProduct);

// --- НОВЫЙ МАРШРУТ ДЛЯ УДАЛЕНИЯ СВЯЗОК (МАССОВО) ---
// @desc      Массовое удаление связок МойСклад для товаров
// @route     POST /api/products/bulk-unlink
// @access    Private
router.post('/bulk-unlink', protect, productController.bulkUnlinkProducts);


// --- НОВЫЙ МАРШРУТ ДЛЯ ОБНОВЛЕНИЯ ПОЛЯ COMPLECT ---
// @desc      Установить статус "Комплект" для товара
// @route     POST /api/products/set-complect
// @access    Private
router.post('/set-complect', protect, productController.setComplectStatus);

// --- НОВЫЙ МАРШРУТ ДЛЯ СОЗДАНИЯ КОМПЛЕКТОВ ---
// @desc      Создать комплект (bundle) в МойСклад
// @route     POST /api/products/create-bundle
// @access    Private
router.post('/create-bundle', protect, productController.createProductBundlesInMoySklad);

// --- НОВЫЙ МАРШРУТ ДЛЯ СВЯЗЫВАНИЯ ТОВАРА/МОДИФИКАЦИИ ---
// @desc      Привязать товар WB (или его размер) к товару/модификации МойСклад
// @route     POST /api/products/link-product
// @access    Private
router.post('/link-product', protect, productController.linkProduct);





// Экспортируем роутер для использования в главном файле приложения (например, server.js или app.js)
module.exports = router;
