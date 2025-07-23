const axios = require('axios');

const MOYSKLAD_API_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

/**
 * Получает список всех статей расходов из МойСклад
 * @param {string} token - Токен API МойСклад
 * @returns {Promise<Array>} - Массив статей расходов
 */
async function getMoySkladExpenseItems(token) {
  try {
    const response = await axios.get(`${MOYSKLAD_API_BASE_URL}/entity/expenseitem`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    return response.data.rows || [];
  } catch (error) {
    console.error('Ошибка получения статей расходов из МойСклад:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
    throw new Error(`Ошибка получения статей расходов из МойСклад: ${error.message}`);
  }
}

/**
 * Создает новую статью расходов в МойСклад
 * @param {string} token - Токен API МойСклад
 * @param {string} name - Название статьи расходов
 * @returns {Promise<Object>} - Созданная статья расходов
 */
async function createMoySkladExpenseItem(token, name) {
  try {
    const data = { name };
    const response = await axios.post(`${MOYSKLAD_API_BASE_URL}/entity/expenseitem`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    console.log(`Статья расходов "${name}" успешно создана в МойСклад`);
    return response.data;
  } catch (error) {
    console.error(`Ошибка создания статьи расходов "${name}" в МойСклад:`, error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
    throw new Error(`Ошибка создания статьи расходов "${name}" в МойСклад: ${error.message}`);
  }
}

/**
 * Находит статью расходов по названию или создает новую
 * @param {string} token - Токен API МойСклад
 * @param {string} name - Название статьи расходов
 * @returns {Promise<Object>} - Объект с href и информацией о создании
 */
async function findOrCreateMoySkladExpenseItem(token, name) {
  try {
    const items = await getMoySkladExpenseItems(token);
    const existing = items.find(item => item.name === name);
    if (existing) {
      console.log(`Статья расходов "${name}" найдена в МойСклад`);
      return {
        href: existing.meta.href,
        name: existing.name,
        wasCreated: false
      };
    }
    // Если не найдена, создаем
    console.log(`Статья расходов "${name}" не найдена, создаем новую`);
    const created = await createMoySkladExpenseItem(token, name);
    return {
      href: created.meta.href,
      name: created.name,
      wasCreated: true
    };
  } catch (error) {
    console.error(`Ошибка поиска/создания статьи расходов "${name}":`, error.message);
    throw error;
  }
}

/**
 * Обрабатывает список статей расходов WB: находит или создает их в МойСклад
 * @param {string} token - Токен API МойСклад
 * @param {Array<string>} wbExpenseNames - Массив названий статей расходов WB
 * @returns {Promise<Array>} - Массив результатов обработки
 */
async function processWBExpenseItems(token, wbExpenseNames) {
  const results = [];
  for (const name of wbExpenseNames) {
    try {
      const result = await findOrCreateMoySkladExpenseItem(token, name);
      results.push({
        name,
        success: true,
        href: result.href,
        wasCreated: result.wasCreated,
        message: result.wasCreated ? 'Создана новая статья расходов' : 'Найдена существующая статья расходов'
      });
    } catch (error) {
      results.push({
        name,
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
  getMoySkladExpenseItems,
  createMoySkladExpenseItem,
  findOrCreateMoySkladExpenseItem,
  processWBExpenseItems
}; 