const queueService = require('../services/queueService');
const QueueTask = require('../models/QueueTask');

/**
 * Контроллер для управления очередями задач
 */
class QueueController {
  constructor() {
    this.addTask = this.addTask.bind(this);
    this.getUserTasks = this.getUserTasks.bind(this);
    this.getTaskById = this.getTaskById.bind(this);
    this.cancelTask = this.cancelTask.bind(this);
    this.getQueueStats = this.getQueueStats.bind(this);
    this.cleanupOldTasks = this.cleanupOldTasks.bind(this);
  }

  /**
   * Добавление задачи в очередь
   * POST /api/queue/tasks
   */
  async addTask(req, res) {
    try {
      const userId = req.user._id;
      const { type, data, options = {} } = req.body;

      // Валидация типа задачи
      const validTypes = [
        'WB_PRICE_UPDATE',
        'WB_REMAINS_UPDATE', 
        'MS_PRICE_UPDATE',
        'MS_STOCK_UPDATE',
        'WB_STATISTICS_UPDATE',
        'SYNC_PRODUCTS'
      ];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Неверный тип задачи. Доступные типы: ${validTypes.join(', ')}`
        });
      }

      // Валидация данных в зависимости от типа задачи
      const validationResult = this.validateTaskData(type, data);
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.error
        });
      }

      // Добавляем задачу в очередь
      const result = await queueService.addTask(type, data, userId, options);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Задача добавлена в очередь',
          data: {
            taskId: result.taskId
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Ошибка добавления задачи в очередь',
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ [QUEUE_CONTROLLER] Ошибка добавления задачи:', error.message);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  }

  /**
   * Получение задач пользователя
   * GET /api/queue/tasks
   */
  async getUserTasks(req, res) {
    try {
      const userId = req.user._id;
      const { status, type, limit = 50, offset = 0 } = req.query;

      // Строим запрос
      const query = { userId };
      if (status) query.status = status;
      if (type) query.type = type;

      // Получаем задачи
      const tasks = await QueueTask.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

      // Получаем общее количество
      const total = await QueueTask.countDocuments(query);

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: offset + tasks.length < total
          }
        }
      });

    } catch (error) {
      console.error('❌ [QUEUE_CONTROLLER] Ошибка получения задач пользователя:', error.message);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения задач',
        error: error.message
      });
    }
  }

  /**
   * Получение задачи по ID
   * GET /api/queue/tasks/:taskId
   */
  async getTaskById(req, res) {
    try {
      const userId = req.user._id;
      const { taskId } = req.params;

      const task = await QueueTask.findOne({ _id: taskId, userId });

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Задача не найдена'
        });
      }

      res.json({
        success: true,
        data: task
      });

    } catch (error) {
      console.error('❌ [QUEUE_CONTROLLER] Ошибка получения задачи:', error.message);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения задачи',
        error: error.message
      });
    }
  }

  /**
   * Отмена задачи
   * DELETE /api/queue/tasks/:taskId
   */
  async cancelTask(req, res) {
    try {
      const userId = req.user._id;
      const { taskId } = req.params;

      // Проверяем, что задача принадлежит пользователю
      const task = await QueueTask.findOne({ _id: taskId, userId });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Задача не найдена'
        });
      }

      // Отменяем задачу
      const result = await queueService.cancelTask(taskId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Задача отменена'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Ошибка отмены задачи',
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ [QUEUE_CONTROLLER] Ошибка отмены задачи:', error.message);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  }

  /**
   * Получение статистики очередей
   * GET /api/queue/stats
   */
  async getQueueStats(req, res) {
    try {
      const stats = await queueService.getQueueStats();

      if (stats.success) {
        res.json({
          success: true,
          data: stats.data
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Ошибка получения статистики',
          error: stats.error
        });
      }

    } catch (error) {
      console.error('❌ [QUEUE_CONTROLLER] Ошибка получения статистики:', error.message);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  }

  /**
   * Очистка старых задач
   * DELETE /api/queue/cleanup
   */
  async cleanupOldTasks(req, res) {
    try {
      const { daysOld = 7 } = req.body;

      const result = await queueService.cleanupOldTasks(daysOld);

      if (result.success) {
        res.json({
          success: true,
          message: `Удалено ${result.deletedCount} старых задач`,
          data: {
            deletedCount: result.deletedCount
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Ошибка очистки старых задач',
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ [QUEUE_CONTROLLER] Ошибка очистки старых задач:', error.message);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  }

  /**
   * Валидация данных задачи
   * @param {string} type - Тип задачи
   * @param {Object} data - Данные задачи
   */
  validateTaskData(type, data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Данные задачи должны быть объектом' };
    }

    switch (type) {
      case 'WB_PRICE_UPDATE':
        if (!data.cabinetId) {
          return { valid: false, error: 'cabinetId обязателен для WB_PRICE_UPDATE' };
        }
        break;

      case 'WB_REMAINS_UPDATE':
        if (!data.cabinetId) {
          return { valid: false, error: 'cabinetId обязателен для WB_REMAINS_UPDATE' };
        }
        break;

      case 'MS_PRICE_UPDATE':
        if (!data.integrationId) {
          return { valid: false, error: 'integrationId обязателен для MS_PRICE_UPDATE' };
        }
        break;

      case 'MS_STOCK_UPDATE':
        if (!data.integrationId) {
          return { valid: false, error: 'integrationId обязателен для MS_STOCK_UPDATE' };
        }
        break;

      case 'WB_STATISTICS_UPDATE':
        if (!data.cabinetId) {
          return { valid: false, error: 'cabinetId обязателен для WB_STATISTICS_UPDATE' };
        }
        break;

      case 'SYNC_PRODUCTS':
        if (!data.integrationId) {
          return { valid: false, error: 'integrationId обязателен для SYNC_PRODUCTS' };
        }
        break;

      default:
        return { valid: false, error: 'Неизвестный тип задачи' };
    }

    return { valid: true };
  }
}

module.exports = new QueueController();
