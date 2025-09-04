const axios = require('axios');

class MoySkladCostService {
  constructor() {
    this.baseUrl = 'https://api.moysklad.ru/api/remap/1.2';
  }

  /**
   * Получает себестоимость всех товаров из отчета МойСклад
   * @param {string} token - Токен МойСклад
   * @returns {Promise<Object>} Объект с себестоимостью по href товара
   */
  async getAllProductCosts(token) {
    try {
      const response = await axios.get(`${this.baseUrl}/report/stock/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          'product.id': 'all'
        }
      });

      const costs = {};
      
      if (response.data && response.data.rows) {
        response.data.rows.forEach(item => {
          if (item.meta && item.meta.href && item.price !== undefined) {
            // МойСклад отдает цену в копейках, переводим в рубли
            costs[item.meta.href] = item.price / 100;
          }
        });
      }

      return costs;
    } catch (error) {
      console.error('Ошибка при получении себестоимости из МойСклад:', error.message);
      throw new Error(`Ошибка API МойСклад: ${error.message}`);
    }
  }

  /**
   * Получает себестоимость для конкретных товаров по их href
   * @param {string} token - Токен МойСклад
   * @param {Array} productHrefs - Массив href товаров
   * @returns {Promise<Object>} Объект с себестоимостью по href
   */
  async getCostsByHrefs(token, productHrefs) {
    try {
      console.log(`Получаем себестоимость для ${productHrefs.length} товаров...`);
      
      // Получаем все себестоимости
      const allCosts = await this.getAllProductCosts(token);
      console.log(`Получено себестоимостей из МойСклад: ${Object.keys(allCosts).length}`);
      
      // Фильтруем только нужные товары
      const filteredCosts = {};
      productHrefs.forEach(href => {
        if (allCosts[href] !== undefined) {
          filteredCosts[href] = allCosts[href];
        }
      });

      console.log(`Найдено себестоимостей для запрошенных товаров: ${Object.keys(filteredCosts).length}`);
      return filteredCosts;
    } catch (error) {
      console.error('Ошибка при получении себестоимости по href:', error.message);
      throw error;
    }
  }
}

module.exports = MoySkladCostService;
