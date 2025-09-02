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
      console.log('🚀 Начало обновления цен для всех WB кабинетов...');
      
      // Сначала находим все уникальные wbCabinet ID из товаров
      const uniqueCabinetIds = await Product.distinct('wbCabinet');
      console.log(`🔍 Найдено уникальных wbCabinet ID в товарах: ${uniqueCabinetIds.length}`);
      
      if (uniqueCabinetIds.length === 0) {
        throw new Error('В товарах не найдено ссылок на WB кабинеты');
      }
      
      // Получаем кабинеты с токенами для найденных ID
      const wbCabinets = await WbCabinet.find({ 
        _id: { $in: uniqueCabinetIds },
        token: { $exists: true, $ne: '' }
      }).select('+token');
      
      console.log(`🏢 Найдено WB кабинетов с токенами: ${wbCabinets.length}`);
      
      if (wbCabinets.length === 0) {
        throw new Error('Все найденные кабинеты не имеют токенов');
      }
      
      // Выводим информацию о каждом кабинете
      wbCabinets.forEach(cabinet => {
        console.log(`   - ${cabinet.name} (ID: ${cabinet._id}) - Токен: установлен`);
      });

      let totalUpdated = 0;
      let totalErrors = 0;
      const results = [];

      // Обрабатываем каждый WB кабинет
      for (const cabinet of wbCabinets) {
        try {
          console.log(`\n🏢 Обработка кабинета: ${cabinet.name} (ID: ${cabinet._id})`);
          
          // Проверяем токен кабинета
          if (!cabinet.token || cabinet.token.trim() === '') {
            console.log(`⚠️ Для кабинета ${cabinet.name} не установлен токен - пропускаем`);
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
            console.log(`⚠️ Для кабинета ${cabinet.name} не найдено товаров`);
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

          console.log(`📦 Найдено товаров для кабинета ${cabinet.name}: ${cabinetProducts.length}`);

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
      console.log(`🔗 Найдено integrationLinks: ${integrationLinks.length}`);
      
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
      console.log(`🔑 Проверка токена для кабинета ${cabinet.name}:`);
      console.log(`   - ID кабинета: ${cabinet._id}`);
      console.log(`   - Токен: ${cabinet.token ? `"${cabinet.token}"` : 'НЕ УСТАНОВЛЕН'}`);
      console.log(`   - Тип токена: ${typeof cabinet.token}`);
      console.log(`   - Длина токена: ${cabinet.token ? cabinet.token.length : 0}`);
      
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

      console.log(`🔄 Обработка ${nmIDs.length} товаров для кабинета ${cabinet.name}`);

      let totalUpdated = 0;
      let totalErrors = 0;

      // Получаем все товары с WB API с пагинацией
      console.log(`🔄 Получение всех товаров с WB API для кабинета ${cabinet.name}...`);
      
      let allWbGoods = [];
      let currentOffset = 0;
      const pageLimit = 1000; // Максимальный размер страницы
      
      while (true) {
        try {
          console.log(`📄 Запрос страницы ${Math.floor(currentOffset / pageLimit) + 1} (offset: ${currentOffset})`);
          
          const wbResponse = await this.fetchAllPrices(cabinet.token, pageLimit, currentOffset);
          
          if (wbResponse && wbResponse.listGoods && wbResponse.listGoods.length > 0) {
            allWbGoods = allWbGoods.concat(wbResponse.listGoods);
            console.log(`📦 Получено товаров на странице: ${wbResponse.listGoods.length}`);
            console.log(`📦 Всего получено товаров: ${allWbGoods.length}`);
            
            // Если получили меньше товаров чем limit, значит это последняя страница
            if (wbResponse.listGoods.length < pageLimit) {
              console.log(`🏁 Достигнут конец списка товаров`);
              break;
            }
            
            currentOffset += pageLimit;
            
            // Пауза между страницами
            await this.delay(1000);
          } else {
            console.log(`⚠️ Пустой ответ от WB API на странице ${Math.floor(currentOffset / pageLimit) + 1}`);
            break;
          }
        } catch (error) {
          console.error(`❌ Ошибка при получении страницы ${Math.floor(currentOffset / pageLimit) + 1}:`, error.message);
          totalErrors += 1;
          break;
        }
      }
      
      console.log(`📦 Всего получено товаров с WB API: ${allWbGoods.length}`);
      
      if (allWbGoods.length === 0) {
        console.log(`⚠️ Не удалось получить товары с WB API для кабинета ${cabinet.name}`);
        return { updated: 0, errors: totalErrors };
      }
      
             // Фильтруем товары по нужным nmID
       const neededNmIDs = new Set(nmIDs);
       console.log(`🔍 Поиск товаров по nmID: ${Array.from(neededNmIDs).slice(0, 10).join(', ')}${neededNmIDs.size > 10 ? '...' : ''}`);
       
       const filteredWbGoods = allWbGoods.filter(good => neededNmIDs.has(good.nmID));
       
       console.log(`🔍 Найдено товаров из ${nmIDs.length} нужных: ${filteredWbGoods.length}`);
       
       if (filteredWbGoods.length > 0) {
         console.log(`📋 Список найденных товаров:`);
         filteredWbGoods.forEach((good, index) => {
           console.log(`   ${index + 1}. nmID: ${good.nmID}, размеров: ${good.sizes ? good.sizes.length : 0}`);
         });
         
         // Обновляем цены в БД для найденных товаров
         const updateResult = await this.updateProductPrices(filteredWbGoods);
         totalUpdated += updateResult.updated;
         totalErrors += updateResult.errors;
       } else {
         console.log(`⚠️ Не найдено товаров для обновления цен`);
         console.log(`📊 Доступные nmID в WB API: ${allWbGoods.slice(0, 10).map(g => g.nmID).join(', ')}${allWbGoods.length > 10 ? '...' : ''}`);
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
      
      console.log(`📡 Запрос к WB API (страница ${Math.floor(offset / limit) + 1}):`);
      console.log(`   - URL: ${url}`);
      console.log(`   - Метод: GET`);
      console.log(`   - Параметры: limit=${limit}, offset=${offset}`);
      console.log(`   - Токен: ${token.substring(0, 20)}...`);
      
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
        console.log(`✅ Ответ от WB API (страница ${Math.floor(offset / limit) + 1}):`);
        console.log(`   - Статус: ${response.status}`);
        console.log(`   - Полный ответ:`, JSON.stringify(response.data, null, 2));
        
        if (response.data.listGoods) {
          console.log(`   - Количество товаров в ответе: ${response.data.listGoods.length}`);
        } else {
          console.log(`   - Поле listGoods отсутствует в ответе`);
          console.log(`   - Доступные поля:`, Object.keys(response.data));
          
          // Попробуем альтернативные поля
          if (response.data.data && response.data.data.listGoods) {
            console.log(`   - Найдено поле data.listGoods`);
            return response.data;
          }
          
          if (response.data.goods) {
            console.log(`   - Найдено поле goods`);
            return { listGoods: response.data.goods };
          }
          
          if (response.data.items) {
            console.log(`   - Найдено поле items`);
            return { listGoods: response.data.items };
          }
        }
        return response.data;
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

        console.log(`🔍 Обработка товара nmID: ${wbGood.nmID}, размеров: ${wbGood.sizes.length}`);

        // Находим товар по nmID
        const product = await Product.findOne({ nmID: wbGood.nmID });
        if (!product) {
          console.log(`⚠️ Товар с nmID ${wbGood.nmID} не найден в БД`);
          continue;
        }

        console.log(`📦 Найден товар: ${product.title || product.nmID} (ID: ${product._id})`);
        console.log(`📏 Размеров в БД: ${product.sizes.length}`);

        // Обновляем цены для каждого размера
        let needsUpdate = false;
        let updatedSizesCount = 0;
        const updatedSizes = product.sizes.map(size => {
          // Ищем соответствующий размер в ответе WB по chrtID
          const wbSize = wbGood.sizes.find(ws => ws.sizeID === size.chrtID);
          
          if (wbSize) {
            console.log(`   📏 Размер chrtID: ${size.chrtID} найден в WB API`);
            console.log(`   💰 Цены WB: price=${wbSize.price}, discounted=${wbSize.discountedPrice}, club=${wbSize.clubDiscountedPrice}`);
            
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
            console.log(`   ⚠️ Размер chrtID: ${size.chrtID} не найден в WB API`);
            return size;
          }
        });

        // Сохраняем обновления в БД
        if (needsUpdate) {
          await Product.updateOne(
            { _id: product._id },
            { 
              $set: { 
                sizes: updatedSizes,
                lastWbPriceUpdate: new Date()
              } 
            }
          );
          updated++;
          console.log(`✅ Обновлены цены для товара ${product.title || product.nmID} (nmID: ${wbGood.nmID})`);
          console.log(`   📊 Обновлено размеров: ${updatedSizesCount}/${product.sizes.length}`);
        } else {
          console.log(`ℹ️ Товар ${product.title || product.nmID} не требует обновления`);
        }

      } catch (error) {
        console.error(`❌ Ошибка при обновлении товара ${wbGood.nmID}:`, error.message);
        errors++;
      }
    }

    console.log(`📊 Результат обновления цен: обновлено товаров: ${updated}, ошибок: ${errors}`);
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
          console.log(`📄 Запрос страницы ${pageCount} (offset: ${currentOffset})`);
          
          const wbResponse = await this.fetchAllPrices(token, pageLimit, currentOffset);
          
          if (wbResponse && wbResponse.listGoods && wbResponse.listGoods.length > 0) {
            allWbGoods = allWbGoods.concat(wbResponse.listGoods);
            console.log(`📦 Получено товаров на странице: ${wbResponse.listGoods.length}`);
            console.log(`📦 Всего получено товаров: ${allWbGoods.length}`);
            
            // Если получили меньше товаров чем limit, значит это последняя страница
            if (wbResponse.listGoods.length < pageLimit) {
              console.log(`🏁 Достигнут конец списка товаров`);
              break;
            }
            
            currentOffset += pageLimit;
            
            // Пауза между страницами
            await this.delay(1000);
          } else {
            console.log(`⚠️ Пустой ответ от WB API на странице ${pageCount}`);
            break;
          }
        } catch (error) {
          console.error(`❌ Ошибка при получении страницы ${pageCount}:`, error.message);
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

      console.log(`🏢 Обновление цен для кабинета: ${cabinet.name}`);

      // Получаем товары для данного кабинета
      const cabinetProducts = await this.getProductsForCabinet(cabinet._id);
      
      if (cabinetProducts.length === 0) {
        console.log(`⚠️ Для кабинета ${cabinet.name} не найдено товаров`);
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