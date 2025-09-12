const QueueTask = require('../models/QueueTask');
const Redis = require('ioredis');

/**
 * Сервис для работы с очередями задач
 * Использует Redis для быстрого доступа к задачам и MongoDB для хранения детальной информации
 */
class QueueService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.queues = {
      'WB_PRICE_UPDATE': 'queue:wb:price',
      'WB_REMAINS_UPDATE': 'queue:wb:remains',
      'MS_PRICE_UPDATE': 'queue:ms:price',
      'MS_STOCK_UPDATE': 'queue:ms:stock',
      'WB_STATISTICS_UPDATE': 'queue:wb:statistics',
      'SYNC_PRODUCTS': 'queue:sync:products'
    };
  }

  /**
   * Инициализация подключения к Redis
   */
  async initialize() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('✅ [QUEUE_SERVICE] Подключение к Redis установлено');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ [QUEUE_SERVICE] Ошибка Redis:', error.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('⚠️ [QUEUE_SERVICE] Подключение к Redis закрыто');
        this.isConnected = false;
      });

      await this.redis.connect();
      return true;
    } catch (error) {
      console.error('❌ [QUEUE_SERVICE] Ошибка инициализации Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Добавление задачи в очередь
   * @param {string} type - Тип задачи
   * @param {Object} data - Данные задачи
   * @param {string} userId - ID пользователя
   * @param {Object} options - Дополнительные опции
   */
  async addTask(type, data, userId, options = {}) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis не подключен');
      }

      // Создаем задачу в MongoDB
      const task = new QueueTask({
        type,
        data,
        userId,
        priority: options.priority || 5,
        maxAttempts: options.maxAttempts || 3,
        metadata: {
          cabinetName: options.cabinetName,
          integrationName: options.integrationName,
          estimatedDuration: options.estimatedDuration,
          tags: options.tags || []
        }
      });

      await task.save();

      // Добавляем задачу в Redis очередь
      const queueName = this.queues[type];
      if (!queueName) {
        throw new Error(`Неизвестный тип задачи: ${type}`);
      }

      const taskData = {
        taskId: task._id.toString(),
        priority: task.priority,
        createdAt: task.createdAt.getTime()
      };

      // Используем sorted set для приоритизации
      await this.redis.zadd(queueName, task.priority, JSON.stringify(taskData));

      console.log(`✅ [QUEUE_SERVICE] Задача ${type} добавлена в очередь. ID: ${task._id}`);
      
      return {
        success: true,
        taskId: task._id,
        message: 'Задача добавлена в очередь'
      };

    } catch (error) {
      console.error(`❌ [QUEUE_SERVICE] Ошибка добавления задачи ${type}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получение следующей задачи из очереди
   * @param {string} type - Тип задачи
   * @param {string} workerId - ID воркера
   */
  async getNextTask(type, workerId) {
    try {
      if (!this.isConnected) {
        throw new Error('Redis не подключен');
      }

      const queueName = this.queues[type];
      if (!queueName) {
        throw new Error(`Неизвестный тип задачи: ${type}`);
      }

      // Получаем задачу с наивысшим приоритетом
      const result = await this.redis.zpopmax(queueName);
      
      if (!result || result.length === 0) {
        return null;
      }

      const taskData = JSON.parse(result[0]);
      const task = await QueueTask.findById(taskData.taskId);

      if (!task) {
        console.warn(`⚠️ [QUEUE_SERVICE] Задача ${taskData.taskId} не найдена в MongoDB`);
        return null;
      }

      if (task.status !== 'PENDING') {
        console.warn(`⚠️ [QUEUE_SERVICE] Задача ${taskData.taskId} уже обрабатывается`);
        return null;
      }

      // Помечаем задачу как обрабатываемую
      await task.markAsProcessing(workerId);

      return task;

    } catch (error) {
      console.error(`❌ [QUEUE_SERVICE] Ошибка получения задачи ${type}:`, error.message);
      return null;
    }
  }

  /**
   * Завершение задачи
   * @param {string} taskId - ID задачи
   * @param {Object} result - Результат выполнения
   */
  async completeTask(taskId, result) {
    try {
      const task = await QueueTask.findById(taskId);
      if (!task) {
        throw new Error(`Задача ${taskId} не найдена`);
      }

      await task.markAsCompleted(result);
      console.log(`✅ [QUEUE_SERVICE] Задача ${taskId} завершена успешно`);

      return { success: true };

    } catch (error) {
      console.error(`❌ [QUEUE_SERVICE] Ошибка завершения задачи ${taskId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ошибка выполнения задачи
   * @param {string} taskId - ID задачи
   * @param {Error} error - Ошибка
   */
  async failTask(taskId, error) {
    try {
      const task = await QueueTask.findById(taskId);
      if (!task) {
        throw new Error(`Задача ${taskId} не найдена`);
      }

      await task.markAsFailed(error);

      // Если задача может быть повторена, добавляем её обратно в очередь
      if (task.isRetryable) {
        const queueName = this.queues[task.type];
        const taskData = {
          taskId: task._id.toString(),
          priority: task.priority,
          createdAt: task.createdAt.getTime()
        };
        
        await this.redis.zadd(queueName, task.priority, JSON.stringify(taskData));
        console.log(`🔄 [QUEUE_SERVICE] Задача ${taskId} запланирована для повтора`);
      } else {
        console.log(`❌ [QUEUE_SERVICE] Задача ${taskId} завершена с ошибкой (превышено количество попыток)`);
      }

      return { success: true };

    } catch (err) {
      console.error(`❌ [QUEUE_SERVICE] Ошибка обработки неудачи задачи ${taskId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Отмена задачи
   * @param {string} taskId - ID задачи
   */
  async cancelTask(taskId) {
    try {
      const task = await QueueTask.findById(taskId);
      if (!task) {
        throw new Error(`Задача ${taskId} не найдена`);
      }

      if (task.status === 'PROCESSING') {
        throw new Error('Нельзя отменить задачу, которая выполняется');
      }

      await task.cancel();
      console.log(`🚫 [QUEUE_SERVICE] Задача ${taskId} отменена`);

      return { success: true };

    } catch (error) {
      console.error(`❌ [QUEUE_SERVICE] Ошибка отмены задачи ${taskId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получение статистики очередей
   */
  async getQueueStats() {
    try {
      const stats = {};
      
      for (const [type, queueName] of Object.entries(this.queues)) {
        const queueLength = await this.redis.zcard(queueName);
        const taskStats = await QueueTask.getTaskStats();
        
        stats[type] = {
          queueLength,
          taskStats: taskStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        };
      }

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ [QUEUE_SERVICE] Ошибка получения статистики:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получение задач пользователя
   * @param {string} userId - ID пользователя
   * @param {string} status - Статус задач (опционально)
   */
  async getUserTasks(userId, status = null) {
    try {
      const tasks = await QueueTask.getTasksByUser(userId, status);
      
      return {
        success: true,
        data: tasks
      };

    } catch (error) {
      console.error(`❌ [QUEUE_SERVICE] Ошибка получения задач пользователя ${userId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Очистка старых завершенных задач
   * @param {number} daysOld - Количество дней
   */
  async cleanupOldTasks(daysOld = 7) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await QueueTask.deleteMany({
        status: { $in: ['COMPLETED', 'FAILED', 'CANCELLED'] },
        completedAt: { $lt: cutoffDate }
      });

      console.log(`🧹 [QUEUE_SERVICE] Удалено ${result.deletedCount} старых задач`);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };

    } catch (error) {
      console.error('❌ [QUEUE_SERVICE] Ошибка очистки старых задач:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Закрытие соединения с Redis
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      console.log('🔌 [QUEUE_SERVICE] Соединение с Redis закрыто');
    }
  }
}

module.exports = new QueueService();
