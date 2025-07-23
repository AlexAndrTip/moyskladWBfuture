const axios = require('axios');

const WB_INCOMES_API_URL = 'https://statistics-api.wildberries.ru/api/v1/supplier/incomes';

/**
 * Получить все поставки WB с пагинацией по lastChangeDate
 * @param {string} tokenWB - Токен WB
 * @param {string} dateFrom - Дата начала (формат YYYY-MM-DD)
 * @returns {Promise<Array>} - Массив поставок
 */
async function getWbIncomes(tokenWB, dateFrom = '2019-06-20') {
  console.log(`[WB_INCOMES_SERVICE] Начинаем загрузку поставок с даты: ${dateFrom}`);
  
  let allIncomes = [];
  let currentDateFrom = dateFrom;
  let hasMore = true;
  let iteration = 0;

  while (hasMore && iteration < 100) {
    try {
      console.log(`[WB_INCOMES_SERVICE] Итерация ${iteration + 1}: запрашиваем поставки с даты ${currentDateFrom}`);
      
      const response = await axios.get(WB_INCOMES_API_URL, {
        headers: {
          'Authorization': `Bearer ${tokenWB}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params: { dateFrom: currentDateFrom },
        timeout: 30000
      });

      const data = response.data;
      console.log(`[WB_INCOMES_SERVICE] Получено ${Array.isArray(data) ? data.length : 0} поставок в итерации ${iteration + 1}`);
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[WB_INCOMES_SERVICE] Нет данных или пустой массив, завершаем пагинацию`);
        break;
      }

      allIncomes = allIncomes.concat(data);
      console.log(`[WB_INCOMES_SERVICE] Общее количество поставок: ${allIncomes.length}`);

      if (data.length < 100000) {
        console.log(`[WB_INCOMES_SERVICE] Получено меньше 100000 записей, завершаем пагинацию`);
        break;
      }

      // Обновляем дату для следующей итерации
      const lastIncome = data[data.length - 1];
      if (lastIncome && lastIncome.lastChangeDate) {
        currentDateFrom = lastIncome.lastChangeDate;
        console.log(`[WB_INCOMES_SERVICE] Следующая итерация будет с даты: ${currentDateFrom}`);
      } else {
        console.log(`[WB_INCOMES_SERVICE] Нет lastChangeDate в последней записи, завершаем пагинацию`);
        break;
      }
      
      iteration++;
    } catch (error) {
      console.error(`[WB_INCOMES_SERVICE] Ошибка при запросе к WB API (итерация ${iteration + 1}):`, error.message);
      if (error.response) {
        console.error(`[WB_INCOMES_SERVICE] Статус ответа: ${error.response.status}`);
        console.error(`[WB_INCOMES_SERVICE] Данные ответа:`, error.response.data);
      }
      throw new Error(`Ошибка при получении поставок из WB: ${error.message}`);
    }
  }

  console.log(`[WB_INCOMES_SERVICE] Загрузка завершена. Всего получено поставок: ${allIncomes.length}`);
  return allIncomes;
}

module.exports = { getWbIncomes };
