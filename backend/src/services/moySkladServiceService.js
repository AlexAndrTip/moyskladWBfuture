const axios = require('axios');

const MOYSKLAD_API_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

/**
 * Получает список всех услуг из МойСклад
 * @param {string} token - Токен API МойСклад
 * @returns {Promise<Array>} - Массив услуг
 */
async function getMoySkladServices(token) {
  try {
    const response = await axios.get(`${MOYSKLAD_API_BASE_URL}/entity/service`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    return response.data.rows || [];
  } catch (error) {
    console.error('Ошибка получения услуг из МойСклад:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
    throw new Error(`Ошибка получения услуг из МойСклад: ${error.message}`);
  }
}

/**
 * Создает новую услугу в МойСклад
 * @param {string} token - Токен API МойСклад
 * @param {string} serviceName - Название услуги
 * @returns {Promise<Object>} - Созданная услуга
 */
async function createMoySkladService(token, serviceName) {
  try {
    const serviceData = {
      name: serviceName
    };

    const response = await axios.post(`${MOYSKLAD_API_BASE_URL}/entity/service`, serviceData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    console.log(`Услуга "${serviceName}" успешно создана в МойСклад`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка создания услуги "${serviceName}" в МойСклад:`, error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
    throw new Error(`Ошибка создания услуги "${serviceName}" в МойСклад: ${error.message}`);
  }
}

/**
 * Находит услугу по названию или создает новую
 * @param {string} token - Токен API МойСклад
 * @param {string} serviceName - Название услуги для поиска/создания
 * @returns {Promise<Object>} - Объект с href и информацией о создании
 */
async function findOrCreateMoySkladService(token, serviceName) {
  try {
    // Получаем все услуги
    const services = await getMoySkladServices(token);
    
    // Ищем услугу по точному названию
    const existingService = services.find(service => service.name === serviceName);
    
    if (existingService) {
      console.log(`Услуга "${serviceName}" найдена в МойСклад`);
      return {
        href: existingService.meta.href,
        name: existingService.name,
        wasCreated: false
      };
    }
    
    // Если услуга не найдена, создаем новую
    console.log(`Услуга "${serviceName}" не найдена, создаем новую`);
    const newService = await createMoySkladService(token, serviceName);
    
    return {
      href: newService.meta.href,
      name: newService.name,
      wasCreated: true
    };
  } catch (error) {
    console.error(`Ошибка поиска/создания услуги "${serviceName}":`, error.message);
    throw error;
  }
}

/**
 * Обрабатывает список услуг WB: находит или создает их в МойСклад
 * @param {string} token - Токен API МойСклад
 * @param {Array<string>} wbServiceNames - Массив названий услуг WB
 * @returns {Promise<Array>} - Массив результатов обработки
 */
async function processWBServices(token, wbServiceNames) {
  const results = [];
  
  for (const serviceName of wbServiceNames) {
    try {
      const result = await findOrCreateMoySkladService(token, serviceName);
      results.push({
        name: serviceName,
        success: true,
        href: result.href,
        wasCreated: result.wasCreated,
        message: result.wasCreated ? 'Создана новая услуга' : 'Найдена существующая услуга'
      });
    } catch (error) {
      results.push({
        name: serviceName,
        success: false,
        href: null,
        wasCreated: false,
        message: error.message
      });
    }
  }
  
  return results;
}

module.exports = {
  getMoySkladServices,
  createMoySkladService,
  findOrCreateMoySkladService,
  processWBServices
}; 