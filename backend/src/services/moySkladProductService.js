// backend/src/services/moySkladProductService.js
const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const { prepareProductDataForMoySklad, executeMoySkladProductOperation } = require('./moySkladUtils');

/**
 * Создает/обновляет товары в МойСклад.
 * Поддерживает индивидуальное создание, массовое по ID и массовое для всех товаров связки.
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @param {string} [productId] - ID одного товара для индивидуальной операции.
 * @param {number} [sizeChrtID] - chrtID размера для индивидуальной операции (если применимо).
 * @param {Array<string>} [productIds] - Массив ID товаров для массовой операции.
 * @param {boolean} [selectedAllPages] - Флаг, указывающий на обработку всех товаров связки.
 * @returns {Promise<Object>} - Результаты операции.
 * @throws {Error} - Если связка не найдена, нет токена МС, или ошибка при обработке товаров.
 */
async function createProductInMoySklad(integrationLinkId, userId, productId, sizeChrtID, productIds, selectedAllPages) {
    console.log(`[MOYSK_PROD_SERVICE] Получен запрос на создание/обновление товаров в МС.`);
    console.log(`[MOYSK_PROD_SERVICE] productId (индивидуально): ${productId || 'N/A'}, productIds (массово): ${productIds ? productIds.length : 'N/A'}, selectedAllPages: ${selectedAllPages}`);

    try {
        const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
            .populate('storage', 'token');

        if (!integrationLink) {
            console.error(`[MOYSK_PROD_SERVICE ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
            throw new Error('Интеграционная связка не найдена или не принадлежит вам.');
        }
        const MOYSKLAD_API_TOKEN = integrationLink.storage.token;
        if (!MOYSKLAD_API_TOKEN) {
            console.error(`[MOYSK_PROD_SERVICE ERROR] Склад "${integrationLink.storage.name}" не имеет токена МойСклад API.`);
            throw new Error('Склад в интеграционной связке не имеет токена МойСклад API.');
        }
        console.log(`[MOYSK_PROD_SERVICE] Токен МойСклад API получен.`);

        let productsToLoadIds = []; // ID товаров, которые нужно загрузить из БД для обработки
        if (productId) { // Индивидуальный запрос
            productsToLoadIds.push(productId);
        } else if (productIds && productIds.length > 0) { // Массовый запрос по ID
            productsToLoadIds = productIds;
        } else if (selectedAllPages) { // Массовый запрос для всех товаров
            const allProductsForIntegration = await Product.find({ integrationLink: integrationLinkId, user: userId }).select('_id'); // Только ID
            productsToLoadIds = allProductsForIntegration.map(p => p._id);
            console.log(`[MOYSK_PROD_SERVICE] Для массовой операции выбрано ${productsToLoadIds.length} товаров по флагу selectedAllPages.`);
        } else {
            console.error(`[MOYSK_PROD_SERVICE ERROR] Не выбраны товары для создания/обновления.`);
            throw new Error('Не выбраны товары для создания/обновления.');
        }

        if (productsToLoadIds.length === 0) {
            console.log(`[MOYSK_PROD_SERVICE] Нет товаров для обработки после фильтрации.`);
            return { message: 'Нет товаров для обработки.', results: [] };
        }

        // Загружаем полные объекты продуктов из БД
        const productsFromDb = await Product.find({ _id: { $in: productsToLoadIds }, integrationLink: integrationLinkId, user: userId });
        console.log(`[MOYSK_PROD_SERVICE] Загружено ${productsFromDb.length} полных объектов товаров из БД.`);

        // --- Подготовка запросов для МойСклад и их выполнение ---
        const moySkladRequests = [];
        // Карта для сопоставления ответа МС с оригинальным продуктом по externalCode (nmID)
        // Map будет хранить { externalCode (nmID): { product: ProductDoc, targetSize: SizeObj, preparedData: {...} } }
        const productsMapByExternalCode = new Map();

        for (const product of productsFromDb) {
            let preparedData;
            try {
                // Для индивидуального запроса передаем sizeChrtID, для массового - null (чтобы prepareProductDataForMoySklad брал первый/единственный размер)
                preparedData = prepareProductDataForMoySklad(product, productId ? sizeChrtID : null);
                moySkladRequests.push(preparedData.moySkladItem);
                // Сохраняем оригинальный product и targetSize, чтобы потом обновить ms_href
                productsMapByExternalCode.set(preparedData.moySkladItem.externalCode, { product: product, targetSize: preparedData.targetSize, preparedData: preparedData });
            } catch (prepError) {
                console.warn(`[MOYSK_PROD_SERVICE WARNING] Пропущен товар ${product.nmID} из-за ошибки подготовки: ${prepError.message}`);
                // Для массовых - просто добавляем ошибку в результат, без остановки
                productsMapByExternalCode.set(product.nmID.toString(), { product: product, targetSize: null, errorResult: {
                    productId: product._id, nmID: product.nmID, title: product.title, status: 'error', message: `Ошибка подготовки: ${prepError.message}`
                }});
            }
        }

        if (moySkladRequests.length === 0) {
            console.log(`[MOYSK_PROD_SERVICE] После подготовки нет товаров для отправки в МойСклад.`);
            const resultsFromSkipped = Array.from(productsMapByExternalCode.values())
                                            .filter(item => item.errorResult)
                                            .map(item => item.errorResult);
            return { message: 'Нет товаров для обработки после подготовки.', results: resultsFromSkipped };
        }

        console.log(`[MOYSK_PROD_SERVICE] Вызываем executeMoySkladProductOperation для ${moySkladRequests.length} товаров.`);
        const { results: operationResults } = await executeMoySkladProductOperation(
            moySkladRequests, MOYSKLAD_API_TOKEN, productsMapByExternalCode, userId
        );

        // Возвращаем результаты в соответствии с типом запроса
        if (productId) { // Если это был индивидуальный запрос
            const individualResult = operationResults.find(r => r.productId.toString() === productId.toString());
            if (individualResult) {
                return individualResult;
            } else {
                throw new Error('Неизвестная ошибка: индивидуальная операция не вернула результат.');
            }
        } else { // Для массовых запросов
            return { message: 'Массовая операция завершена.', results: operationResults };
        }

    } catch (error) {
        console.error(`[MOYSK_PROD_SERVICE ERROR] Общая ошибка при создании товаров в МойСклад: ${error.message}`);
        throw error; // Перебрасываем ошибку для обработки в контроллере
    }
}





module.exports = {
    createProductInMoySklad,
};
