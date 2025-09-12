const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { protect } = require('../../middleware/authMiddleware');

// Все маршруты требуют аутентификации
router.use(protect);

// @route   POST /api/queue/tasks
// @desc    Добавить задачу в очередь
// @access  Private
router.post('/tasks', queueController.addTask);

// @route   GET /api/queue/tasks
// @desc    Получить задачи пользователя
// @access  Private
router.get('/tasks', queueController.getUserTasks);

// @route   GET /api/queue/tasks/:taskId
// @desc    Получить задачу по ID
// @access  Private
router.get('/tasks/:taskId', queueController.getTaskById);

// @route   DELETE /api/queue/tasks/:taskId
// @desc    Отменить задачу
// @access  Private
router.delete('/tasks/:taskId', queueController.cancelTask);

// @route   GET /api/queue/stats
// @desc    Получить статистику очередей
// @access  Private
router.get('/stats', queueController.getQueueStats);

// @route   DELETE /api/queue/cleanup
// @desc    Очистить старые задачи
// @access  Private
router.delete('/cleanup', queueController.cleanupOldTasks);

module.exports = router;
