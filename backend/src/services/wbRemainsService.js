const axios = require('axios');
const Product = require('../models/Product');

class WbRemainsService {
  constructor() {
    this.baseUrl = 'https://seller-analytics-api.wildberries.ru/api/v1/warehouse_remains';
    this.timeout = 30000; // 30 секунд
    this.statusCheckInterval = 5000; // 5 секунд
    this.maxStatusChecks = 60; // Максимум 5 минут ожидания
  }

  /**
   * Создать запрос на генерацию отчета остатков FBY
   * @param {string} token - API токен Wildberries
   * @returns {Promise<string>} - taskId для отслеживания статуса
   */
  async createRemainsReport(token) {
    try {
      console.log('[WB_REMAINS_SERVICE] Создаем запрос на генерацию отчета остатков FBY');
      
      const response = await axios.get(this.baseUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      if (response.status === 200 && response.data && response.data.data && response.data.data.taskId) {
        const taskId = response.data.data.taskId;
        console.log(`[WB_REMAINS_SERVICE] Отчет создан успешно. TaskId: ${taskId}`);
        return taskId;
      } else {
        throw new Error('Неверный формат ответа от WB API при создании отчета');
      }
    } catch (error) {
      console.error('[WB_REMAINS_SERVICE] Ошибка при создании отчета остатков:', error.message);
      if (error.response) {
        console.error(`   - Статус: ${error.response.status}`);
        console.error(`   - Данные ответа:`, error.response.data);
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * Проверить статус отчета
   * @param {string} token - API токен Wildberries
   * @param {string} taskId - ID задачи
   * @returns {Promise<Object>} - Статус отчета
   */
  async checkReportStatus(token, taskId) {
    try {
      const url = `${this.baseUrl}/tasks/${taskId}/status`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      if (response.status === 200 && response.data && response.data.data) {
        return response.data.data;
      } else {
        throw new Error('Неверный формат ответа от WB API при проверке статуса');
      }
    } catch (error) {
      console.error(`[WB_REMAINS_SERVICE] Ошибка при проверке статуса отчета ${taskId}:`, error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Ожидать готовности отчета с периодической проверкой статуса
   * @param {string} token - API токен Wildberries
   * @param {string} taskId - ID задачи
   * @returns {Promise<Object>} - Данные готового отчета
   */
  async waitForReportReady(token, taskId) {
    console.log(`[WB_REMAINS_SERVICE] Ожидаем готовности отчета ${taskId}`);
    
    let attempts = 0;
    
    while (attempts < this.maxStatusChecks) {
      try {
        const statusData = await this.checkReportStatus(token, taskId);
        const status = statusData.status;
        
        console.log(`[WB_REMAINS_SERVICE] Проверка ${attempts + 1}/${this.maxStatusChecks}. Статус: ${status}`);
        
        if (status === 'done') {
          console.log(`[WB_REMAINS_SERVICE] Отчет ${taskId} готов!`);
          return await this.downloadReport(token, taskId);
        } else if (status === 'canceled' || status === 'purged') {
          throw new Error(`Отчет ${taskId} был отменен или удален. Статус: ${status}`);
        } else if (status === 'new' || status === 'processing') {
          // Продолжаем ожидание
          attempts++;
          if (attempts < this.maxStatusChecks) {
            console.log(`[WB_REMAINS_SERVICE] Ждем ${this.statusCheckInterval/1000} секунд до следующей проверки...`);
            await this.sleep(this.statusCheckInterval);
          }
        } else {
          throw new Error(`Неизвестный статус отчета: ${status}`);
        }
      } catch (error) {
        if (error.message.includes('отменен') || error.message.includes('удален') || error.message.includes('Неизвестный статус')) {
          throw error;
        }
        
        attempts++;
        console.error(`[WB_REMAINS_SERVICE] Ошибка при проверке статуса (попытка ${attempts}):`, error.message);
        
        if (attempts >= this.maxStatusChecks) {
          throw new Error(`Превышено максимальное количество попыток проверки статуса отчета ${taskId}`);
        }
        
        // Ждем перед следующей попыткой
        await this.sleep(this.statusCheckInterval);
      }
    }
    
    throw new Error(`Отчет ${taskId} не был готов в течение ${this.maxStatusChecks * this.statusCheckInterval / 1000} секунд`);
  }

  /**
   * Скачать готовый отчет остатков
   * @param {string} token - API токен Wildberries
   * @param {string} taskId - ID задачи
   * @returns {Promise<Array>} - Массив данных об остатках
   */
  async downloadReport(token, taskId) {
    try {
      const url = `${this.baseUrl}/tasks/${taskId}/download`;
      
      console.log(`[WB_REMAINS_SERVICE] Скачиваем отчет ${taskId}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        console.log(`[WB_REMAINS_SERVICE] Отчет скачан успешно. Получено ${response.data.length} записей`);
        return response.data;
      } else {
        throw new Error('Неверный формат данных отчета от WB API');
      }
    } catch (error) {
      console.error(`[WB_REMAINS_SERVICE] Ошибка при скачивании отчета ${taskId}:`, error.message);
      throw this.handleApiError(error);
    }
  }

  /**
   * Обработать данные отчета и обновить остатки FBY в БД
   * @param {Array} remainsData - Данные отчета об остатках
   * @param {string} wbCabinetId - ID кабинета WB
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Результат обработки
   */
  async processRemainsData(remainsData, wbCabinetId, userId) {
    try {
      console.log(`[WB_REMAINS_SERVICE] Начинаем обработку ${remainsData.length} записей остатков`);
      
      let processed = 0;
      let updated = 0;
      let notFound = 0;
      const errors = [];

      for (const item of remainsData) {
        try {
          processed++;
          
          // Извлекаем данные из отчета
          const { barcode, warehouses } = item;
          
          if (!barcode || !warehouses || !Array.isArray(warehouses)) {
            console.warn(`[WB_REMAINS_SERVICE] Пропускаем запись ${processed}: отсутствует баркод или данные складов`);
            continue;
          }

          // Считаем общий остаток по всем складам
          let totalQuantity = 0;
          for (const warehouse of warehouses) {
            if (warehouse.quantity && typeof warehouse.quantity === 'number') {
              totalQuantity += warehouse.quantity;
            }
          }

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
              
              console.log(`[WB_REMAINS_SERVICE] Обновлен остаток FBY для товара ${product.nmID}, размер ${product.sizes[sizeIndex].techSize}: ${totalQuantity} шт.`);
            } else {
              console.warn(`[WB_REMAINS_SERVICE] Размер с баркодом ${barcode} не найден в товаре ${product.nmID}`);
              notFound++;
            }
          } else {
            console.warn(`[WB_REMAINS_SERVICE] Товар с баркодом ${barcode} не найден в БД`);
            notFound++;
          }

        } catch (itemError) {
          console.error(`[WB_REMAINS_SERVICE] Ошибка при обработке записи ${processed}:`, itemError.message);
          errors.push({
            record: processed,
            barcode: item.barcode,
            error: itemError.message
          });
        }
      }

      const result = {
        total: remainsData.length,
        processed,
        updated,
        notFound,
        errors: errors.length > 0 ? errors : null
      };

      console.log(`[WB_REMAINS_SERVICE] Обработка завершена:`, result);
      return result;

    } catch (error) {
      console.error('[WB_REMAINS_SERVICE] Ошибка при обработке данных остатков:', error.message);
      throw error;
    }
  }

  /**
   * Полный процесс получения и обновления остатков FBY
   * @param {string} token - API токен Wildberries
   * @param {string} wbCabinetId - ID кабинета WB
   * @param {string} userId - ID пользователя
   * @returns {Promise<Object>} - Результат операции
   */
  async updateFbyRemains(token, wbCabinetId, userId) {
    try {
      console.log(`[WB_REMAINS_SERVICE] Начинаем обновление остатков FBY для кабинета ${wbCabinetId}`);
      
      // 1. Создаем запрос на генерацию отчета
      const taskId = await this.createRemainsReport(token);
      
      // 2. Ожидаем готовности отчета
      const remainsData = await this.waitForReportReady(token, taskId);
      
      // 3. Обрабатываем данные и обновляем БД
      const result = await this.processRemainsData(remainsData, wbCabinetId, userId);
      
      console.log(`[WB_REMAINS_SERVICE] Обновление остатков FBY завершено успешно`);
      return {
        success: true,
        taskId,
        ...result
      };

    } catch (error) {
      console.error('[WB_REMAINS_SERVICE] Ошибка при обновлении остатков FBY:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Вспомогательная функция для задержки
   * @param {number} ms - Миллисекунды
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        case 401:
          return new Error('Недействительный или просроченный токен WB API');
        case 403:
          return new Error('Токен WB API не имеет достаточных прав для доступа к отчетам остатков');
        case 404:
          return new Error('Отчет не найден или был удален');
        case 429:
          return new Error('Слишком много запросов к WB API. Попробуйте позже');
        case 500:
          return new Error('Внутренняя ошибка сервера WB API');
        default:
          return new Error(`Ошибка WB API (${status}): ${data?.message || error.message}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      return new Error('Таймаут подключения к WB API. Проверьте сеть');
    } else {
      return new Error(`Ошибка подключения к WB API: ${error.message}`);
    }
  }
}

module.exports = new WbRemainsService();
