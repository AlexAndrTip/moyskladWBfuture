const queueService = require('./queueService');
const taskProcessor = require('./taskProcessor');
const os = require('os');

/**
 * Сервис воркера для обработки задач из очереди
 */
class WorkerService {
  constructor() {
    this.workerId = `${os.hostname()}-${process.pid}-${Date.now()}`;
    this.isRunning = false;
    this.currentTask = null;
    this.processedTasks = 0;
    this.failedTasks = 0;
    this.startTime = null;
    this.supportedTypes = ['WB_PRICE_UPDATE', 'WB_REMAINS_UPDATE', 'MS_PRICE_UPDATE', 'MS_STOCK_UPDATE', 'WB_STATISTICS_UPDATE', 'SYNC_PRODUCTS'];
    this.pollInterval = 5000; // 5 секунд
    this.pollTimer = null;
  }

  /**
   * Запуск воркера
   * @param {Array} taskTypes - Типы задач для обработки (если не указаны, обрабатывает все)
   */
  async start(taskTypes = null) {
    try {
      console.log(`🚀 [WORKER_SERVICE] Запуск воркера ${this.workerId}`);
      
      // Инициализируем подключение к Redis
      const redisConnected = await queueService.initialize();
      if (!redisConnected) {
        throw new Error('Не удалось подключиться к Redis');
      }

      this.isRunning = true;
      this.startTime = new Date();
      this.supportedTypes = taskTypes || this.supportedTypes;

      console.log(`✅ [WORKER_SERVICE] Воркер ${this.workerId} запущен`);
      console.log(`📋 [WORKER_SERVICE] Поддерживаемые типы задач: ${this.supportedTypes.join(', ')}`);

      // Начинаем опрос очередей
      this.startPolling();

      // Обработка сигналов завершения
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());

      return true;

    } catch (error) {
      console.error(`❌ [WORKER_SERVICE] Ошибка запуска воркера:`, error.message);
      return false;
    }
  }

  /**
   * Остановка воркера
   */
  async stop() {
    try {
      console.log(`🛑 [WORKER_SERVICE] Остановка воркера ${this.workerId}`);
      
      this.isRunning = false;
      
      if (this.pollTimer) {
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
      }

      // Если есть текущая задача, помечаем её как неудачную
      if (this.currentTask) {
        console.log(`⚠️ [WORKER_SERVICE] Прерывание текущей задачи ${this.currentTask._id}`);
        await queueService.failTask(this.currentTask._id, new Error('Воркер остановлен'));
        this.currentTask = null;
      }

      // Закрываем соединение с Redis
      await queueService.close();

      console.log(`✅ [WORKER_SERVICE] Воркер ${this.workerId} остановлен`);
      console.log(`📊 [WORKER_SERVICE] Статистика:`);
      console.log(`   - Обработано задач: ${this.processedTasks}`);
      console.log(`   - Неудачных задач: ${this.failedTasks}`);
      console.log(`   - Время работы: ${this.getUptime()}`);

      process.exit(0);

    } catch (error) {
      console.error(`❌ [WORKER_SERVICE] Ошибка остановки воркера:`, error.message);
      process.exit(1);
    }
  }

  /**
   * Запуск опроса очередей
   */
  startPolling() {
    if (!this.isRunning) return;

    this.pollTimer = setTimeout(async () => {
      try {
        await this.pollQueues();
      } catch (error) {
        console.error(`❌ [WORKER_SERVICE] Ошибка опроса очередей:`, error.message);
      } finally {
        this.startPolling();
      }
    }, this.pollInterval);
  }

  /**
   * Опрос очередей на наличие задач
   */
  async pollQueues() {
    if (!this.isRunning || this.currentTask) return;

    for (const taskType of this.supportedTypes) {
      try {
        const task = await queueService.getNextTask(taskType, this.workerId);
        
        if (task) {
          console.log(`📥 [WORKER_SERVICE] Получена задача ${task._id} типа ${taskType}`);
          await this.processTask(task);
          break; // Обрабатываем по одной задаче за раз
        }
      } catch (error) {
        console.error(`❌ [WORKER_SERVICE] Ошибка получения задачи типа ${taskType}:`, error.message);
      }
    }
  }

  /**
   * Обработка задачи
   * @param {Object} task - Задача
   */
  async processTask(task) {
    try {
      this.currentTask = task;
      console.log(`🔄 [WORKER_SERVICE] Обработка задачи ${task._id} типа ${task.type}`);

      const startTime = Date.now();
      const result = await taskProcessor.processTask(task);
      const duration = Date.now() - startTime;

      this.processedTasks++;
      console.log(`✅ [WORKER_SERVICE] Задача ${task._id} обработана за ${duration}ms`);

      return result;

    } catch (error) {
      this.failedTasks++;
      console.error(`❌ [WORKER_SERVICE] Ошибка обработки задачи ${task._id}:`, error.message);
      throw error;
    } finally {
      this.currentTask = null;
    }
  }

  /**
   * Получение статистики воркера
   */
  getStats() {
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.getUptime(),
      processedTasks: this.processedTasks,
      failedTasks: this.failedTasks,
      currentTask: this.currentTask ? {
        id: this.currentTask._id,
        type: this.currentTask.type,
        startedAt: this.currentTask.startedAt
      } : null,
      supportedTypes: this.supportedTypes
    };
  }

  /**
   * Получение времени работы воркера
   */
  getUptime() {
    if (!this.startTime) return 0;
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Получение информации о системе
   */
  getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      }
    };
  }

  /**
   * Установка интервала опроса
   * @param {number} interval - Интервал в миллисекундах
   */
  setPollInterval(interval) {
    this.pollInterval = interval;
    console.log(`⏱️ [WORKER_SERVICE] Интервал опроса установлен: ${interval}ms`);
  }

  /**
   * Добавление поддержки нового типа задач
   * @param {string} taskType - Тип задачи
   */
  addSupportedTaskType(taskType) {
    if (!this.supportedTypes.includes(taskType)) {
      this.supportedTypes.push(taskType);
      console.log(`➕ [WORKER_SERVICE] Добавлена поддержка типа задач: ${taskType}`);
    }
  }

  /**
   * Удаление поддержки типа задач
   * @param {string} taskType - Тип задач
   */
  removeSupportedTaskType(taskType) {
    const index = this.supportedTypes.indexOf(taskType);
    if (index > -1) {
      this.supportedTypes.splice(index, 1);
      console.log(`➖ [WORKER_SERVICE] Удалена поддержка типа задач: ${taskType}`);
    }
  }
}

module.exports = new WorkerService();
