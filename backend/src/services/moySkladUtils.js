// backend/src/services/moySkladUtils.js
const axios = require('axios');
const { MOYSKLAD_PRODUCT_API_URL } = require('../config/constants'); // Предполагается, что MOYSKLAD_PRODUCT_API_URL здесь определен

/**
 * Подготавливает данные товара или комплекта для отправки в МойСклад.
 * @param {Object} product - Объект товара из вашей БД.
 * @param {number|null} sizeChrtID - chrtID конкретного размера (если применимо).
 * @param {Object} options - Дополнительные опции. Пример: { isBundle: true }
 * @returns {Object}
 */
function prepareProductDataForMoySklad(product, sizeChrtID = null, options = {}) {
    const isBundle = options.isBundle || false;

    if (isBundle) {
        // Подготовка комплекта
        console.log(`[MOYSK_UTILS] Подготовка комплекта "${product.title}" (nmID: ${product.nmID})`);

        if (!Array.isArray(product.bundleComponents) || product.bundleComponents.length === 0) {
            // Если это комплект, но у него нет компонентов, это ошибка.
            // В случае создания нового комплекта с "пустым" компонентом, эта логика не используется напрямую.
            throw new Error(`Комплект "${product.title}" не содержит компонентов.`);
        }

        const components = product.bundleComponents.map((comp, idx) => {
            if (!comp.href) {
                throw new Error(`Компонент [${idx}] комплекта "${product.title}" не содержит meta.href`);
            }
            return {
                quantity: comp.quantity || 1,
                assortment: {
                    meta: {
                        href: comp.href,
                        type: 'product', // Или 'bundle' если компонент тоже комплект
                        mediaType: 'application/json'
                    }
                }
            };
        });

        const moySkladItem = {
            name: product.title,
            externalCode: product.nmID?.toString() || '',
            article: product.vendorCode || '',
            components
        };

        if (product.ms_href_general) {
            moySkladItem.meta = {
                href: product.ms_href_general,
                type: 'bundle'
            };
        }

        return {
            moySkladItem,
            productOriginalId: product._id,
            updatePathInProduct: 'ms_href_general',
            isAlreadyCreated: !!product.ms_href_general
        };
    }

    // Обычная логика товара (или модификации)
    let skusValue = null;
    let targetSize = null;
    let msHrefCurrent = null;
    let updatePathInProduct = null;

    console.log(`[MOYSK_UTILS] Начало подготовки товара: nmID=${product.nmID}, title="${product.title}", chrtID для поиска: ${sizeChrtID}`);

    if (!product.sizes || product.sizes.length === 0) {
        console.warn(`[MOYSK_UTILS] Товар ${product.nmID} не имеет размеров. Будет создан общий товар.`);
        if (product.ms_href_general) {
            msHrefCurrent = product.ms_href_general;
        }
        updatePathInProduct = 'ms_href_general';
    } else if (sizeChrtID !== undefined && sizeChrtID !== null) {
        targetSize = product.sizes.find(s => s.chrtID === sizeChrtID);
        if (!targetSize) {
            throw new Error(`Размер chrtID=${sizeChrtID} не найден для товара ${product.nmID}.`);
        }
        if (targetSize.ms_href) {
            msHrefCurrent = targetSize.ms_href;
        }
        skusValue = targetSize.skus?.[0] || null; // Предполагаем, что skus - это массив, и берем первый
        updatePathInProduct = `sizes.${product.sizes.findIndex(s => s.chrtID === sizeChrtID)}.ms_href`;
    } else {
        // Если размеров несколько, но chrtID не указан, ищем общий ms_href_general
        if (product.sizes.length === 1) {
            targetSize = product.sizes[0];
            if (targetSize.ms_href) {
                msHrefCurrent = targetSize.ms_href;
            }
            skusValue = targetSize.skus?.[0] || null;
            updatePathInProduct = `sizes.0.ms_href`;
        } else {
            // Если размеров много и chrtID не указан, работаем с общим товаром
            if (product.ms_href_general) {
                msHrefCurrent = product.ms_href_general;
            }
            updatePathInProduct = 'ms_href_general';
        }
    }

    const moySkladItem = {
        name: product.title,
        externalCode: product.nmID.toString(),
        article: product.vendorCode,
    };

    if (skusValue) {
        moySkladItem.code = skusValue; // Код модификации
    }

    if (msHrefCurrent) {
        moySkladItem.meta = {
            href: msHrefCurrent,
            type: 'product', // Или 'variant' если это модификация
        };
    }

    return {
        moySkladItem,
        targetSize,
        skusValue,
        productOriginalId: product._id,
        updatePathInProduct,
        isAlreadyCreated: !!msHrefCurrent
    };
}

/**
 * Выполняет массовый запрос к МойСклад API и обрабатывает ответы, обновляя БД.
 * @param {Array<Object>} moySkladRequests - Массив запросов для отправки в МойСклад.
 * @param {string} MOYSKLAD_API_TOKEN - Токен API МойСклад.
 * @param {Map<string, Object>} productsMapByExternalCode - Карта для сопоставления запросов с оригинальными данными продукта.
 * @param {string} userId - ID пользователя.
 * @returns {Promise<Object>} - Результаты операции.
 */
