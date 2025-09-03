console.log('📦 Импортируем зависимости для MsPriceAutoUpdateService...');
const MsPriceUpdateService = require('./msPriceUpdateService');
console.log('✅ MsPriceUpdateService импортирован');
const IntegrationLink = require('../models/IntegrationLink');
console.log('✅ IntegrationLink импортирован');
console.log('📦 Импорт зависимостей завершен');

class MsPriceAutoUpdateService {
  constructor() {
    console.log('🔧 Инициализация MsPriceAutoUpdateService...');
    
    try {
      this.msPriceService = new MsPriceUpdateService();
      console.log('✅ MsPriceUpdateService создан успешно');
    } catch (error) {
      console.error('❌ Ошибка при создании MsPriceUpdateService:', error.message);
      throw error;
    }
    
    this.updateInterval = null;
    this.isRunning = false;
    
    console.log('✅ MsPriceAutoUpdateService инициализирован успешно');
  }

  /**
   * Запускает автоматическое обновление цен МойСклад
   */
  async startAutoUpdates() {
    console.log('🔧 Проверяем статус автоматического обновления...');
    
    if (this.isRunning) {
      console.log('⚠️ Автоматическое обновление цен МойСклад уже запущено');
      return;
    }

    try {
      console.log('🚀 Запуск автоматического обновления цен МойСклад...');
      console.log('📊 Проверяем доступность сервиса обновления цен...');
      
      if (!this.msPriceService) {
        throw new Error('Сервис обновления цен МойСклад не инициализирован');
      }
      
      console.log('✅ Сервис обновления цен доступен, начинаем первое обновление...');
      
      // Первое обновление при запуске сервера
      await this.performInitialUpdate();
      console.log('✅ Первое обновление цен МойСклад завершено');
      
      console.log('⏰ Настраиваем периодическое обновление каждые 5 минут...');
      
      // Устанавливаем периодическое обновление каждые 5 минут
      this.updateInterval = setInterval(async () => {
        try {
          console.log(`🕐 [${new Date().toISOString()}] Запуск планового обновления цен МойСклад...`);
          await this.performScheduledUpdate();
          console.log('✅ Плановое обновление цен МойСклад завершено');
        } catch (error) {
          console.error('❌ Ошибка при плановом обновлении цен МойСклад:', error.message);
          console.error('Детали ошибки:', error.stack);
        }
      }, 5 * 60 * 1000); // 5 минут в миллисекундах
      
      this.isRunning = true;
      console.log('🔄 Автоматическое обновление цен МойСклад настроено каждые 5 минут');
      
    } catch (error) {
      console.error('❌ Ошибка при запуске автоматического обновления цен МойСклад:', error.message);
      console.error('Детали ошибки:', error.stack);
      console.log('⚠️ Автоматическое обновление цен МойСклад не запущено');
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
      console.log('🔍 Начинаем поиск активных интеграций с токенами МойСклад...');
      
      // Получаем все активные интеграции с токенами МойСклад
      // Токен МойСклад хранится в Storage.token
      const integrations = await IntegrationLink.find({})
        .populate('storage', 'token name')
        .exec();
      
      // Фильтруем только те интеграции, у которых есть токен в storage
      const integrationsWithMsToken = integrations.filter(integration => 
        integration.storage && integration.storage.token
      );

      console.log(`📊 Результат поиска интеграций: найдено ${integrationsWithMsToken.length} интеграций с токенами МойСклад`);

      if (integrationsWithMsToken.length === 0) {
        console.log('ℹ️ Нет активных интеграций с токенами МойСклад для обновления цен');
        return;
      }

      console.log(`📊 Найдено ${integrationsWithMsToken.length} интеграций для обновления цен МойСклад`);
      
      // Выводим информацию о найденных интеграциях
      integrationsWithMsToken.forEach((integration, index) => {
        console.log(`  ${index + 1}. ID: ${integration._id}, Название: ${integration.name || 'Без названия'}, Токен: ${integration.storage.token ? 'Настроен' : 'Не настроен'}`);
      });

      // Обновляем цены для каждой интеграции
      for (const integration of integrationsWithMsToken) {
        try {
          console.log(`🔄 Обновление цен для интеграции ${integration._id} (${integration.name || 'Без названия'})`);
          
          const result = await this.msPriceService.updateAllPrices(integration._id, integration.storage.token);
          
          if (result.success) {
            console.log(`✅ Интеграция ${integration._id}: обновлено ${result.updatedCount}/${result.totalProducts} товаров`);
          } else {
            console.error(`❌ Интеграция ${integration._id}: ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ Ошибка при обновлении интеграции ${integration._id}:`, error.message);
          console.error('Детали ошибки:', error.stack);
        }
      }

    } catch (error) {
      console.error('❌ Ошибка при первичном обновлении цен МойСклад:', error.message);
      console.error('Детали ошибки:', error.stack);
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
        console.log('ℹ️ Нет активных интеграций с токенами МойСклад для планового обновления');
        return;
      }

      console.log(`📊 Плановое обновление цен для ${integrationsWithMsToken.length} интеграций МойСклад`);

      // Обновляем цены для каждой интеграции
      for (const integration of integrationsWithMsToken) {
        try {
          console.log(`🔄 Плановое обновление цен для интеграции ${integration._id}`);
          
          const result = await this.msPriceService.updateAllPrices(integration._id, integration.storage.token);
          
          if (result.success) {
            console.log(`✅ Плановое обновление ${integration._id}: ${result.updatedCount}/${result.totalProducts} товаров`);
          } else {
            console.error(`❌ Плановое обновление ${integration._id}: ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ Ошибка при плановом обновлении интеграции ${integration._id}:`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Ошибка при плановом обновлении цен МойСклад:', error.message);
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

      console.log(`🔄 Принудительное обновление цен для интеграции ${integrationId}`);
      
                const result = await this.msPriceService.updateAllPrices(integrationId, integration.storage.token);
      
      if (result.success) {
        console.log(`✅ Принудительное обновление завершено: ${result.updatedCount}/${result.totalProducts} товаров`);
      } else {
        console.error(`❌ Принудительное обновление не удалось: ${result.message}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Ошибка при принудительном обновлении интеграции ${integrationId}:`, error.message);
      throw error;
    }
  }
}

module.exports = MsPriceAutoUpdateService;
