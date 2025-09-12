const queueService = require('./queueService');
const wbPriceService = require('../../services/wbPriceService');
const wbRemainsService = require('../../services/wbRemainsService');
const msPriceUpdateService = require('../../services/msPriceUpdateService');
const msStockService = require('../../services/moySkladStockService');
const wbStatisticsService = require('../../services/wbStatisticsService');
const syncService = require('../../services/syncService');

/**
 * Процессор задач очереди
 * Обрабатывает различные типы задач
 */
class TaskProcessor {
  constructor() {
    this.processors = {
      'WB_PRICE_UPDATE': this.processWbPriceUpdate.bind(this),
      'WB_REMAINS_UPDATE': this.processWbRemainsUpdate.bind(this),
      'MS_PRICE_UPDATE': this.processMsPriceUpdate.bind(this),
      'MS_STOCK_UPDATE': this.processMsStockUpdate.bind(this),
      'WB_STATISTICS_UPDATE': this.processWbStatisticsUpdate.bind(this),
      'SYNC_PRODUCTS': this.processSyncProducts.bind(this)
    };
  }

  /**
   * Обработка задачи
   * @param {Object} task - Задача из очереди
   */
  async processTask(task) {
    try {
      console.log(`🔄 [TASK_PROCESSOR] Начинаем обработку задачи ${task._id} типа ${task.type}`);
      
      const processor = this.processors[task.type];
      if (!processor) {
        throw new Error(`Неизвестный тип задачи: ${task.type}`);
      }

      const result = await processor(task);
      
      await queueService.completeTask(task._id, result);
      console.log(`✅ [TASK_PROCESSOR] Задача ${task._id} обработана успешно`);

      return result;

    } catch (error) {
      console.error(`❌ [TASK_PROCESSOR] Ошибка обработки задачи ${task._id}:`, error.message);
      await queueService.failTask(task._id, error);
      throw error;
    }
  }

  /**
   * Обработка обновления цен WB
   * @param {Object} task - Задача
   */
  async processWbPriceUpdate(task) {
    const { cabinetId, userId, limit = 100, offset = 0 } = task.data;
    
    console.log(`💰 [TASK_PROCESSOR] Обновление цен WB для кабинета ${cabinetId}, пользователя ${userId}`);
    
    const result = await wbPriceService.updatePricesForCabinetById(cabinetId, limit, offset);
    
    return {
      type: 'WB_PRICE_UPDATE',
      cabinetId,
      userId,
      result
    };
  }

  /**
   * Обработка обновления остатков WB
   * @param {Object} task - Задача
   */
  async processWbRemainsUpdate(task) {
    const { cabinetId, userId } = task.data;
    
    console.log(`📦 [TASK_PROCESSOR] Обновление остатков WB для кабинета ${cabinetId}, пользователя ${userId}`);
    
    // Получаем токен кабинета
    const WbCabinet = require('../../models/WbCabinet');
    const cabinet = await WbCabinet.findById(cabinetId).select('+token');
    
    if (!cabinet || !cabinet.token) {
      throw new Error(`Кабинет ${cabinetId} не найден или не имеет токена`);
    }
    
    const result = await wbRemainsService.updateFbyRemains(cabinet.token, cabinetId, userId);
    
    return {
      type: 'WB_REMAINS_UPDATE',
      cabinetId,
      userId,
      result
    };
  }

  /**
   * Обработка обновления цен МС
   * @param {Object} task - Задача
   */
  async processMsPriceUpdate(task) {
    const { integrationId, userId } = task.data;
    
    console.log(`💰 [TASK_PROCESSOR] Обновление цен МС для интеграции ${integrationId}, пользователя ${userId}`);
    
    // Получаем токен интеграции
    const IntegrationLink = require('../../models/IntegrationLink');
    const integration = await IntegrationLink.findById(integrationId)
      .populate('storage', 'token');
    
    if (!integration || !integration.storage || !integration.storage.token) {
      throw new Error(`Интеграция ${integrationId} не найдена или не имеет токена`);
    }
    
    const result = await msPriceUpdateService.updateAllPrices(integrationId, integration.storage.token);
    
    return {
      type: 'MS_PRICE_UPDATE',
      integrationId,
      userId,
      result
    };
  }

  /**
   * Обработка обновления остатков МС
   * @param {Object} task - Задача
   */
  async processMsStockUpdate(task) {
    const { integrationId, userId } = task.data;
    
    console.log(`📦 [TASK_PROCESSOR] Обновление остатков МС для интеграции ${integrationId}, пользователя ${userId}`);
    
    // Получаем токен интеграции
    const IntegrationLink = require('../../models/IntegrationLink');
    const integration = await IntegrationLink.findById(integrationId)
      .populate('storage', 'token');
    
    if (!integration || !integration.storage || !integration.storage.token) {
      throw new Error(`Интеграция ${integrationId} не найдена или не имеет токена`);
    }
    
    const result = await msStockService.updateAllStocks(integrationId, integration.storage.token);
    
    return {
      type: 'MS_STOCK_UPDATE',
      integrationId,
      userId,
      result
    };
  }

  /**
   * Обработка обновления статистики WB
   * @param {Object} task - Задача
   */
  async processWbStatisticsUpdate(task) {
    const { cabinetId, userId, dateFrom, dateTo } = task.data;
    
    console.log(`📊 [TASK_PROCESSOR] Обновление статистики WB для кабинета ${cabinetId}, пользователя ${userId}`);
    
    // Получаем токен кабинета
    const WbCabinet = require('../../models/WbCabinet');
    const cabinet = await WbCabinet.findById(cabinetId).select('+token');
    
    if (!cabinet || !cabinet.token) {
      throw new Error(`Кабинет ${cabinetId} не найден или не имеет токена`);
    }
    
    const result = await wbStatisticsService.updateStatistics(cabinet.token, cabinetId, userId, dateFrom, dateTo);
    
    return {
      type: 'WB_STATISTICS_UPDATE',
      cabinetId,
      userId,
      result
    };
  }

  /**
   * Обработка синхронизации товаров
   * @param {Object} task - Задача
   */
  async processSyncProducts(task) {
    const { integrationId, userId } = task.data;
    
    console.log(`🔄 [TASK_PROCESSOR] Синхронизация товаров для интеграции ${integrationId}, пользователя ${userId}`);
    
    const result = await syncService.syncProducts(integrationId, userId);
    
    return {
      type: 'SYNC_PRODUCTS',
      integrationId,
      userId,
      result
    };
  }

  /**
   * Получение списка доступных процессоров
   */
  getAvailableProcessors() {
    return Object.keys(this.processors);
  }

  /**
   * Проверка, поддерживается ли тип задачи
   * @param {string} type - Тип задачи
   */
  isSupportedTaskType(type) {
    return type in this.processors;
  }
}

module.exports = new TaskProcessor();
