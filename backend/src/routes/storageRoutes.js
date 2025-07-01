// backend/src/routes/storageRoutes.js
const express = require('express');
const { getStorages, createStorage, updateStorage, deleteStorage } = require('../controllers/storageController');
const { protect } = require('../middleware/authMiddleware'); // Нам нужна только защита, роль не важна
const router = express.Router();

// Все эти маршруты защищены, но не требуют определенной роли
router.route('/')
  .get(protect, getStorages)
  .post(protect, createStorage);

router.route('/:id')
  .put(protect, updateStorage)
  .delete(protect, deleteStorage);

module.exports = router;
