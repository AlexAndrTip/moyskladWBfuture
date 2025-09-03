console.log('📦 Импортируем axios для MoySkladPriceService...');
const axios = require('axios');
console.log('✅ axios импортирован');

class MoySkladPriceService {
  constructor() {
    console.log('🔧 Инициализация MoySkladPriceService...');
    this.baseUrl = 'https://api.moysklad.ru/api/remap/1.2';
    console.log('✅ MoySkladPriceService инициализирован с базовым URL:', this.baseUrl);
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
   * @returns {number|null} Цена продажи или null
   */
  extractSalePrice(salePrices) {
    console.log(`  🔍 Извлекаем цену продажи из ${salePrices ? salePrices.length : 0} цен...`);
    
    if (!salePrices || !Array.isArray(salePrices)) {
      console.log(`  ⚠️ salePrices не является массивом или пустой`);
      return null;
    }

    // Выводим информацию о всех ценах
    salePrices.forEach((price, index) => {
      console.log(`    💰 Цена ${index + 1}: value=${price.value}, type=${price.priceType?.name || 'Не указан'}`);
    });

    // Ищем цену продажи по типу "Цена продажи"
    console.log(`  🔍 Ищем цену с типом "Цена продажи"...`);
    const salePrice = salePrices.find(price => 
      price.priceType && 
      price.priceType.name === 'Цена продажи'
    );

    if (salePrice && salePrice.value) {
      console.log(`  ✅ Найдена цена продажи: ${salePrice.value}`);
      return salePrice.value;
    }

    // Если не нашли по названию, берем первую доступную цену
    console.log(`  🔍 Цена продажи не найдена, берем первую доступную цену...`);
    if (salePrices.length > 0 && salePrices[0].value) {
      console.log(`  ✅ Используем первую доступную цену: ${salePrices[0].value}`);
      return salePrices[0].value;
    }

    console.log(`  ⚠️ Подходящая цена не найдена`);
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
      console.log(`🔍 Получаем цены для ${productHrefs.length} товаров по href...`);
      console.log(`🔑 Используем токен: ${token ? 'Настроен' : 'Не настроен'}`);
      
      for (let i = 0; i < productHrefs.length; i++) {
        const href = productHrefs[i];
        console.log(`  📦 Обрабатываем товар ${i + 1}/${productHrefs.length}: ${href}`);
        
        try {
          console.log(`  🌐 Отправляем запрос к МойСклад: ${href}`);
          
          const response = await axios.get(href, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log(`  ✅ Получен ответ от МойСклад, статус: ${response.status}`);
          
          const product = response.data;
          console.log(`  📊 Данные товара получены, salePrices: ${product.salePrices ? product.salePrices.length : 0} цен`);
          
          const salePrice = this.extractSalePrice(product.salePrices);
          console.log(`  💰 Извлеченная цена продажи: ${salePrice}`);
          
          if (salePrice !== null) {
            prices[href] = salePrice;
            console.log(`  ✅ Цена ${salePrice} добавлена для href: ${href}`);
          } else {
            console.log(`  ⚠️ Цена не найдена для href: ${href}`);
          }
        } catch (error) {
          console.error(`  ❌ Ошибка при получении цены для ${href}:`, error.message);
          if (error.response) {
            console.error(`  📊 Статус ответа: ${error.response.status}`);
            console.error(`  📄 Данные ответа:`, error.response.data);
          }
          // Продолжаем с другими товарами
        }
      }

      console.log(`📊 Итого получено цен: ${Object.keys(prices).length}`);
      return prices;
    } catch (error) {
      console.error('❌ Общая ошибка при получении цен по href:', error.message);
      console.error('Детали ошибки:', error.stack);
      throw error;
    }
  }
}

module.exports = MoySkladPriceService;
