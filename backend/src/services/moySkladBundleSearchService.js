const axios = require('axios');
const IntegrationLink = require('../models/IntegrationLink');

const MOYSKLAD_BUNDLE_API_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/bundle';

/**
 * Получает список комплектов из МойСклад с пагинацией и фильтрацией.
 * @param {string} integrationLinkId - ID интеграционной связки для получения токена МС.
 * @param {string} userId - ID текущего пользователя.
 * @param {number} limit - Максимальное количество комплектов для извлечения (1-1000).
 * @param {number} offset - Отступ в выдаваемом списке сущностей.
 * @param {string} searchTerm - Опциональный поисковый запрос (для фильтрации по имени/коду).
 * @returns {Promise<Object>} Объект, содержащий массив комплектов (rows) и общее количество (meta.size).
 * @throws {Error} Если связка не найдена, нет токена МС, или ошибка при запросе к МС API.
 */
async function getBundlesFromMoySklad(integrationLinkId, userId, limit, offset, searchTerm) {
    console.log(`[MOYSK_BUNDLE_SEARCH_SERVICE] Запрос комплектов из МойСклад: limit=${limit}, offset=${offset}, searchTerm='${searchTerm}'`);

    // Логика получения токена из БД через IntegrationLink
    const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
        .populate('storage', 'token');

    if (!integrationLink) {
        console.error(`[MOYSK_BUNDLE_SEARCH_SERVICE ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
        throw new Error('Интеграционная связка не найдена или не принадлежит вам.');
    }
    const MOYSKLAD_API_TOKEN = integrationLink.storage.token;
    if (!MOYSKLAD_API_TOKEN) {
        console.error(`[MOYSK_BUNDLE_SEARCH_SERVICE ERROR] Склад "${integrationLink.storage.name}" не имеет токена МойСклад API.`);
        throw new Error('Склад в интеграционной связке не имеет токена МойСклад API.');
    }

    const headers = {
        'Authorization': `Bearer ${MOYSKLAD_API_TOKEN}`,
        'Content-Type': 'application/json',
    };

    const params = {
        limit: limit,
        offset: offset,
        ...(searchTerm && { search: searchTerm })
    };

    try {
        const response = await axios.get(MOYSKLAD_BUNDLE_API_URL, {
            headers,
            params,
            timeout: 30000 // Таймаут 30 секунд
        });

        console.log(`[MOYSK_BUNDLE_SEARCH_SERVICE SUCCESS] Получено ${response.data.rows.length} комплектов из МойСклад (всего: ${response.data.meta.size}).`);
        return response.data;
    } catch (error) {
        console.error(`[MOYSK_BUNDLE_SEARCH_SERVICE ERROR] Ошибка при запросе комплектов из МойСклад: ${error.message}`);
        if (error.response) {
            console.error(`[MOYSK_BUNDLE_SEARCH_SERVICE ERROR] Ответ МойСклад API:`, error.response.data);
            throw new Error(`Ошибка МойСклад API: ${error.response.data.errors?.[0]?.error || error.response.status}`);
        } else if (error.request) {
            throw new Error('Не удалось получить ответ от МойСклад API при запросе комплектов. Проверьте соединение.');
        } else {
            throw new Error(`Неизвестная ошибка при запросе комплектов к МойСклад: ${error.message}`);
        }
    }
}

module.exports = {
    getBundlesFromMoySklad
}; 