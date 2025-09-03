const axios = require('axios');
const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const WbCabinet = require('../models/WbCabinet');

class WbPriceService {
  constructor() {
    this.baseUrl = 'https://discounts-prices-api.wildberries.ru/api/v2';
    this.timeout = 30000; // 30 секунд
    this.batchSize = 1000; // Максимальный размер батча для WB API
  }

  // Получение цен с WB API для всех кабинетов
  async getPricesForProducts(limit = 100, offset = 0) {
    try {
      console.log('🚀 Обновление цен WB...');
      
      // Сначала находим все уникальные wbCabinet ID из товаров
      const uniqueCabinetIds = await Product.distinct('wbCabinet');
      
      if (uniqueCabinetIds.length === 0) {
        throw new Error('В товарах не найдено ссылок на WB кабинеты');
      }
      
      // Получаем кабинеты с токенами для найденных ID
      const wbCabinets = await WbCabinet.find({ 
        _id: { $in: uniqueCabinetIds },
        token: { $exists: true, $ne: '' }
      }).select('+token');
      
      if (wbCabinets.length === 0) {
        throw new Error('Все найденные кабинеты не имеют токенов');
      }

      let totalUpdated = 0;
      let totalErrors = 0;
      const results = [];

      // Обрабатываем каждый WB кабинет
      for (const cabinet of wbCabinets) {
        try {
          // Проверяем токен кабинета
          if (!cabinet.token || cabinet.token.trim() === '') {
            results.push({
              cabinetId: cabinet._id,
              cabinetName: cabinet.name,
              totalProducts: 0,
              updated: 0,
              errors: 0,
              skipped: true,
              reason: 'Токен не установлен'
            });
            continue;
          }
          
          // Получаем товары для данного кабинета
          const cabinetProducts = await this.getProductsForCabinet(cabinet._id);
          
          if (cabinetProducts.length === 0) {
            results.push({
              cabinetId: cabinet._id,
              cabinetName: cabinet.name,
              totalProducts: 0,
              updated: 0,
              errors: 0,
              skipped: true,
              reason: 'Товары не найдены'
            });
            continue;
          }

          // Обновляем цены для товаров данного кабинета
          const cabinetResult = await this.updatePricesForCabinet(cabinet, cabinetProducts, limit, offset);
          
          totalUpdated += cabinetResult.updated;
          totalErrors += cabinetResult.errors;
          
          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            totalProducts: cabinetProducts.length,
            updated: cabinetResult.updated,
            errors: cabinetResult.errors
          });

        } catch (error) {
          console.error(`❌ Ошибка при обработке кабинета ${cabinet.name}:`, error.message);
          totalErrors += 1;
          
          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            totalProducts: 0,
            updated: 0,
            errors: 1,
            error: error.message
          });
        }

        // Пауза между кабинетами
        await this.delay(2000);
      }

      const skippedCabinets = results.filter(r => r.skipped).length;
      const processedCabinets = results.filter(r => !r.skipped).length;
      
             console.log(`🎯 Общий результат: обновлено товаров: ${totalUpdated}, ошибок: ${totalErrors}`);
       
       return {
         success: true,
         totalCabinets: wbCabinets.length,
         processedCabinets,
         skippedCabinets,
         totalUpdated,
         totalErrors,
         results
       };

    } catch (error) {
      console.error('❌ Ошибка в getPricesForProducts:', error);
      throw error;
    }
  }

  // Получение товаров для конкретного WB кабинета
  async getProductsForCabinet(cabinetId) {
    try {
      console.log(`🔍 Поиск товаров для кабинета ${cabinetId}...`);
      
             // Ищем товары напрямую по полю wbCabinet
       const products = await Product.find({ wbCabinet: cabinetId });
       console.log(`📦 Найдено товаров по wbCabinet: ${products.length}`);

       // Дополнительно ищем товары через integrationLink
       const integrationLinks = await IntegrationLink.find({ wbCabinet: cabinetId });
       
       if (integrationLinks.length > 0) {
         const integrationLinkIds = integrationLinks.map(link => link._id);
         
         const productsByIntegrationLink = await Product.find({ 
           integrationLink: { $in: integrationLinkIds } 
         });
         console.log(`📦 Найдено товаров по integrationLink: ${productsByIntegrationLink.length}`);
         
         // Объединяем результаты и убираем дубликаты
         const allProducts = [...products, ...productsByIntegrationLink];
         const uniqueProducts = allProducts.filter((product, index, self) => 
           index === self.findIndex(p => p._id.toString() === product._id.toString())
         );
         
         console.log(`📦 Итого уникальных товаров: ${uniqueProducts.length}`);
         return uniqueProducts;
       }

       return products;

    } catch (error) {
      console.error(`❌ Ошибка при получении товаров для кабинета ${cabinetId}:`, error.message);
      return [];
    }
  }

  // Обновление цен для конкретного WB кабинета
  async updatePricesForCabinet(cabinet, products, limit = 100, offset = 0) {
    try {
             // Проверяем токен кабинета
       if (!cabinet.token || cabinet.token.trim() === '') {
         throw new Error(`Для кабинета ${cabinet.name} не установлен токен`);
       }

       if (!products || products.length === 0) {
         return { updated: 0, errors: 0 };
       }

       // Формируем список nmID для запроса к WB API
       const nmIDs = products.map(product => product.nmID).filter(Boolean);
       
       if (nmIDs.length === 0) {
         console.log(`⚠️ Для кабинета ${cabinet.name} не найдены валидные nmID`);
         return { updated: 0, errors: 0 };
       }

       let totalUpdated = 0;
       let totalErrors = 0;

       // Получаем все товары с WB API с пагинацией
       
       let allWbGoods = [];
       let currentOffset = 0;
       const pageLimit = 1000; // Максимальный размер страницы
       
       while (true) {
         try {
           const wbResponse = await this.fetchAllPrices(cabinet.token, pageLimit, currentOffset);
           
           // Проверяем структуру ответа и извлекаем товары
           let goodsList = [];
           if (wbResponse && wbResponse.data && wbResponse.data.listGoods) {
             goodsList = wbResponse.data.listGoods;
           } else if (wbResponse && wbResponse.listGoods) {
             goodsList = wbResponse.listGoods;
           } else if (wbResponse && wbResponse.goods) {
             goodsList = wbResponse.goods;
           } else if (wbResponse && wbResponse.items) {
             goodsList = wbResponse.items;
           }
           
           if (goodsList && goodsList.length > 0) {
             allWbGoods = allWbGoods.concat(goodsList);
             
             // Если получили меньше товаров чем limit, значит это последняя страница
             if (goodsList.length < pageLimit) {
               break;
             }
             
             currentOffset += pageLimit;
             
             // Пауза между страницами
             await this.delay(1000);
           } else {
             break;
           }
         } catch (error) {
           console.error(`❌ Ошибка при получении страницы:`, error.message);
           totalErrors += 1;
           break;
         }
       }
      
      if (allWbGoods.length === 0) {
        return { updated: 0, errors: totalErrors };
      }
      
      // Фильтруем товары по нужным nmID
      const neededNmIDs = new Set(nmIDs);
      const filteredWbGoods = allWbGoods.filter(good => neededNmIDs.has(good.nmID));
      
      if (filteredWbGoods.length > 0) {
        // Обновляем цены в БД для найденных товаров
        const updateResult = await this.updateProductPrices(filteredWbGoods);
        totalUpdated += updateResult.updated;
        totalErrors += updateResult.errors;
      }
       
       return { updated: totalUpdated, errors: totalErrors };

    } catch (error) {
      console.error(`❌ Ошибка при обновлении цен для кабинета ${cabinet.name}:`, error.message);
      throw error;
    }
  }

  // Создание батчей из списка nmID
  createBatches(nmIDs) {
    const batches = [];
    for (let i = 0; i < nmIDs.length; i += this.batchSize) {
      batches.push(nmIDs.slice(i, i + this.batchSize));
    }
    return batches;
  }

  // Запрос к WB API для получения всех товаров с пагинацией
  async fetchAllPrices(token, limit = 1000, offset = 0) {
    try {
      if (!token) {
        throw new Error('Токен WB кабинета не предоставлен');
      }

      const url = `${this.baseUrl}/list/goods/filter`;
      
             const requestConfig = {
         params: {
           limit,
           offset
         },
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         timeout: this.timeout
       };
       
       const response = await axios.get(url, requestConfig);

       if (response.status === 200 && response.data) {
         // Проверяем структуру ответа и возвращаем в правильном формате
         if (response.data.data && response.data.data.listGoods) {
           return response.data;
         } else if (response.data.listGoods) {
           return response.data;
         } else if (response.data.goods) {
           return { listGoods: response.data.goods };
         } else if (response.data.items) {
           return { listGoods: response.data.items };
         } else {
           return response.data;
         }
       } else {
         throw new Error(`Неверный ответ от WB API: ${response.status}`);
       }
    } catch (error) {
      console.error(`❌ Ошибка при запросе к WB API (страница ${Math.floor(offset / limit) + 1}):`);
      if (error.response) {
        console.error(`   - Статус: ${error.response.status}`);
        console.error(`   - Данные ответа:`, error.response.data);
      } else {
        console.error(`   - Ошибка: ${error.message}`);
      }
      throw error;
    }
  }

    // Обновление цен товаров в БД
  async updateProductPrices(wbGoodsList) {
    let updated = 0;
    let errors = 0;

    console.log(`🔄 Начало обновления цен для ${wbGoodsList.length} товаров из WB API...`);

    for (const wbGood of wbGoodsList) {
      try {
        if (!wbGood.nmID || !wbGood.sizes || !Array.isArray(wbGood.sizes)) {
          console.log(`⚠️ Пропускаем товар: некорректная структура данных`);
          continue;
        }

        // Находим товар по nmID
        const product = await Product.findOne({ nmID: wbGood.nmID });
        if (!product) {
          console.log(`⚠️ Товар с nmID ${wbGood.nmID} не найден в БД`);
          continue;
        }

        // Обновляем цены для каждого размера
        let needsUpdate = false;
        let updatedSizesCount = 0;
        const updatedSizes = product.sizes.map(size => {
          // Ищем соответствующий размер в ответе WB по chrtID
          const wbSize = wbGood.sizes.find(ws => ws.sizeID === size.chrtID);
          
          if (wbSize) {
            const updatedSize = { ...size };
            
            // Обновляем цены WB
            if (wbSize.price !== undefined && wbSize.price !== null) {
              updatedSize.priceWB = wbSize.price;
              needsUpdate = true;
            }
            if (wbSize.discountedPrice !== undefined && wbSize.discountedPrice !== null) {
              updatedSize.discountedPriceWB = wbSize.discountedPrice;
              needsUpdate = true;
            }
            if (wbSize.clubDiscountedPrice !== undefined && wbSize.clubDiscountedPrice !== null) {
              updatedSize.clubDiscountedPriceWB = wbSize.clubDiscountedPrice;
              needsUpdate = true;
            }
            
            // Обновляем время последнего обновления цен
            updatedSize.lastPriceUpdate = new Date();
            updatedSizesCount++;
            
            return updatedSize;
          } else {
            return size;
          }
        });

        // Сохраняем обновления в БД
        if (needsUpdate) {
          // Обновляем конкретные поля размеров
          const updateOperations = [];
          
          updatedSizes.forEach((size, index) => {
            if (size.priceWB !== undefined || size.discountedPriceWB !== undefined || size.clubDiscountedPriceWB !== undefined || size.lastPriceUpdate !== undefined) {
              updateOperations.push({
                $set: {
                  [`sizes.${index}.priceWB`]: size.priceWB,
                  [`sizes.${index}.discountedPriceWB`]: size.discountedPriceWB,
                  [`sizes.${index}.clubDiscountedPriceWB`]: size.clubDiscountedPriceWB,
                  [`sizes.${index}.lastPriceUpdate`]: size.lastPriceUpdate,
                  lastWbPriceUpdate: new Date()
                }
              });
            }
          });
          
          let updateResult;
          if (updateOperations.length > 0) {
            // Выполняем обновления по одному
            for (const operation of updateOperations) {
              updateResult = await Product.updateOne(
                { _id: product._id },
                operation
              );
            }
          } else {
            // Fallback к старому методу
            updateResult = await Product.updateOne(
              { _id: product._id },
              { 
                $set: { 
                  sizes: updatedSizes,
                  lastWbPriceUpdate: new Date()
                } 
              }
            );
          }
        
          if (updateResult.modifiedCount > 0) {
            updated++;
          }
        }

      } catch (error) {
        console.error(`❌ Ошибка при обновлении товара ${wbGood.nmID}:`, error.message);
        errors++;
      }
    }

    return { updated, errors };
  }

  // Получение статуса последнего обновления цен
  async getUpdateStatus() {
    try {
      const lastUpdate = await Product.findOne(
        { lastWbPriceUpdate: { $exists: true } },
        'lastWbPriceUpdate'
      ).sort({ lastWbPriceUpdate: -1 });

      const totalProducts = await Product.countDocuments();
      const productsWithPrices = await Product.countDocuments({ 
        'sizes.priceWB': { $exists: true, $ne: 0 } 
      });

      return {
        lastUpdate: lastUpdate?.lastWbPriceUpdate || null,
        totalProducts,
        productsWithPrices,
        coveragePercentage: totalProducts > 0 ? Math.round((productsWithPrices / totalProducts) * 100) : 0
      };

    } catch (error) {
      console.error('❌ Ошибка в getUpdateStatus:', error);
      throw error;
    }
  }

  // Задержка между запросами
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Получение всех товаров с WB API для тестирования
  async getAllWbGoods(token, maxPages = 10) {
    try {
      if (!token) {
        throw new Error('Токен WB кабинета не предоставлен');
      }

      console.log(`🔍 Получение всех товаров с WB API (максимум ${maxPages} страниц)...`);
      
      let allWbGoods = [];
      let currentOffset = 0;
      const pageLimit = 1000;
      let pageCount = 0;
      
             while (pageCount < maxPages) {
         try {
           pageCount++;
           
           const wbResponse = await this.fetchAllPrices(token, pageLimit, currentOffset);
           
           if (wbResponse && wbResponse.listGoods && wbResponse.listGoods.length > 0) {
             allWbGoods = allWbGoods.concat(wbResponse.listGoods);
             
             // Если получили меньше товаров чем limit, значит это последняя страница
             if (wbResponse.listGoods.length < pageLimit) {
               break;
             }
             
             currentOffset += pageLimit;
             
             // Пауза между страницами
             await this.delay(1000);
           } else {
             break;
           }
         } catch (error) {
           console.error(`❌ Ошибка при получении страницы:`, error.message);
           break;
         }
       }
      
      console.log(`📦 Итого получено товаров с WB API: ${allWbGoods.length}`);
      return allWbGoods;
      
    } catch (error) {
      console.error('❌ Ошибка при получении всех товаров:', error.message);
      throw error;
    }
  }

  // Обновление цен для конкретного WB кабинета по ID
  async updatePricesForCabinetById(cabinetId, limit = 100, offset = 0) {
    try {
      // Находим кабинет
      const cabinet = await WbCabinet.findById(cabinetId).select('+token');
      if (!cabinet) {
        throw new Error(`WB кабинет с ID ${cabinetId} не найден`);
      }

      if (!cabinet.token) {
        throw new Error(`Для кабинета ${cabinet.name} не установлен токен`);
      }

             // Получаем товары для данного кабинета
       const cabinetProducts = await this.getProductsForCabinet(cabinet._id);
       
       if (cabinetProducts.length === 0) {
         return {
           success: true,
           cabinetName: cabinet.name,
           totalProducts: 0,
           updated: 0,
           errors: 0
         };
       }

      // Обновляем цены используя новый подход с получением всех товаров
      const result = await this.updatePricesForCabinet(cabinet, cabinetProducts, limit, offset);
      
      return {
        success: true,
        cabinetName: cabinet.name,
        totalProducts: cabinetProducts.length,
        ...result
      };

    } catch (error) {
      console.error(`❌ Ошибка при обновлении цен для кабинета ${cabinetId}:`, error.message);
      throw error;
    }
  }


}

module.exports = new WbPriceService(); 