// backend/src/routes/userRoutes.js
const express = require('express');
const { getUsers, createUser, deleteUser } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Все эти маршруты требуют аутентификации и роли "admin"
router.route('/')
  .get(protect, authorizeRoles('admin'), getUsers)
  .post(protect, authorizeRoles('admin'), createUser);

router.route('/:id')
  .delete(protect, authorizeRoles('admin'), deleteUser);

module.exports = router;