const axios = require('axios');

class MoySkladPriceService {
  constructor() {
    this.baseUrl = 'https://api.moysklad.ru/api/remap/1.2';
  }

  /**
   * Получает цены для товаров с одним размером
   * @param {string} token - Токен МойСклад
   * @param {number} limit - Лимит товаров на страницу (макс 1000)
   * @param {number} offset - Смещение для пагинации
   * @returns {Promise<Array>} Массив товаров с ценами
   */
  async getProductPrices(token, limit = 1000, offset = 0) {
    try {
      const response = await axios.get(`${this.baseUrl}/entity/product`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: Math.min(limit, 1000), // Максимум 1000
          offset: offset
        }
      });

      return response.data.rows || [];
    } catch (error) {
      console.error('Ошибка при получении цен товаров из МойСклад:', error.message);
      throw new Error(`Ошибка API МойСклад: ${error.message}`);
    }
  }

  /**
   * Получает цены для вариантов товаров (с размерами)
   * @param {string} token - Токен МойСклад
   * @param {number} limit - Лимит вариантов на страницу (макс 1000)
   * @param {number} offset - Смещение для пагинации
   * @returns {Promise<Array>} Массив вариантов с ценами
   */
  async getVariantPrices(token, limit = 1000, offset = 0) {
    try {
      const response = await axios.get(`${this.baseUrl}/entity/variant`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: Math.min(limit, 1000), // Максимум 1000
          offset: offset
        }
      });

      return response.data.rows || [];
    } catch (error) {
      console.error('Ошибка при получении цен вариантов из МойСклад:', error.message);
      throw new Error(`Ошибка API МойСклад: ${error.message}`);
    }
  }

  /**
   * Извлекает цену продажи из массива цен товара
   * @param {Array} salePrices - Массив цен продажи
   * @returns {number|null} Цена продажи в рублях или null
   */
  extractSalePrice(salePrices) {
    if (!salePrices || !Array.isArray(salePrices)) {
      return null;
    }

    // Ищем цену продажи по типу "Цена продажи"
    const salePrice = salePrices.find(price => 
      price.priceType && 
      price.priceType.name === 'Цена продажи'
    );

    if (salePrice && salePrice.value) {
      // МойСклад отдает цену в копейках, переводим в рубли
      return salePrice.value / 100;
    }

    // Если не нашли по названию, берем первую доступную цену
    if (salePrices.length > 0 && salePrices[0].value) {
      // МойСклад отдает цену в копейках, переводим в рубли
      return salePrices[0].value / 100;
    }

    return null;
  }

  /**
   * Получает все цены товаров с пагинацией
   * @param {string} token - Токен МойСклад
   * @param {string} entityType - Тип сущности: 'product' или 'variant'
   * @returns {Promise<Array>} Все товары/варианты с ценами
   */
  async getAllPricesWithPagination(token, entityType = 'product') {
    const allItems = [];
    let offset = 0;
    const limit = 1000; // Максимальный лимит для МойСклад

    try {
      while (true) {
        let items;
        
        if (entityType === 'variant') {
          items = await this.getVariantPrices(token, limit, offset);
        } else {
          items = await this.getProductPrices(token, limit, offset);
        }

        if (!items || items.length === 0) {
          break; // Больше данных нет
        }

        allItems.push(...items);
        
        if (items.length < limit) {
          break; // Последняя страница
        }

        offset += limit;
      }

      return allItems;
    } catch (error) {
      console.error(`Ошибка при получении всех цен ${entityType} с пагинацией:`, error.message);
      throw error;
    }
  }

  /**
   * Получает цены для конкретных товаров по их href
   * @param {string} token - Токен МойСклад
   * @param {Array} productHrefs - Массив href товаров
   * @returns {Promise<Object>} Объект с ценами по href
   */
  async getPricesByHrefs(token, productHrefs) {
    const prices = {};
    
    try {
      for (let i = 0; i < productHrefs.length; i++) {
        const href = productHrefs[i];
        
        try {
          const response = await axios.get(href, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const product = response.data;
          const salePrice = this.extractSalePrice(product.salePrices);
          
          if (salePrice !== null) {
            prices[href] = salePrice;
          }
        } catch (error) {
          console.error(`Ошибка при получении цены для ${href}:`, error.message);
          // Продолжаем с другими товарами
        }
      }

      return prices;
    } catch (error) {
      console.error('Ошибка при получении цен по href:', error.message);
      throw error;
    }
  }
}

module.exports = MoySkladPriceService;
