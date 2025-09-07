const axios = require('axios');
const Product = require('../models/Product');

class WbStatisticsService {
  constructor() {
    this.baseUrl = 'https://statistics-api.wildberries.ru/api/v1/supplier/stocks';
    this.timeout = 30000; // 30 секунд
  }

  /**
   * Получить остатки FBY через Statistics API
   * @param {string} token - API токен Wildberries
   * @param {string} dateFrom - Дата начала (формат: 2019-06-20)
   * @param {Object} filters - Дополнительные фильтры
   * @returns {Promise<Array>} - Массив данных об остатках
   */
  async getStocks(token, dateFrom, filters = {}) {
    try {
      console.log('[WB_STATISTICS_SERVICE] Получаем остатки FBY через Statistics API');
      
      const params = {
        dateFrom,
        ...filters
      };

      // Удаляем пустые параметры
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
          delete params[key];
        }
      });

      console.log('[WB_STATISTICS_SERVICE] Параметры запроса:', params);

      const response = await axios.get(this.baseUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: this.timeout
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        console.log(`[WB_STATISTICS_SERVICE] Получено ${response.data.length} записей остатков`);
        return response.data;
      } else {
        throw new Error('Неверный формат ответа от WB Statistics API');
      }
    } catch (error) {
      console.error('[WB_STATISTICS_SERVICE] Ошибка при получении остатков:', error.message);
      if (error.response) {
        console.error(`   - Статус: ${error.response.status}`);
        console.error(`   - Данные ответа:`, error.response.data);
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * Обработать данные остатков и обновить stockFBY в БД
   * @param {Array} stocksData - Данные об остатках
   * @param {string} wbCabinetId - ID кабинета WB
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Результат обработки
   */
  async processStocksData(stocksData, wbCabinetId, userId) {
    try {
      console.log(`[WB_STATISTICS_SERVICE] Начинаем обработку ${stocksData.length} записей остатков`);
      
      let processed = 0;
      let updated = 0;
      let notFound = 0;
      const errors = [];
      const barcodeTotals = new Map(); // Для группировки остатков по баркоду

      // Сначала группируем остатки по баркоду
      for (const item of stocksData) {
        try {
          const { barcode, quantity } = item;
          
          if (!barcode) {
            console.warn(`[WB_STATISTICS_SERVICE] Пропускаем запись без баркода`);
            continue;
          }

          const qty = parseInt(quantity) || 0;
          
          if (barcodeTotals.has(barcode)) {
            barcodeTotals.set(barcode, barcodeTotals.get(barcode) + qty);
          } else {
            barcodeTotals.set(barcode, qty);
          }

        } catch (itemError) {
          console.error(`[WB_STATISTICS_SERVICE] Ошибка при обработке записи:`, itemError.message);
          errors.push({
            barcode: item.barcode,
            error: itemError.message
          });
        }
      }

      console.log(`[WB_STATISTICS_SERVICE] Сгруппировано ${barcodeTotals.size} уникальных баркодов`);

      // Теперь обновляем остатки в БД
      for (const [barcode, totalQuantity] of barcodeTotals) {
        try {
          processed++;
          
          // Ищем товар по баркоду в размерах
          const product = await Product.findOne({
            user: userId,
            wbCabinet: wbCabinetId,
            'sizes.skus': barcode
          });

          if (product) {
            // Находим размер с нужным баркодом
            const sizeIndex = product.sizes.findIndex(size => 
              size.skus && size.skus.includes(barcode)
            );

            if (sizeIndex !== -1) {
              // Обновляем остаток FBY и время последнего обновления
              product.sizes[sizeIndex].stockFBY = totalQuantity;
              product.sizes[sizeIndex].lastStockUpdate = new Date();
              
              await product.save();
              updated++;
              
              console.log(`[WB_STATISTICS_SERVICE] Обновлен остаток FBY для товара ${product.nmID}, размер ${product.sizes[sizeIndex].techSize}: ${totalQuantity} шт.`);
            } else {
              console.warn(`[WB_STATISTICS_SERVICE] Размер с баркодом ${barcode} не найден в товаре ${product.nmID}`);
              notFound++;
            }
          } else {
            console.warn(`[WB_STATISTICS_SERVICE] Товар с баркодом ${barcode} не найден в БД`);
            notFound++;
          }

        } catch (itemError) {
          console.error(`[WB_STATISTICS_SERVICE] Ошибка при обновлении товара с баркодом ${barcode}:`, itemError.message);
          errors.push({
            barcode,
            error: itemError.message
          });
        }
      }

      const result = {
        total: stocksData.length,
        uniqueBarcodes: barcodeTotals.size,
        processed,
        updated,
        notFound,
        errors: errors.length > 0 ? errors : null
      };

      console.log(`[WB_STATISTICS_SERVICE] Обработка завершена:`, result);
      return result;

    } catch (error) {
      console.error('[WB_STATISTICS_SERVICE] Ошибка при обработке данных остатков:', error.message);
      throw error;
    }
  }

  /**
   * Полный процесс получения и обновления остатков FBY через Statistics API
   * @param {string} token - API токен Wildberries
   * @param {string} wbCabinetId - ID кабинета WB
   * @param {string} userId - ID пользователя
   * @param {string} dateFrom - Дата начала (по умолчанию: сегодня)
   * @param {Object} filters - Дополнительные фильтры
   * @returns {Promise<Object>} - Результат операции
   */
  async updateFbyStocks(token, wbCabinetId, userId, dateFrom = null, filters = {}) {
    try {
      console.log(`[WB_STATISTICS_SERVICE] Начинаем обновление остатков FBY через Statistics API для кабинета ${wbCabinetId}`);
      
      // Если дата не указана, используем фиксированную дату начала
      if (!dateFrom) {
        dateFrom = '2019-06-20'; // Фиксированная дата начала
      }

      console.log(`[WB_STATISTICS_SERVICE] Используем дату: ${dateFrom}`);
      
      // 1. Получаем данные об остатках
      const stocksData = await this.getStocks(token, dateFrom, filters);
      
      // 2. Обрабатываем данные и обновляем БД
      const result = await this.processStocksData(stocksData, wbCabinetId, userId);
      
      console.log(`[WB_STATISTICS_SERVICE] Обновление остатков FBY завершено успешно`);
      return {
        success: true,
        dateFrom,
        ...result
      };

    } catch (error) {
      console.error('[WB_STATISTICS_SERVICE] Ошибка при обновлении остатков FBY:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Получить остатки с фильтрацией по конкретным параметрам
   * @param {string} token - API токен Wildberries
   * @param {string} dateFrom - Дата начала
   * @param {Object} filters - Фильтры (warehouseName, supplierArticle, nmId, barcode, etc.)
   * @returns {Promise<Array>} - Отфильтрованные данные об остатках
   */
  async getFilteredStocks(token, dateFrom, filters = {}) {
    try {
      console.log('[WB_STATISTICS_SERVICE] Получаем отфильтрованные остатки FBY');
      console.log('[WB_STATISTICS_SERVICE] Фильтры:', filters);
      
      return await this.getStocks(token, dateFrom, filters);
    } catch (error) {
      console.error('[WB_STATISTICS_SERVICE] Ошибка при получении отфильтрованных остатков:', error.message);
      throw error;
    }
  }

  /**
   * Обработка ошибок API
   * @param {Error} error - Ошибка
   * @returns {Error} - Обработанная ошибка
   */
  handleApiError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          return new Error('Неправильный запрос к WB Statistics API. Проверьте параметры');
        case 401:
          return new Error('Недействительный или просроченный токен WB API');
        case 403:
          return new Error('Токен WB API не имеет достаточных прав для доступа к статистике');
        case 429:
          return new Error('Слишком много запросов к WB API. Попробуйте позже');
        case 500:
          return new Error('Внутренняя ошибка сервера WB Statistics API');
        default:
          return new Error(`Ошибка WB Statistics API (${status}): ${data?.message || error.message}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      return new Error('Таймаут подключения к WB Statistics API. Проверьте сеть');
    } else {
      return new Error(`Ошибка подключения к WB Statistics API: ${error.message}`);
    }
  }
}

module.exports = new WbStatisticsService();
