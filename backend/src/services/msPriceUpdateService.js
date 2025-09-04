const Product = require('../models/Product');
const MoySkladPriceService = require('./moySkladPriceService');

class MsPriceUpdateService {
  constructor() {
    try {
      this.moySkladService = new MoySkladPriceService();
    } catch (error) {
      console.error('Ошибка при создании MoySkladPriceService:', error.message);
      throw error;
    }
  }

  /**
   * Обновляет цены МойСклад для всех товаров интеграции
   * @param {string} integrationId - ID интеграции
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateAllPrices(integrationId, msToken) {
    try {
      // Получаем все товары интеграции
      const products = await Product.find({ integrationLink: integrationId });
      
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
          const updateResult = await this.updateProductPrices(product, msToken);
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

      return {
        success: true,
        updatedCount,
        errorCount,
        totalProducts: products.length,
        errors
      };

    } catch (error) {
      console.error('Ошибка при обновлении цен МойСклад:', error.message);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Обновляет цены для конкретного товара
   * @param {Object} product - Товар из БД
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateProductPrices(product, msToken) {
    try {
      if (!product.sizes || product.sizes.length === 0) {
        return {
          success: false,
          message: 'У товара нет размеров'
        };
      }

      let hasUpdates = false;
      const updateData = {};

      // Обрабатываем каждый размер товара
      for (let i = 0; i < product.sizes.length; i++) {
        const size = product.sizes[i];
        
        if (!size.ms_href) {
          continue; // Пропускаем размеры без ссылки на МойСклад
        }

        try {
          // Получаем цену для конкретного товара/варианта
          const prices = await this.moySkladService.getPricesByHrefs(msToken, [size.ms_href]);
          
          if (prices[size.ms_href]) {
            const msPrice = prices[size.ms_href];
            
            // Обновляем цену в размере
            if (size.priceMS !== msPrice) {
              updateData[`sizes.${i}.priceMS`] = msPrice;
              hasUpdates = true;
            }
          }
        } catch (error) {
          console.error(`Ошибка при получении цены для размера ${size.techSize || 'Без названия'}:`, error.message);
          // Продолжаем с другими размерами
        }
      }

      // Если есть обновления, сохраняем в БД
      if (hasUpdates) {
        await Product.findByIdAndUpdate(product._id, updateData);
        return {
          success: true,
          message: 'Цены обновлены',
          updates: updateData
        };
      } else {
        return {
          success: true,
          message: 'Цены уже актуальны'
        };
      }

    } catch (error) {
      console.error(`Ошибка при обновлении цен товара ${product.nmID || 'Без nmID'}:`, error.message);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Обновляет цены для товаров с одним размером (тип product)
   * @param {string} integrationId - ID интеграции
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateSingleSizeProductPrices(integrationId, msToken) {
    try {
      // Получаем все цены товаров из МойСклад
      const msProducts = await this.moySkladService.getAllPricesWithPagination(msToken, 'product');
      
      // Создаем Map для быстрого поиска по href
      const msPricesMap = new Map();
      msProducts.forEach(product => {
        if (product.meta && product.meta.href) {
          const salePrice = this.moySkladService.extractSalePrice(product.salePrices);
          if (salePrice !== null) {
            msPricesMap.set(product.meta.href, salePrice);
          }
        }
      });

      // Получаем товары с одним размером из БД
      const products = await Product.find({ 
        integrationLink: integrationId,
        'sizes.1': { $exists: false } // Только товары с одним размером
      });

      let updatedCount = 0;
      let errorCount = 0;

      for (const product of products) {
        try {
          if (product.sizes && product.sizes[0] && product.sizes[0].ms_href) {
            const msPrice = msPricesMap.get(product.sizes[0].ms_href);
            
            if (msPrice && product.sizes[0].priceMS !== msPrice) {
              await Product.findByIdAndUpdate(product._id, {
                'sizes.0.priceMS': msPrice
              });
              updatedCount++;
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`Ошибка при обновлении товара ${product.nmID}:`, error.message);
        }
      }

      return {
        success: true,
        updatedCount,
        errorCount,
        totalProducts: products.length
      };

    } catch (error) {
      console.error('Ошибка при обновлении цен товаров с одним размером:', error);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Обновляет цены для товаров с несколькими размерами (тип variant)
   * @param {string} integrationId - ID интеграции
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateMultiSizeProductPrices(integrationId, msToken) {
    try {
      // Получаем все цены вариантов из МойСклад
      const msVariants = await this.moySkladService.getAllPricesWithPagination(msToken, 'variant');
      
      // Создаем Map для быстрого поиска по href
      const msPricesMap = new Map();
      msVariants.forEach(variant => {
        if (variant.meta && variant.meta.href) {
          const salePrice = this.moySkladService.extractSalePrice(variant.salePrices);
          if (salePrice !== null) {
            msPricesMap.set(variant.meta.href, salePrice);
          }
        }
      });

      // Получаем товары с несколькими размерами из БД
      const products = await Product.find({ 
        integrationLink: integrationId,
        'sizes.1': { $exists: true } // Товары с несколькими размерами
      });

      let updatedCount = 0;
      let errorCount = 0;

      for (const product of products) {
        try {
          if (product.sizes && product.sizes.length > 1) {
            let hasUpdates = false;
            const updateData = {};

            // Проверяем каждый размер
            for (let i = 0; i < product.sizes.length; i++) {
              const size = product.sizes[i];
              
              if (size.ms_href) {
                const msPrice = msPricesMap.get(size.ms_href);
                
                if (msPrice && size.priceMS !== msPrice) {
                  updateData[`sizes.${i}.priceMS`] = msPrice;
                  hasUpdates = true;
                }
              }
            }

            // Если есть обновления, сохраняем в БД
            if (hasUpdates) {
              await Product.findByIdAndUpdate(product._id, updateData);
              updatedCount++;
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`Ошибка при обновлении товара ${product.nmID}:`, error.message);
        }
      }

      return {
        success: true,
        updatedCount,
        errorCount,
        totalProducts: products.length
      };

    } catch (error) {
      console.error('Ошибка при обновлении цен товаров с несколькими размерами:', error);
      return {
        success: false,
        message: `Ошибка обновления: ${error.message}`
      };
    }
  }

  /**
   * Получает статистику по ценам МойСклад
   * @param {string} integrationId - ID интеграции
   * @returns {Promise<Object>} Статистика
   */
  async getPriceStats(integrationId) {
    try {
      const products = await Product.find({ integrationLink: integrationId });
      
      let totalSizes = 0;
      let sizesWithMsPrices = 0;
      let sizesWithoutMsPrices = 0;

      products.forEach(product => {
        if (product.sizes) {
          product.sizes.forEach(size => {
            totalSizes++;
            if (size.priceMS && size.priceMS > 0) {
              sizesWithMsPrices++;
            } else {
              sizesWithoutMsPrices++;
            }
          });
        }
      });

      return {
        success: true,
        totalProducts: products.length,
        totalSizes,
        sizesWithMsPrices,
        sizesWithoutMsPrices,
        priceCoverage: totalSizes > 0 ? (sizesWithMsPrices / totalSizes * 100).toFixed(2) : 0
      };

    } catch (error) {
      console.error('Ошибка при получении статистики цен:', error);
      return {
        success: false,
        message: `Ошибка получения статистики: ${error.message}`
      };
    }
  }
}

module.exports = MsPriceUpdateService;
