const wbPriceService = require('../services/wbPriceService');
const queueService = require('../queue/services/queueService');

/**
 * Контроллер для управления ценами WB с использованием очередей
 * Это пример рефакторинга существующего контроллера
 */
class WbPriceControllerWithQueue {
  constructor() {
    // Привязываем методы к экземпляру класса
    this.getWbPrices = this.getWbPrices.bind(this);
    this.updatePricesForUser = this.updatePricesForUser.bind(this);
    this.updatePricesForCabinet = this.updatePricesForCabinet.bind(this);
    this.getLastUpdateStatus = this.getLastUpdateStatus.bind(this);
    this.testToken = this.testToken.bind(this);
  }

  /**
   * Добавление задачи обновления цен в очередь (новый метод)
   * POST /api/wb-prices/queue-update
   */
  async queuePriceUpdate(req, res) {
    try {
      const userId = req.user._id;
      const { cabinetId, limit = 100, offset = 0, priority = 5 } = req.body;

      console.log(`🚀 [WB_PRICE_CONTROLLER] Добавление задачи обновления цен в очередь для пользователя: ${userId}`);

      // Валидация
      if (!cabinetId) {
        return res.status(400).json({
          success: false,
          message: 'cabinetId обязателен'
        });
      }

      // Получаем информацию о кабинете для метаданных
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findById(cabinetId);
      
      if (!cabinet) {
        return res.status(404).json({
          success: false,
          message: 'WB кабинет не найден'
        });
      }

      // Добавляем задачу в очередь
      const result = await queueService.addTask('WB_PRICE_UPDATE', {
        cabinetId,
        userId,
        limit,
        offset
      }, userId, {
        priority,
        cabinetName: cabinet.name,
        maxAttempts: 3,
        estimatedDuration: 300 // 5 минут
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Задача обновления цен добавлена в очередь',
          data: {
            taskId: result.taskId,
            cabinetName: cabinet.name,
            estimatedDuration: '5 минут'
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
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка добавления задачи в очередь:', error.message);
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  }

  /**
   * Получение цен с WB API для списка товаров (синхронный метод - оставляем для совместимости)
   * GET /api/wb-prices/update
   */
  async getWbPrices(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const userId = req.user._id; // Получаем ID пользователя из токена
      
      console.log(`🚀 [WB_PRICE_CONTROLLER] Начало синхронного обновления цен с WB API для пользователя: ${userId}`);
      
      const result = await wbPriceService.getPricesForProducts(limit, offset, userId);
      
      res.json({
        success: true,
        message: 'Обновление цен завершено',
        data: result
      });

    } catch (error) {
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в getWbPrices:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при получении цен с WB API',
        error: error.message 
      });
    }
  }

  /**
   * Обновление цен для всех кабинетов пользователя через очередь
   * POST /api/wb-prices/queue-update-all
   */
  async queueUpdateAllPrices(req, res) {
    try {
      const userId = req.user._id;
      const { priority = 5 } = req.body;
      
      console.log(`🚀 [WB_PRICE_CONTROLLER] Добавление задач обновления цен для всех кабинетов пользователя: ${userId}`);

      // Получаем все кабинеты пользователя
      const WbCabinet = require('../models/WbCabinet');
      const wbCabinets = await WbCabinet.find({ user: userId }).select('+token');
      
      if (!wbCabinets || wbCabinets.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'У вас нет настроенных WB кабинетов' 
        });
      }

      const results = [];
      let totalTasks = 0;

      // Добавляем задачу для каждого кабинета
      for (const cabinet of wbCabinets) {
        try {
          console.log(`🚀 [WB_PRICE_CONTROLLER] Добавляем задачу для кабинета: ${cabinet.name}`);
          
          const result = await queueService.addTask('WB_PRICE_UPDATE', {
            cabinetId: cabinet._id,
            userId,
            limit: 100,
            offset: 0
          }, userId, {
            priority,
            cabinetName: cabinet.name,
            maxAttempts: 3,
            estimatedDuration: 300
          });

          if (result.success) {
            results.push({
              cabinetId: cabinet._id,
              cabinetName: cabinet.name,
              taskId: result.taskId,
              success: true
            });
            totalTasks++;
          } else {
            results.push({
              cabinetId: cabinet._id,
              cabinetName: cabinet.name,
              success: false,
              error: result.error
            });
          }

        } catch (error) {
          console.error(`❌ [WB_PRICE_CONTROLLER] Ошибка при добавлении задачи для кабинета ${cabinet.name}:`, error.message);
          
          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `Добавлено ${totalTasks} задач обновления цен в очередь`,
        data: {
          totalCabinets: wbCabinets.length,
          totalTasks,
          results
        }
      });

    } catch (error) {
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в queueUpdateAllPrices:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при добавлении задач в очередь',
        error: error.message 
      });
    }
  }

  /**
   * Обновление цен для всех кабинетов пользователя (синхронный метод - оставляем для совместимости)
   * GET /api/wb-prices/update-user
   */
  async updatePricesForUser(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 100, offset = 0 } = req.query;
      
      console.log(`🚀 [WB_PRICE_CONTROLLER] Синхронное обновление цен для всех кабинетов пользователя: ${userId}`);
      
      // Получаем все кабинеты пользователя
      const WbCabinet = require('../models/WbCabinet');
      const wbCabinets = await WbCabinet.find({ user: userId }).select('+token');
      
      if (!wbCabinets || wbCabinets.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'У вас нет настроенных WB кабинетов' 
        });
      }

      const results = [];
      let totalUpdated = 0;
      let totalErrors = 0;

      // Обрабатываем каждый кабинет
      for (const cabinet of wbCabinets) {
        try {
          console.log(`🚀 [WB_PRICE_CONTROLLER] Обновляем цены для кабинета: ${cabinet.name}`);
          
          const result = await wbPriceService.updatePricesForCabinetById(cabinet._id, limit, offset);

          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            ...result
          });

          if (result.success) {
            totalUpdated += result.updated || 0;
          } else {
            totalErrors++;
          }

        } catch (error) {
          console.error(`❌ [WB_PRICE_CONTROLLER] Ошибка при обновлении кабинета ${cabinet.name}:`, error.message);
          
          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            success: false,
            error: error.message
          });
          totalErrors++;
        }
      }

      res.json({
        success: true,
        message: `Обновление цен завершено. Обработано кабинетов: ${wbCabinets.length}`,
        data: {
          totalCabinets: wbCabinets.length,
          totalUpdated,
          totalErrors,
          results
        }
      });

    } catch (error) {
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в updatePricesForUser:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при обновлении цен',
        error: error.message 
      });
    }
  }

  /**
   * Обновление цен для конкретного WB кабинета через очередь
   * POST /api/wb-prices/queue-update/:cabinetId
   */
  async queueUpdatePricesForCabinet(req, res) {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;
      const { limit = 100, offset = 0, priority = 5 } = req.body;

      console.log(`🚀 [WB_PRICE_CONTROLLER] Добавление задачи обновления цен для кабинета ${cabinetId}`);

      // Проверяем, что кабинет принадлежит пользователю
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findOne({ 
        _id: cabinetId, 
        user: userId 
      });

      if (!cabinet) {
        return res.status(404).json({ 
          success: false,
          message: 'WB кабинет не найден или у вас нет прав на его использование' 
        });
      }

      // Добавляем задачу в очередь
      const result = await queueService.addTask('WB_PRICE_UPDATE', {
        cabinetId,
        userId,
        limit,
        offset
      }, userId, {
        priority,
        cabinetName: cabinet.name,
        maxAttempts: 3,
        estimatedDuration: 300
      });

      if (result.success) {
        res.json({
          success: true,
          message: `Задача обновления цен для кабинета "${cabinet.name}" добавлена в очередь`,
          data: {
            taskId: result.taskId,
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            estimatedDuration: '5 минут'
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
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в queueUpdatePricesForCabinet:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Внутренняя ошибка сервера',
        error: error.message 
      });
    }
  }

  /**
   * Обновление цен для конкретного WB кабинета (синхронный метод - оставляем для совместимости)
   * GET /api/wb-prices/cabinet/:cabinetId
   */
  async updatePricesForCabinet(req, res) {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;
      const { limit = 100, offset = 0 } = req.query;

      console.log(`🚀 [WB_PRICE_CONTROLLER] Синхронное обновление цен для кабинета ${cabinetId}`);

      // Проверяем, что кабинет принадлежит пользователю
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findOne({ 
        _id: cabinetId, 
        user: userId 
      });

      if (!cabinet) {
        return res.status(404).json({ 
          success: false,
          message: 'WB кабинет не найден или у вас нет прав на его использование' 
        });
      }

      const result = await wbPriceService.updatePricesForCabinetById(cabinetId, limit, offset);
      
      res.json({
        success: true,
        message: `Обновление цен для кабинета "${cabinet.name}" завершено`,
        data: {
          cabinetId: cabinet._id,
          cabinetName: cabinet.name,
          ...result
        }
      });

    } catch (error) {
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в updatePricesForCabinet:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при обновлении цен кабинета',
        error: error.message 
      });
    }
  }

  /**
   * Получение статуса последнего обновления цен
   * GET /api/wb-prices/status
   */
  async getLastUpdateStatus(req, res) {
    try {
      const status = await wbPriceService.getUpdateStatus();
      
      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в getLastUpdateStatus:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при получении статуса обновления',
        error: error.message 
      });
    }
  }

  /**
   * Тестирование токена и получения информации о кабинете
   * GET /api/wb-prices/test-token/:cabinetId
   */
  async testToken(req, res) {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;

      console.log(`🧪 [WB_PRICE_CONTROLLER] Тестирование токена для кабинета ${cabinetId}`);

      // Проверяем, что кабинет принадлежит пользователю
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findOne({ 
        _id: cabinetId, 
        user: userId 
      }).select('+token');

      if (!cabinet) {
        return res.status(404).json({ 
          success: false,
          message: 'WB кабинет не найден или у вас нет прав на его использование' 
        });
      }

      if (!cabinet.token) {
        return res.status(400).json({
          success: false,
          message: 'Для кабинета не установлен токен'
        });
      }

      // Тестируем токен
      const result = await wbPriceService.testToken(cabinet.token);

      res.json({
        success: true,
        message: 'Тест токена завершен',
        data: {
          cabinetId: cabinet._id,
          cabinetName: cabinet.name,
          ...result
        }
      });

    } catch (error) {
      console.error('❌ [WB_PRICE_CONTROLLER] Ошибка в testToken:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при тестировании токена',
        error: error.message 
      });
    }
  }
}

module.exports = new WbPriceControllerWithQueue();
