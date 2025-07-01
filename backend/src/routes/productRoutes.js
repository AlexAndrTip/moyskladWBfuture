// backend/src/routes/productRoutes.js
const express = require('express');
const { syncProducts, getProductsByIntegration, createProductInMoySklad } = require('../controllers/productController'); // <-- Убедитесь, что createProductInMoySklad импортирован
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/sync', protect, syncProducts);
router.get('/:integrationLinkId', protect, getProductsByIntegration);

// Новый маршрут для создания товара в МойСклад
router.post('/create-in-ms', protect, createProductInMoySklad); // <-- Убедитесь, что этот маршрут есть

module.exports = router;