async function executeMoySkladProductOperation(moySkladRequests, MOYSKLAD_API_TOKEN, productsMapByExternalCode, userId) {
    let msResponseData;
    const operationResults = [];

    console.log(`[MOYSK_UTILS] Начинаем выполнение массового запроса к МойСклад. Количество элементов: ${moySkladRequests.length}`);

    try {
        const msResponse = await axios.post(MOYSKLAD_PRODUCT_API_URL, moySkladRequests, {
            headers: {
                'Authorization': `Bearer ${MOYSKLAD_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            timeout: 120000 // 2 минуты таймаут
        });
        msResponseData = msResponse.data;
        console.log(`[MOYSK_UTILS SUCCESS] Массовая операция завершена. Получено ${msResponseData.length} ответов.`);
    } catch (error) {
        console.error(`[MOYSK_UTILS ERROR] Ошибка при запросе к МойСклад API: ${error.message}`);
        if (error.response) {
            console.error(`[MOYSK_UTILS ERROR] Статус: ${error.response.status}, Данные:`, error.response.data);
        }
        throw error;
    }

    const bulkUpdateOperations = [];

    for (let i = 0; i < msResponseData.length; i++) {
        const msItemResult = msResponseData[i];
        const originalProductData = productsMapByExternalCode.get(moySkladRequests[i].externalCode);

        if (!originalProductData) {
            console.error(`[MOYSK_UTILS ERROR] Оригинальный продукт с externalCode=${moySkladRequests[i].externalCode} не найден в Map.`);
            continue;
        }

        const { product, targetSize, preparedData } = originalProductData;

        const resultForFrontend = {
            productId: product._id,
            nmID: product.nmID,
            title: product.title,
            status: 'error',
            message: '',
            ms_href: null,
            sizeTechSize: targetSize ? targetSize.techSize : 'Общий' // Для комплектов targetSize будет null
        };

        if (msItemResult.meta?.href) {
            const msHref = msItemResult.meta.href;
            const updatePath = preparedData.updatePathInProduct;

            if (updatePath) {
                bulkUpdateOperations.push({
                    updateOne: {
                        filter: { _id: product._id, user: userId },
                        update: { $set: { [updatePath]: msHref } }
                    }
                });
                resultForFrontend.status = 'success';
                resultForFrontend.message = `Создан/обновлен в МС.`;
                resultForFrontend.ms_href = msHref;
            } else {
                resultForFrontend.status = 'info';
                resultForFrontend.message = `Создан/обновлен в МС, но ms_href не сохранён (нет пути обновления).`;
                resultForFrontend.ms_href = msHref;
            }
        } else {
            const errorMessage = msItemResult.errors?.[0]?.error || 'Неизвестная ошибка в МС.';
            resultForFrontend.status = 'error';
            resultForFrontend.message = `Ошибка МС: ${errorMessage}`;
        }

        operationResults.push(resultForFrontend);
    }

    // Здесь Product должен быть импортирован в файле, который вызывает executeMoySkladProductOperation
    // или передан как параметр. Поскольку Product используется для bulkWrite,
    // лучше, чтобы эта функция принимала Product как аргумент, или Product был доступен в контексте.
    // Для простоты, оставим импорт Product в файле, который вызывает эту функцию.
    // Если Product - это модель Mongoose, то он должен быть доступен в сервисе.
    // Для этого примера, я предполагаю, что Product будет импортирован в moySkladService.js
    // и передан сюда, если это необходимо, или эта функция будет вызвана из контекста, где Product доступен.
    // Но по текущей структуре, Product используется внутри этой функции для bulkWrite.
    // Поэтому, Product должен быть импортирован здесь.
    const Product = require('../models/Product'); // Добавляем импорт Product здесь

    if (bulkUpdateOperations.length > 0) {
        try {
            const bulkResult = await Product.bulkWrite(bulkUpdateOperations);
            console.log(`[MOYSK_UTILS] Обновление БД завершено. Изменено: ${bulkResult.modifiedCount}`);
        } catch (dbError) {
            console.error(`[MOYSK_UTILS ERROR] Ошибка bulkWrite: ${dbError.message}`);
            // Не перебрасываем ошибку, чтобы не прерывать общий процесс, но логируем.
        }
    }

    return { results: operationResults };
}

const MS_PRODUCT_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/product';
const EMPTY_COMPONENT_NAME = 'Пустой для комплектов';

/**
 * Получает или создаёт товар "Пустой для комплектов" в МойСклад.
 * @param {string} token - Токен API МойСклад.
 * @returns {Promise<string>} - href пустого компонента.
 * @throws {Error} - Если не удалось получить или создать товар.
 */
async function getOrCreateEmptyComponentHref(token) {
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json;charset=utf-8',
        'Content-Type': 'application/json',
    };

    try {
        // Поиск существующего "Пустого для комплектов"
        const searchRes = await axios.get(
            `${MS_PRODUCT_URL}?filter=name~${encodeURIComponent(EMPTY_COMPONENT_NAME)}`,
            { headers }
        );
        const found = searchRes.data?.rows?.[0];

        if (found?.meta?.href) {
            console.log(`[MOYSK_UTILS] Найден товар "${EMPTY_COMPONENT_NAME}": ${found.meta.href}`);
            return found.meta.href;
        }

        // Если не найден, создаем его
        const createRes = await axios.post(
            MS_PRODUCT_URL,
            { name: EMPTY_COMPONENT_NAME },
            { headers }
        );

        const createdHref = createRes.data.meta.href;
        console.log(`[MOYSK_UTILS] Создан товар "${EMPTY_COMPONENT_NAME}": ${createdHref}`);
        return createdHref;

    } catch (err) {
        console.error(`[MOYSK_UTILS ERROR] Ошибка при поиске/создании "${EMPTY_COMPONENT_NAME}"`, err?.response?.data || err.message);
        throw new Error(`Не удалось получить или создать товар "${EMPTY_COMPONENT_NAME}"`);
    }
}

module.exports = {
    prepareProductDataForMoySklad,
    executeMoySkladProductOperation,
    getOrCreateEmptyComponentHref,
};
