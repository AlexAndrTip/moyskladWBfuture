// backend/src/services/moySkladVariantService.js
const axios = require('axios');
const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const { MOYSKLAD_VARIANT_API_URL, MOYSKLAD_SIZE_CHARACTERISTIC_NAME } = require('../config/constants');

/**
 * Создает модификации для одного товара в МойСклад.
 * @param {Object} product - Объект товара из вашей БД.
 * @param {string} MOYSKLAD_API_TOKEN - Токен МойСклад API.
 * @param {string} userId - ID пользователя.
 * @returns {Promise<Array>} - Массив результатов для каждой модификации.
 * @throws {Error} - Если не настроено имя характеристики размера, нет ms_href_general, или недостаточно размеров.
 */
async function createVariantsForProductInMoySklad(product, MOYSKLAD_API_TOKEN, userId) {
    const variantCreationResults = [];

    if (!MOYSKLAD_SIZE_CHARACTERISTIC_NAME) {
        throw new Error('Имя характеристики "Размер" МойСклад не настроено.');
    }
    if (!product.ms_href_general) {
        throw new Error(`Товар "${product.title}" (nmID: ${product.nmID}) не имеет общей ссылки (ms_href_general) в МойСклад. Сначала создайте основной товар.`);
    }
    if (!product.sizes || product.sizes.length <= 1) {
        // Согласно ТЗ, модификации создаются только если размеров БОЛЬШЕ ОДНОГО.
        throw new Error(`Товар "${product.title}" (nmID: ${product.nmID}) имеет ${product.sizes ? product.sizes.length : 0} размеров. Для создания модификаций требуется более одного размера.`);
    }

    const productMeta = {
        meta: {
            href: product.ms_href_general,
            type: 'product',
            mediaType: 'application/json'
        }
    };

    console.log(`[MOYSK_VAR_SERVICE] Начинаем создание модификаций для товара ${product.nmID} (${product.title}).`);
    for (const size of product.sizes) {
        const resultItem = {
            chrtID: size.chrtID,
            techSize: size.techSize,
            status: 'error',
            message: ''
        };

        if (size.ms_href) { // ms_href для модификации
            console.log(`[MOYSK_VAR_SERVICE] Модификация для размера "${size.techSize}" товара ${product.nmID} уже существует (ms_href: ${size.ms_href}). Пропускаем.`);
            resultItem.status = 'skipped';
            resultItem.message = `Модификация для размера "${size.techSize}" уже существует.`;
            resultItem.ms_href = size.ms_href;
            variantCreationResults.push(resultItem);
            continue;
        }

        const requestBody = {
            name: `${product.title} (${size.techSize})`, // Название модификации: "Название товара (Размер)"
            product: productMeta, // Привязка к основному товару
            characteristics: [
                {
                    name: MOYSKLAD_SIZE_CHARACTERISTIC_NAME, // <-- Используем имя характеристики
                    value: size.wbSize || size.techSize // Используем wbSize, если есть, иначе techSize
                }
            ]
        };

        if (size.skus && size.skus.length > 0) {
            requestBody.code = size.skus[0]; // SKU как code для модификации
        }

        console.log(`[MOYSK_VAR_SERVICE] Отправляем запрос на создание модификации для товара ${product.nmID}, размер ${size.techSize}:`);
        console.log(`[MOYSK_VAR_SERVICE] Тело запроса к МойСклад Variant API:`, JSON.stringify(requestBody, null, 2));

        try {
            const msResponse = await axios.post(MOYSKLAD_VARIANT_API_URL, requestBody, {
                headers: {
                    'Authorization': `Bearer ${MOYSKLAD_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000 // Таймаут 30 секунд для одной модификации
            });

            const msVariantMeta = msResponse.data.meta;
            console.log(`[MOYSK_VAR_SERVICE SUCCESS] Модификация для ${product.nmID} (размер ${size.techSize}) создана. Meta:`, msVariantMeta);

            // Обновляем ms_href для этого размера в нашей БД
            const sizeIndex = product.sizes.findIndex(s => s.chrtID === size.chrtID);
            if (sizeIndex !== -1) {
                // Используем findOneAndUpdate для атомарного обновления вложенного элемента массива
                await Product.updateOne(
                    { _id: product._id, user: userId, [`sizes.${sizeIndex}.chrtID`]: size.chrtID }, // Фильтр для поиска конкретного элемента
                    { $set: { [`sizes.${sizeIndex}.ms_href`]: msVariantMeta.href } } // Обновление ms_href
                );
                console.log(`[MOYSK_VAR_SERVICE SUCCESS] ms_href для размера ${size.techSize} обновлен в БД: ${msVariantMeta.href}`);
                resultItem.ms_href = msVariantMeta.href;
            } else {
                console.warn(`[MOYSK_VAR_SERVICE WARNING] Индекс размера ${size.chrtID} не найден после создания модификации. ms_href не обновлен в БД.`);
            }

            resultItem.status = 'success';
            resultItem.message = `Модификация для размера "${size.techSize}" успешно создана/обновлена.`;
            resultItem.ms_href = msVariantMeta.href;

        } catch (variantError) {
            console.error(`[MOYSK_VAR_SERVICE ERROR] Ошибка создания модификации для товара ${product.nmID}, размер ${size.techSize}: ${variantError.message}`);
            if (variantError.response) {
                console.error(`[MOYSK_VAR_SERVICE ERROR] Ответ МойСклад API:`, variantError.response.data);
                if (variantError.response.data.errors && variantError.response.data.errors.length > 0) {
                    resultItem.message = `Ошибка МойСклад: ${variantError.response.data.errors[0].error}`;
                } else {
                    resultItem.message = `Ошибка API МойСклад: ${variantError.response.status}`;
                }
            } else {
                resultItem.message = `Ошибка сети/сервера: ${variantError.message}`;
            }
            resultItem.status = 'error';
        }
        variantCreationResults.push(resultItem);
    }
    console.log(`[MOYSK_VAR_SERVICE] Завершено создание модификаций для товара ${product.nmID}.`);
    return variantCreationResults;
}

/**
 * Создает модификации в МойСклад (массово или индивидуально).
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @param {string} [productId] - ID одного товара для индивидуальной операции.
 * @param {Array<string>} [productIds] - Массив ID товаров для массовой операции.
 * @param {boolean} [selectedAllPages] - Флаг, указывающий на обработку всех товаров связки.
 * @returns {Promise<Object>} - Результаты операции.
 * @throws {Error} - Если связка не найдена, нет токена МС, или ошибка при обработке товаров.
 */
async function createVariantsInMoySklad(integrationLinkId, userId, productId, productIds, selectedAllPages) {
    console.log(`[MOYSK_VAR_SERVICE] Получен запрос на создание модификаций в МС.`);
    console.log(`[MOYSK_VAR_SERVICE] productId: ${productId || 'N/A'}, productIds: ${productIds ? productIds.length : 'N/A'}, selectedAllPages: ${selectedAllPages}`);

    try {
        const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
            .populate('storage', 'token');

        if (!integrationLink) {
            console.error(`[MOYSK_VAR_SERVICE ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
            throw new Error('Интеграционная связка не найдена или не принадлежит вам.');
        }
        const MOYSKLAD_API_TOKEN = integrationLink.storage.token;
        if (!MOYSKLAD_API_TOKEN) {
            console.error(`[MOYSK_VAR_SERVICE ERROR] Склад "${integrationLink.storage.name}" не имеет токена МойСклад API.`);
            throw new Error('Склад в интеграционной связке не имеет токена МойСклад API.');
        }
        console.log(`[MOYSK_VAR_SERVICE] Токен МойСклад API получен.`);

        let productsToLoadIds = [];
        if (productId) { productsToLoadIds.push(productId); }
        else if (productIds && productIds.length > 0) { productsToLoadIds = productIds; }
        else if (selectedAllPages) {
            const allProductsForIntegration = await Product.find({ integrationLink: integrationLinkId, user: userId }).select('_id');
            productsToLoadIds = allProductsForIntegration.map(p => p._id);
            console.log(`[MOYSK_VAR_SERVICE] Для массовой операции выбрано ${productsToLoadIds.length} товаров по флагу selectedAllPages.`);
        } else {
            console.error(`[MOYSK_VAR_SERVICE ERROR] Не выбраны товары для создания модификаций.`);
            throw new Error('Не выбраны товары для создания модификаций.');
        }

        if (productsToLoadIds.length === 0) {
            console.log(`[MOYSK_VAR_SERVICE] Нет товаров для обработки после фильтрации.`);
            return { message: 'Нет товаров для обработки.', results: [] };
        }

        const productsFromDb = await Product.find({ _id: { $in: productsToLoadIds }, integrationLink: integrationLinkId, user: userId });
        console.log(`[MOYSK_VAR_SERVICE] Загружено ${productsFromDb.length} полных объектов товаров из БД для создания модификаций.`);

        const overallOperationResults = []; // Общий массив результатов для всех продуктов
        for (const product of productsFromDb) {
            try {
                // Проверка: ms_href_general должен быть заполнен, иначе модификации создавать нельзя
                if (!product.ms_href_general) {
                    console.warn(`[MOYSK_VAR_SERVICE WARNING] Товар ${product.nmID} (${product.title}) не имеет ms_href_general. Пропускаем создание модификаций.`);
                    overallOperationResults.push({
                        productId: product._id,
                        nmID: product.nmID,
                        title: product.title,
                        status: 'skipped',
                        message: 'Пропущено: основной товар не создан в МойСклад (нет ms_href_general).',
                        variants: []
                    });
                    continue; // Пропускаем этот товар
                }
                if (!product.sizes || product.sizes.length <= 1) {
                    console.warn(`[MOYSK_VAR_SERVICE WARNING] Товар ${product.nmID} (${product.title}) имеет менее двух размеров. Пропускаем создание модификаций.`);
                    overallOperationResults.push({
                        productId: product._id,
                        nmID: product.nmID,
                        title: product.title,
                        status: 'skipped',
                        message: `Пропущено: товар имеет ${product.sizes ? product.sizes.length : 0} размеров (требуется >1).`,
                        variants: []
                    });
                    continue; // Пропускаем этот товар
                }

                console.log(`[MOYSK_VAR_SERVICE] Запускаем создание модификаций для товара ${product.nmID} (${product.title}).`);
                // Вызываем внутреннюю функцию для создания модификаций для ОДНОГО товара
                const productVariantsResults = await createVariantsForProductInMoySklad(
                    product, MOYSKLAD_API_TOKEN, userId
                );
                overallOperationResults.push({
                    productId: product._id,
                    nmID: product.nmID,
                    title: product.title,
                    // Определяем общий статус: если есть хоть одна ошибка - partial_error, если все пропущены - skipped, иначе success
                    status: productVariantsResults.some(r => r.status === 'error') ? 'partial_error' : (productVariantsResults.every(r => r.status === 'skipped') ? 'skipped' : 'success'),
                    message: `Обработано ${productVariantsResults.length} модификаций.`,
                    variants: productVariantsResults // Детали по каждой модификации
                });
            } catch (productError) {
                console.error(`[MOYSK_VAR_SERVICE ERROR] Ошибка обработки модификаций для товара ${product.nmID}: ${productError.message}`);
                overallOperationResults.push({
                    productId: product._id,
                    nmID: product.nmID,
                    title: product.title,
                    status: 'error',
                    message: productError.message,
                    variants: []
                });
            }
        }

        return {
            message: 'Операция создания модификаций завершена.',
            results: overallOperationResults,
        };

    } catch (error) {
        console.error(`[MOYSK_VAR_SERVICE ERROR] Общая ошибка при создании модификаций: ${error.message}`);
        throw error; // Перебрасываем ошибку для обработки в контроллере
    }
}

module.exports = {
    createVariantsInMoySklad,
};
