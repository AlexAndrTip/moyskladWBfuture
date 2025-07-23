// backend/src/services/wbService.js
const axios = require('axios');
const { WB_CONTENT_API_URL } = require('../config/constants');

/**
 * Загружает все карточки товаров с Wildberries Content API с пагинацией.
 * @param {string} token - API токен Wildberries.
 * @returns {Promise<Array>} - Массив карточек товаров WB.
 * @throws {Error} - Если произошла ошибка при запросе к WB API.
 */
async function fetchAllProductsFromWb(token) {
    let allCards = [];
    let cursor = { limit: 100 };

    console.log(`[WB_SERVICE] Начинаем загрузку товаров с WB Content API. Начальный лимит: ${cursor.limit}`);

    try {
        let hasMore = true;
        let requestCounter = 0;
        while (hasMore) {
            requestCounter++;
            const requestBody = {
                settings: {
                    cursor: { ...cursor },
                    filter: {
                        withPhoto: -1
                    }
                }
            };

            console.log(`[WB_SERVICE] Запрос #${requestCounter}: Отправляем запрос к ${WB_CONTENT_API_URL} с курсором:`, cursor);

            const response = await axios.post(WB_CONTENT_API_URL, requestBody, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // Таймаут 60 секунд
            });

            const { cards, cursor: nextCursor, total } = response.data;

            console.log(`[WB_SERVICE] Запрос #${requestCounter} завершен. Получено карточек: ${cards ? cards.length : 0}. Total в ответе WB (оставшиеся): ${total !== undefined ? total : 'N/A'}`);

            if (cards && cards.length > 0) {
                allCards = allCards.concat(cards);
            }

            // Условие остановки пагинации
            if (
                (total !== undefined && total < cursor.limit) || // Если общее количество меньше лимита
                (cards && cards.length < cursor.limit) || // Если количество полученных карточек меньше лимита
                !nextCursor || // Если нет следующего курсора
                (nextCursor && (!nextCursor.updatedAt || nextCursor.nmID === undefined)) // Если курсор неполный
            ) {
                hasMore = false;
                console.log(`[WB_SERVICE] Пагинация завершена. Условие остановки выполнено.`);
            } else {
                cursor = {
                    updatedAt: nextCursor.updatedAt,
                    nmID: nextCursor.nmID,
                    limit: cursor.limit
                };
                console.log(`[WB_SERVICE] Переходим к следующему курсору: updatedAt=${cursor.updatedAt}, nmID=${cursor.nmID}`);
            }
        }
        console.log(`[WB_SERVICE] Загрузка с WB завершена. Всего загружено: ${allCards.length} карточек.`);
        return allCards;
    } catch (error) {
        console.error(`[WB_SERVICE ERROR] Ошибка при загрузке товаров с WB Content API. Статус: ${error.response?.status || 'N/A'}, Сообщение: ${error.message}`);
        console.error(`[WB_SERVICE ERROR] Ответ WB API:`, error.response?.data);
        if (error.response && error.response.status === 401) {
            throw new Error('Недействительный или просроченный токен WB API для загрузки товаров.');
        } else if (error.response && error.response.status === 403) {
            throw new Error('Токен WB API не имеет достаточных прав для загрузки товаров.');
        } else if (error.response && error.response.status === 429) {
            throw new Error('Слишком много запросов к WB API (429 Too Many Requests). Попробуйте позже.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Таймаут подключения к WB API. Проверьте сеть или увеличьте таймаут.');
        }
        throw new Error(`Общая ошибка WB API: ${error.response?.data?.message || error.message}`);
    }
}

module.exports = {
    fetchAllProductsFromWb,
};
