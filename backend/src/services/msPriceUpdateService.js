console.log('📦 Импортируем зависимости для MsPriceUpdateService...');
const Product = require('../models/Product');
console.log('✅ Product импортирован');
const MoySkladPriceService = require('./moySkladPriceService');
console.log('✅ MoySkladPriceService импортирован');
console.log('📦 Импорт зависимостей завершен');

class MsPriceUpdateService {
  constructor() {
    console.log('🔧 Инициализация MsPriceUpdateService...');
    
    try {
      this.moySkladService = new MoySkladPriceService();
      console.log('✅ MoySkladPriceService создан успешно');
    } catch (error) {
      console.error('❌ Ошибка при создании MoySkladPriceService:', error.message);
      throw error;
    }
    
    console.log('✅ MsPriceUpdateService инициализирован успешно');
  }

  /**
   * Обновляет цены МойСклад для всех товаров интеграции
   * @param {string} integrationId - ID интеграции
   * @param {string} msToken - Токен МойСклад
   * @returns {Promise<Object>} Результат обновления
   */
  async updateAllPrices(integrationId, msToken) {
    try {
      console.log(`🔄 Начинаем обновление цен МойСклад для интеграции ${integrationId}`);
      console.log(`🔑 Используем токен МойСклад: ${msToken ? 'Настроен' : 'Не настроен'}`);

      // Получаем все товары интеграции
      console.log(`🔍 Ищем товары для интеграции ${integrationId}...`);
      const products = await Product.find({ integrationLink: integrationId });
      console.log(`📊 Найдено товаров: ${products ? products.length : 0}`);
      
      if (!products || products.length === 0) {
        console.log(`ℹ️ Товары для интеграции ${integrationId} не найдены`);
        return {
          success: false,
          message: 'Товары для данной интеграции не найдены'
        };
      }

      console.log(`🔄 Начинаем обработку ${products.length} товаров...`);

      let updatedCount = 0;
      let errorCount = 0;
      const errors = [];

      // Обрабатываем каждый товар
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
          console.log(`📦 Обрабатываем товар ${i + 1}/${products.length}: ${product.nmID || 'Без nmID'}`);
          const updateResult = await this.updateProductPrices(product, msToken);
          if (updateResult.success) {
            updatedCount++;
            console.log(`✅ Товар ${product.nmID || 'Без nmID'} обновлен успешно`);
          } else {
            errorCount++;
            console.log(`❌ Товар ${product.nmID || 'Без nmID'}: ${updateResult.message}`);
            errors.push({
              productId: product._id,
              nmID: product.nmID,
              error: updateResult.message
            });
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Ошибка при обработке товара ${product.nmID || 'Без nmID'}:`, error.message);
          errors.push({
            productId: product._id,
            nmID: product.nmID,
            error: error.message
          });
        }
      }

      console.log(`📊 Результат обновления: ${updatedCount} обновлено, ${errorCount} ошибок, всего ${products.length}`);

      return {
        success: true,
        updatedCount,
        errorCount,
        totalProducts: products.length,
        errors
      };

    } catch (error) {
      console.error('❌ Ошибка при обновлении цен МойСклад:', error.message);
      console.error('Детали ошибки:', error.stack);
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
      console.log(`📦 Обрабатываем товар: ${product.nmID || 'Без nmID'}, размеров: ${product.sizes ? product.sizes.length : 0}`);
      
      if (!product.sizes || product.sizes.length === 0) {
        console.log(`ℹ️ У товара ${product.nmID || 'Без nmID'} нет размеров`);
        return {
          success: false,
          message: 'У товара нет размеров'
        };
      }

      let hasUpdates = false;
      const updateData = {};

      console.log(`🔍 Проверяем ${product.sizes.length} размеров товара...`);

      // Обрабатываем каждый размер товара
      for (let i = 0; i < product.sizes.length; i++) {
        const size = product.sizes[i];
        console.log(`  📏 Размер ${i + 1}: ${size.techSize || 'Без названия'}, ms_href: ${size.ms_href ? 'Есть' : 'Нет'}, текущая цена: ${size.priceMS || 'Не установлена'}`);
        
        if (!size.ms_href) {
          console.log(`  ⏭️ Пропускаем размер ${size.techSize || 'Без названия'} - нет ms_href`);
          continue; // Пропускаем размеры без ссылки на МойСклад
        }

        try {
          console.log(`  🔍 Получаем цену для размера ${size.techSize || 'Без названия'} по href: ${size.ms_href}`);
          
          // Получаем цену для конкретного товара/варианта
          const prices = await this.moySkladService.getPricesByHrefs(msToken, [size.ms_href]);
          console.log(`  📊 Получены цены:`, prices);
          
          if (prices[size.ms_href]) {
            const msPrice = prices[size.ms_href];
            console.log(`  💰 Найдена цена МойСклад: ${msPrice}, текущая цена в БД: ${size.priceMS || 'Не установлена'}`);
            
            // Обновляем цену в размере
            if (size.priceMS !== msPrice) {
              updateData[`sizes.${i}.priceMS`] = msPrice;
              hasUpdates = true;
              console.log(`  ✅ Цена для размера ${size.techSize || 'Без названия'} будет обновлена с ${size.priceMS || 'Не установлена'} на ${msPrice}`);
            } else {
              console.log(`  ℹ️ Цена для размера ${size.techSize || 'Без названия'} уже актуальна: ${msPrice}`);
            }
          } else {
            console.log(`  ⚠️ Цена для размера ${size.techSize || 'Без названия'} не найдена в МойСклад`);
          }
        } catch (error) {
          console.error(`  ❌ Ошибка при получении цены для размера ${size.techSize || 'Без названия'}:`, error.message);
          // Продолжаем с другими размерами
        }
      }

      // Если есть обновления, сохраняем в БД
      if (hasUpdates) {
        console.log(`💾 Сохраняем обновления в БД:`, updateData);
        await Product.findByIdAndUpdate(product._id, updateData);
        console.log(`✅ Цены товара ${product.nmID || 'Без nmID'} обновлены в БД`);
        return {
          success: true,
          message: 'Цены обновлены',
          updates: updateData
        };
      } else {
        console.log(`ℹ️ Цены товара ${product.nmID || 'Без nmID'} уже актуальны`);
        return {
          success: true,
          message: 'Цены уже актуальны'
        };
      }

    } catch (error) {
      console.error(`❌ Ошибка при обновлении цен товара ${product.nmID || 'Без nmID'}:`, error.message);
      console.error('Детали ошибки:', error.stack);
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
