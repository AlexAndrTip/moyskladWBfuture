const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const MoySkladCostService = require('./moySkladCostService');

class MsCostUpdateService {
  constructor() {
    try {
      this.moySkladService = new MoySkladCostService();
    } catch (error) {
      console.error('Ошибка при создании MoySkladCostService:', error.message);
      throw error;
    }
  }

  /**
   * Обновляет себестоимость МойСклад для всех товаров интеграции
   * @param {string} integrationId - ID интеграции
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateAllCosts(integrationId, msToken) {
    try {
      console.log(`Обновляем себестоимость для интеграции ${integrationId}...`);
      
      // Получаем все товары интеграции
      const products = await Product.find({ integrationLink: integrationId });
      console.log(`Найдено товаров для интеграции: ${products ? products.length : 0}`);
      
      if (!products || products.length === 0) {
        return {
          success: false,
          message: 'Товары для данной интеграции не найдены'
        };
      }

      let updatedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Обрабатываем каждый товар
      for (const product of products) {
        try {
          const updateResult = await this.updateProductCosts(product, msToken);
          if (updateResult.success) {
            updatedCount++;
          } else {
            errorCount++;
            errors.push({
              productId: product._id,
              nmID: product.nmID,
              error: updateResult.message
            });
          }
        } catch (error) {
          errorCount++;
          console.error(`Ошибка при обработке товара ${product.nmID || 'Без nmID'}:`, error.message);
          errors.push({
            productId: product._id,
            nmID: product.nmID,
            error: error.message
          });
        }
      }

      console.log(`Результат обновления: ${updatedCount} обновлено, ${errorCount} ошибок`);
      return {
        success: true,
        updatedCount,
        errorCount,
        totalProducts: products.length,
        errors
      };

    } catch (error) {
      console.error('Ошибка при обновлении себестоимости МойСклад:', error.message);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Обновляет себестоимость для конкретного товара
   * @param {Object} product - Товар из БД
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateProductCosts(product, msToken) {
    try {
      if (!product.sizes || product.sizes.length === 0) {
        return {
          success: false,
          message: 'У товара нет размеров'
        };
      }

      let hasUpdates = false;
      const updateData = {};
      let processedSizes = 0;
      let foundCosts = 0;

      // Обрабатываем каждый размер товара
      for (let i = 0; i < product.sizes.length; i++) {
        const size = product.sizes[i];
        
        if (!size.ms_href) {
          continue; // Пропускаем размеры без ссылки на МойСклад
        }

        processedSizes++;
        try {
          // Получаем себестоимость для конкретного товара/варианта
          const costs = await this.moySkladService.getCostsByHrefs(msToken, [size.ms_href]);
          
          if (costs[size.ms_href]) {
            foundCosts++;
            const msCost = costs[size.ms_href];
            
            // Обновляем себестоимость в размере
            if (size.costPriceMS !== msCost) {
              updateData[`sizes.${i}.costPriceMS`] = msCost;
              hasUpdates = true;
              console.log(`Товар ${product.nmID}, размер ${size.techSize}: себестоимость обновлена с ${size.costPriceMS || 'Не указана'} на ${msCost}`);
            }
          }
        } catch (error) {
          console.error(`Ошибка при получении себестоимости для размера ${size.techSize || 'Без названия'}:`, error.message);
          // Продолжаем с другими размерами
        }
      }

      console.log(`Товар ${product.nmID}: обработано размеров ${processedSizes}, найдено себестоимостей ${foundCosts}, обновлений ${Object.keys(updateData).length}`);

      // Если есть обновления, сохраняем в БД
      if (hasUpdates) {
        await Product.findByIdAndUpdate(product._id, updateData);
        return {
          success: true,
          message: 'Себестоимость обновлена',
          updates: updateData
        };
      } else {
        return {
          success: true,
          message: 'Себестоимость уже актуальна'
        };
      }

    } catch (error) {
      console.error(`Ошибка при обновлении себестоимости товара ${product.nmID || 'Без nmID'}:`, error.message);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Обновляет себестоимость МойСклад для всех интеграций с токенами
   * @returns {Promise<Object>} Результат обновления
   */
  async updateAllIntegrationsCosts() {
    try {
      console.log('Начинаем обновление себестоимости для всех интеграций МойСклад...');
      
      // Получаем все интеграции с токенами МойСклад
      const integrations = await IntegrationLink.find({})
        .populate('storage', 'token name')
        .exec();
      
      // Фильтруем только те интеграции, у которых есть токен в storage
      const integrationsWithMsToken = integrations.filter(integration => 
        integration.storage && integration.storage.token
      );

      console.log(`Найдено интеграций с токенами МойСклад: ${integrationsWithMsToken.length}`);

      if (integrationsWithMsToken.length === 0) {
        return {
          success: false,
          message: 'Нет интеграций с токенами МойСклад для обновления себестоимости'
        };
      }

      let totalUpdated = 0;
      let totalErrors = 0;
      const results = [];

      // Обрабатываем каждую интеграцию
      for (const integration of integrationsWithMsToken) {
        try {
          console.log(`Обрабатываем интеграцию: ${integration.name || integration._id}`);
          
          const result = await this.updateAllCosts(integration._id, integration.storage.token);
          
          if (result.success) {
            totalUpdated += result.updatedCount;
            totalErrors += result.errorCount;
            results.push({
              integrationId: integration._id,
              integrationName: integration.name || 'Без названия',
              ...result
            });
          } else {
            totalErrors += 1;
            results.push({
              integrationId: integration._id,
              integrationName: integration.name || 'Без названия',
              error: result.message
            });
          }
        } catch (error) {
          totalErrors += 1;
          console.error(`Ошибка при обработке интеграции ${integration._id}:`, error.message);
          results.push({
            integrationId: integration._id,
            integrationName: integration.name || 'Без названия',
            error: error.message
          });
        }
      }

      console.log(`Общий результат: обновлено товаров: ${totalUpdated}, ошибок: ${totalErrors}`);
      return {
        success: true,
        totalIntegrations: integrationsWithMsToken.length,
        totalUpdated,
        totalErrors,
        results
      };

    } catch (error) {
      console.error('Ошибка при обновлении себестоимости всех интеграций:', error.message);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Получает статистику по себестоимости МойСклад
   * @param {string} integrationId - ID интеграции
   * @returns {Promise<Object>} Статистика
   */
  async getCostStats(integrationId) {
    try {
      const products = await Product.find({ integrationLink: integrationId });
      
      let totalSizes = 0;
      let sizesWithMsCosts = 0;
      let sizesWithoutMsCosts = 0;

      products.forEach(product => {
        if (product.sizes) {
          product.sizes.forEach(size => {
            totalSizes++;
            if (size.costPriceMS && size.costPriceMS > 0) {
              sizesWithMsCosts++;
            } else {
              sizesWithoutMsCosts++;
            }
          });
        }
      });

      return {
        success: true,
        totalProducts: products.length,
        totalSizes,
        sizesWithMsCosts,
        sizesWithoutMsCosts,
        costCoverage: totalSizes > 0 ? (sizesWithMsCosts / totalSizes * 100).toFixed(2) : 0
      };

    } catch (error) {
      console.error('Ошибка при получении статистики себестоимости:', error);
      return {
        success: false,
        message: `Ошибка получения статистики: ${error.message}`
      };
    }
  }
}

module.exports = MsCostUpdateService;
