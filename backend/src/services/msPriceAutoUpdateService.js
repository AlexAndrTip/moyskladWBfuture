const MsPriceUpdateService = require('./msPriceUpdateService');
const IntegrationLink = require('../models/IntegrationLink');

class MsPriceAutoUpdateService {
  constructor() {
    try {
      this.msPriceService = new MsPriceUpdateService();
    } catch (error) {
      console.error('Ошибка при создании MsPriceUpdateService:', error.message);
      throw error;
    }
    
    this.updateInterval = null;
    this.isRunning = false;
  }

  /**
   * Запускает автоматическое обновление цен МойСклад
   */
  async startAutoUpdates() {
    if (this.isRunning) {
      return;
    }

    try {
      if (!this.msPriceService) {
        throw new Error('Сервис обновления цен МойСклад не инициализирован');
      }
      
      // Первое обновление при запуске сервера
      await this.performInitialUpdate();
      
      // Устанавливаем периодическое обновление каждые 5 минут
      this.updateInterval = setInterval(async () => {
        try {
          await this.performScheduledUpdate();
        } catch (error) {
          console.error('Ошибка при плановом обновлении цен МойСклад:', error.message);
        }
      }, 5 * 60 * 1000); // 5 минут в миллисекундах
      
      this.isRunning = true;
      console.log('Автоматическое обновление цен МойСклад настроено каждые 5 минут');
      
    } catch (error) {
      console.error('Ошибка при запуске автоматического обновления цен МойСклад:', error.message);
      // Не прерываем работу сервера при ошибке обновления цен
    }
  }

  /**
   * Останавливает автоматическое обновление цен
   */
  stopAutoUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.isRunning = false;
      console.log('⏹️ Автоматическое обновление цен МойСклад остановлено');
    }
  }

  /**
   * Выполняет первое обновление при запуске сервера
   */
  async performInitialUpdate() {
    try {
      // Получаем все активные интеграции с токенами МойСклад
      // Токен МойСклад хранится в Storage.token
      const integrations = await IntegrationLink.find({})
        .populate('storage', 'token name')
        .exec();
      
      // Фильтруем только те интеграции, у которых есть токен в storage
      const integrationsWithMsToken = integrations.filter(integration => 
        integration.storage && integration.storage.token
      );

      if (integrationsWithMsToken.length === 0) {
        console.log('Нет активных интеграций с токенами МойСклад для обновления цен');
        return;
      }

      console.log(`Найдено ${integrationsWithMsToken.length} интеграций для обновления цен МойСклад`);

      // Обновляем цены для каждой интеграции
      for (const integration of integrationsWithMsToken) {
        try {
          const result = await this.msPriceService.updateAllPrices(integration._id, integration.storage.token);
          
          if (result.success) {
            console.log(`Интеграция ${integration._id}: обновлено ${result.updatedCount}/${result.totalProducts} товаров`);
          } else {
            console.error(`Интеграция ${integration._id}: ${result.message}`);
          }
        } catch (error) {
          console.error(`Ошибка при обновлении интеграции ${integration._id}:`, error.message);
        }
      }

    } catch (error) {
      console.error('Ошибка при первичном обновлении цен МойСклад:', error.message);
      throw error;
    }
  }

  /**
   * Выполняет плановое обновление цен
   */
  async performScheduledUpdate() {
    try {
      // Получаем все активные интеграции с токенами МойСклад
      // Токен МойСклад хранится в Storage.token
      const integrations = await IntegrationLink.find({})
        .populate('storage', 'token name')
        .exec();
      
      // Фильтруем только те интеграции, у которых есть токен в storage
      const integrationsWithMsToken = integrations.filter(integration => 
        integration.storage && integration.storage.token
      );

      if (integrationsWithMsToken.length === 0) {
        return;
      }

      // Обновляем цены для каждой интеграции
      for (const integration of integrationsWithMsToken) {
        try {
          const result = await this.msPriceService.updateAllPrices(integration._id, integration.storage.token);
          
          if (result.success) {
            console.log(`Плановое обновление ${integration._id}: ${result.updatedCount}/${result.totalProducts} товаров`);
          } else {
            console.error(`Плановое обновление ${integration._id}: ${result.message}`);
          }
        } catch (error) {
          console.error(`Ошибка при плановом обновлении интеграции ${integration._id}:`, error.message);
        }
      }

    } catch (error) {
      console.error('Ошибка при плановом обновлении цен МойСклад:', error.message);
      throw error;
    }
  }

  /**
   * Получает статус автоматического обновления
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      updateInterval: this.updateInterval ? '5 минут' : 'Не установлен',
      lastUpdate: this.lastUpdate || 'Не выполнялось'
    };
  }

  /**
   * Принудительно запускает обновление цен для конкретной интеграции
   */
  async forceUpdateForIntegration(integrationId) {
    try {
      const integration = await IntegrationLink.findById(integrationId);
      
      if (!integration) {
        throw new Error('Интеграция не найдена');
      }

      if (!integration.storage || !integration.storage.token) {
        throw new Error('Токен МойСклад не настроен для данной интеграции');
      }

      const result = await this.msPriceService.updateAllPrices(integrationId, integration.storage.token);
      
      if (result.success) {
        console.log(`Принудительное обновление завершено: ${result.updatedCount}/${result.totalProducts} товаров`);
      } else {
        console.error(`Принудительное обновление не удалось: ${result.message}`);
      }

      return result;

    } catch (error) {
      console.error(`Ошибка при принудительном обновлении интеграции ${integrationId}:`, error.message);
      throw error;
    }
  }
}

module.exports = MsPriceAutoUpdateService;
