// backend/src/services/productDbService.js
const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');

/**
 * Получает товары из вашей базы данных с пагинацией и поиском.
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @param {number} page - Номер текущей страницы.
 * @param {number} limit - Количество товаров на странице.
 * @param {string} [searchTerm] - Строка для поиска.
 * @param {string} [msFilter] - Фильтр по наличию в МС ('exists' или 'not_exists').
 * @returns {Promise<Object>} - Объект с товарами, текущей страницей, общим количеством страниц и общим количеством товаров.
 * @throws {Error} - Если интеграционная связка не найдена.
 */
async function getProductsFromDb(integrationLinkId, userId, page, limit, searchTerm, msFilter) {
    const skip = (page - 1) * limit;

    console.log(`[PRODUCT_DB_SERVICE] Получен запрос на товары для integrationLink ID: ${integrationLinkId}, страница: ${page}, лимит: ${limit}, поиск: ${searchTerm || 'N/A'}, фильтр МС: ${msFilter || 'N/A'}`);

    try {
        // Проверяем наличие интеграционной связки
        const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId });

        if (!integrationLink) {
            console.error(`[PRODUCT_DB_SERVICE ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
            throw new Error('Интеграционная связка не найдена или не принадлежит вам.');
        }

        // Формируем основной запрос для MongoDB
        let query = { integrationLink: integrationLinkId, user: userId };

        if (searchTerm) {
            const isNumeric = /^\d+$/.test(searchTerm); // Проверка: строка состоит только из цифр

            if (isNumeric) {
                query.$or = [
                    { nmID: Number(searchTerm) },       // числовой поиск
                    { vendorCode: searchTerm },         // точное совпадение
                    { 'sizes.skus': searchTerm },       // точное совпадение
                ];
            } else {
                const searchRegex = new RegExp(searchTerm, 'i'); // регистронезависимый regex
                query.$or = [
                    { title: searchRegex },
                    { vendorCode: searchRegex },
                    { 'sizes.techSize': searchRegex },
                    { 'sizes.skus': searchRegex },
                    { brand: searchRegex },
                ];
            }
        }

        // Фильтр по наличию в МС (ms_href_general ИЛИ ms_href в любом размере)
        if (msFilter === 'exists') {
            query.$or = [
                { ms_href_general: { $exists: true, $ne: null } },
                { 'sizes.ms_href': { $exists: true, $ne: null } }
            ];
        } else if (msFilter === 'not_exists') {
            // Если нужен товар, у которого НЕТ ни общей ссылки, ни ссылок в размерах
            query.$and = [
                {
                    $or: [
                        { ms_href_general: { $exists: false } },
                        { ms_href_general: null }
                    ]
                },
                {
                    $or: [
                        { 'sizes.ms_href': { $exists: false } },
                        { 'sizes.ms_href': null }
                    ]
                }
            ];
        }


        // Получаем товары из вашей БД
        const products = await Product.find(query)
            .skip(skip)
            .limit(limit)
            .select('nmID title brand vendorCode sizes.chrtID sizes.techSize sizes.wbSize sizes.skus sizes.ms_href ms_href_general complect'); // Выбираем все необходимые поля, включая ms_href внутри sizes

        // Подсчитываем общее количество товаров для пагинации
        const totalProducts = await Product.countDocuments(query);

        console.log(`[PRODUCT_DB_SERVICE] Найдено ${products.length} товаров на странице ${page} из ${totalProducts} всего для связки ${integrationLinkId}.`);

        return {
            products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts,
        };
    } catch (error) {
        console.error(`[PRODUCT_DB_SERVICE ERROR] Общая ошибка при получении товаров для связки ${integrationLinkId}: ${error.message}`);
        throw error; // Перебрасываем ошибку для обработки в контроллере
    }
}

/**
 * Удаляет ссылки МойСклад (ms_href_general и ms_href у размеров) для указанных товаров.
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @param {string[]} productIds - Массив ID товаров для обновления.
 * @returns {Promise<{results: Array<{productId: string, status: string, message?: string}>}>}
 */
async function unlinkMoySkladLinks(integrationLinkId, userId, productIds) {
    const results = [];

    for (const productId of productIds) {
        try {
            // Удаляем ms_href_general
            const updateGeneralResult = await Product.updateOne(
                { _id: productId, integrationLink: integrationLinkId, user: userId },
                { $unset: { ms_href_general: 1 } }
            );
            console.log(`[UNLINK] updateGeneralResult for productId ${productId}:`, updateGeneralResult);

            // Удаляем ms_href из каждого объекта размера, не удаляя сам объект размера
            const updateSizesResult = await Product.updateOne(
                { _id: productId, integrationLink: integrationLinkId, user: userId, 'sizes.ms_href': { $exists: true } },
                { $unset: { 'sizes.$[elem].ms_href': '' } },
                { arrayFilters: [{ 'elem.ms_href': { $exists: true } }] }
            );
            console.log(`[UNLINK] updateSizesResult for productId ${productId}:`, updateSizesResult);

            if (updateGeneralResult.modifiedCount > 0 || updateSizesResult.modifiedCount > 0) {
                results.push({
                    productId,
                    status: 'success',
                    message: 'Связки успешно удалены.'
                });
            } else {
                // Если ничего не было изменено, возможно, ссылок и так не было, или товар не найден
                const product = await Product.findOne({ _id: productId, integrationLink: integrationLinkId, user: userId });
                if (!product) {
                    results.push({
                        productId,
                        status: 'error',
                        message: 'Товар не найден или не принадлежит текущей интеграции/пользователю.'
                    });
                } else {
                    results.push({
                        productId,
                        status: 'skipped',
                        message: 'У товара отсутствовали ссылки МойСклад.'
                    });
                }
            }
        } catch (error) {
            console.error(`[PRODUCT_DB_SERVICE ERROR] Ошибка при удалении связки для товара ${productId}:`, error);
            results.push({
                productId,
                status: 'error',
                message: `Ошибка при удалении связки: ${error.message}`
            });
        }
    }
    return { results };
}

/**
 * Массово удаляет ссылки МойСклад (ms_href_general и ms_href у размеров) для группы товаров.
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @param {string[]} [productIds] - Массив ID товаров для обновления (если не selectedAllPages).
 * @param {boolean} [selectedAllPages=false] - Флаг, указывающий, выбраны ли все товары.
 * @returns {Promise<{successCount: number, errorCount: number, message: string, results: Array<{productId?: string, status: string, message?: string}>}>}
 */
async function bulkUnlinkMoySkladLinks(integrationLinkId, userId, productIds, selectedAllPages) {
    let query = {
        integrationLink: integrationLinkId,
        user: userId,
    };

    if (!selectedAllPages && productIds && productIds.length > 0) {
        query._id = { $in: productIds };
    } else if (!selectedAllPages && (!productIds || productIds.length === 0)) {
        // Если не выбраны все страницы, но productIds пуст, это ошибка или нечего обновлять
        return { successCount: 0, errorCount: 0, message: 'Нет выбранных товаров для массового удаления связок.', results: [] };
    }

    try {
        // Обновляем ms_href_general
        const updateGeneralResult = await Product.updateMany(
            { ...query, ms_href_general: { $exists: true, $ne: null } }, // Фильтруем только те, у кого есть поле
            { $unset: { ms_href_general: 1 } }
        );

        // Обновляем ms_href в массиве sizes, используя arrayFilters
        const updateSizesResult = await Product.updateMany(
            { ...query, 'sizes.ms_href': { $exists: true, $ne: null } }, // Находим товары, где есть ms_href в любом размере
            { $unset: { 'sizes.$[elem].ms_href': '' } },
            { arrayFilters: [{ 'elem.ms_href': { $exists: true, $ne: null } }] } // Применяем $unset только к элементам с ms_href
        );

        const totalModified = updateGeneralResult.modifiedCount + updateSizesResult.modifiedCount;

        console.log(`[PRODUCT_DB_SERVICE] Массовое удаление связок завершено: ${totalModified} товаров обновлено.`);

        return {
            successCount: totalModified,
            errorCount: 0, // В updateMany сложно отслеживать ошибки по каждому документу без дополнительных механизмов
            message: `Успешно удалены связки для ${totalModified} товаров.`,
            results: []
        };

    } catch (error) {
        console.error('[PRODUCT_DB_SERVICE ERROR] Ошибка при массовом удалении связок МойСклад:', error);
        throw new Error(`Ошибка массового удаления связок: ${error.message}`);
    }
}


/**
 * Обновляет поле 'complect' для конкретного товара.
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @param {string} productId - ID товара для обновления.
 * @param {boolean} complectValue - Новое значение для поля 'complect' (true или false).
 * @returns {Promise<Object>} - Результат обновления.
 */
async function updateProductComplect(integrationLinkId, userId, productId, complectValue) { // complectValue теперь boolean
    try {
        // ОБНОВЛЕНО: Валидация complectValue
        if (typeof complectValue !== 'boolean') {
            throw new Error('Значение "complect" должно быть true или false.');
        }

        const result = await Product.updateOne(
            { _id: productId, integrationLink: integrationLinkId, user: userId },
            { $set: { complect: complectValue } } // Сохраняем boolean
        );

        if (result.modifiedCount === 0 && result.matchedCount === 0) {
            throw new Error('Товар не найден или не принадлежит вам.');
        }

        return {
            message: `Статус "Комплект" для товара ${productId} успешно обновлен на ${complectValue ? 'true' : 'false'}.`, // Лог для читаемости
            modifiedCount: result.modifiedCount
        };

    } catch (error) {
        console.error(`[PRODUCT_DB_SERVICE ERROR] Ошибка при обновлении поля 'complect' для товара ${productId}: ${error.message}`);
        throw new Error(`Ошибка при обновлении статуса "Комплект": ${error.message}`);
    }
}



// --- НОВАЯ ФУНКЦИЯ: Связать товар WB (или его размер) с товаром/модификацией МойСклад ---
async function linkMoySkladProduct(integrationLinkId, userId, wbProductId, msProductHref, wbSizeChrtID = null) {
    console.log(`[productDbService] Попытка связать WB ID: ${wbProductId}, MS Href: ${msProductHref}, WB Size ChrtID: ${wbSizeChrtID || 'N/A'}`);

    // Проверяем, существует ли интеграционная связка и принадлежит ли она пользователю
    const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId });
    if (!integrationLink) {
        throw new Error(`Интеграционная связка с ID ${integrationLinkId} не найдена или не принадлежит пользователю.`);
    }

    // Находим товар WB по его ID
    const product = await Product.findOne({ _id: wbProductId, integrationLink: integrationLinkId });

    if (!product) {
        throw new Error(`Товар Wildberries с ID ${wbProductId} не найден для данной интеграции.`);
    }

    let isUpdated = false;

    if (wbSizeChrtID) {
        // Если передан chrtID, обновляем ms_href конкретного размера
        if (product.sizes && product.sizes.length > 0) {
            const sizeIndex = product.sizes.findIndex(s => String(s.chrtID) === String(wbSizeChrtID)); // Сравниваем как строки
            if (sizeIndex !== -1) {
                // Если ms_href уже существует и он другой, то это перепривязка
                if (product.sizes[sizeIndex].ms_href && product.sizes[sizeIndex].ms_href !== msProductHref) {
                    console.log(`[productDbService] Перепривязка: размер chrtID ${wbSizeChrtID} WB товара ${wbProductId}. Старый href: ${product.sizes[sizeIndex].ms_href}, Новый href: ${msProductHref}`);
                } else if (!product.sizes[sizeIndex].ms_href) {
                    console.log(`[productDbService] Первая привязка: размер chrtID ${wbSizeChrtID} WB товара ${wbProductId} к href: ${msProductHref}`);
                }
                product.sizes[sizeIndex].ms_href = msProductHref;
                isUpdated = true;
            } else {
                throw new Error(`Размер с chrtID ${wbSizeChrtID} не найден для товара WB ${wbProductId}.`);
            }
        } else {
            throw new Error(`Товар WB ${wbProductId} не содержит размеров, но указан chrtID для связывания.`);
        }
    } else {
        // Если chrtID не передан, обновляем ms_href_general
        if (product.ms_href_general && product.ms_href_general !== msProductHref) {
            console.log(`[productDbService] Перепривязка: основной WB товар ${wbProductId}. Старый href: ${product.ms_href_general}, Новый href: ${msProductHref}`);
        } else if (!product.ms_href_general) {
            console.log(`[productDbService] Первая привязка: основной WB товар ${wbProductId} к href: ${msProductHref}`);
        }
        product.ms_href_general = msProductHref;
        isUpdated = true;
    }

    if (isUpdated) {
        await product.save();
        console.log(`[productDbService] Связка успешно обновлена для товара WB ${wbProductId}.`);
    } else {
        console.log(`[productDbService] Нет изменений в связке для товара WB ${wbProductId}.`);
    }

    // Возвращаем обновленный документ товара
    return product;
}


module.exports = {
    getProductsFromDb,
    unlinkMoySkladLinks,
    bulkUnlinkMoySkladLinks,
    updateProductComplect,
     linkMoySkladProduct,
};
