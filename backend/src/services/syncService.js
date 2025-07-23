// backend/src/services/syncService.js
const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const { fetchAllProductsFromWb } = require('./wbService');

/**
 * Синхронизирует товары с Wildberries Content API в вашу базу данных.
 * Если товар уже существует в БД (по совпадению SKU), он пропускается. В противном случае - создается.
 * Также инициализирует поле 'complect' для старых товаров, если оно отсутствует.
 * @param {string} integrationLinkId - ID интеграционной связки.
 * @param {string} userId - ID пользователя.
 * @returns {Promise<Object>} - Результаты синхронизации.
 * @throws {Error} - Если связка не найдена, нет токена WB, или ошибка при загрузке/сохранении.
 */
async function syncProducts(integrationLinkId, userId) {
    console.log(`[SYNC_SERVICE] Получен запрос на синхронизацию для integrationLink ID: ${integrationLinkId} пользователем ${userId}`);

    if (!integrationLinkId) {
        console.error(`[SYNC_SERVICE ERROR] Отсутствует integrationLinkId.`);
        throw new Error('Необходимо указать ID интеграционной связки для синхронизации.');
    }

    try {
        const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
            .populate('wbCabinet', 'token')
            .populate('storage', 'name');

        if (!integrationLink) {
            console.error(`[SYNC_SERVICE ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
            throw new Error('Интеграционная связка не найдена или не принадлежит вам для синхронизации.');
        }

        const wbApiToken = integrationLink.wbCabinet.token;
        const cabinetName = integrationLink.wbCabinet.name;
        const storageName = integrationLink.storage.name;

        if (!wbApiToken) {
            console.error(`[SYNC_SERVICE ERROR] WB Кабинет "${cabinetName}" в связке ${integrationLinkId} не имеет токена API.`);
            throw new Error('WB Кабинет в связке не имеет токена API для синхронизации.');
        }

        // --- ДОБАВЛЕННАЯ ЛОГИКА ДЛЯ ИНИЦИАЛИЗАЦИИ complect У СТАРЫХ ТОВАРОВ ---
        console.log(`[SYNC_SERVICE] Проверяем и инициализируем поле 'complect' для существующих товаров...`);
        const complectMigrationResult = await Product.updateMany(
            {
                integrationLink: integrationLinkId,
                user: userId,
                complect: { $exists: false } // Найти товары, у которых нет поля complect
            },
            {
                $set: { complect: false } // Установить его в false
            }
        );
        if (complectMigrationResult.modifiedCount > 0) {
            console.log(`[SYNC_SERVICE] Инициализировано 'complect: false' для ${complectMigrationResult.modifiedCount} старых товаров.`);
        } else {
            console.log(`[SYNC_SERVICE] Все существующие товары уже имеют поле 'complect'.`);
        }
        // --- КОНЕЦ ЛОГИКИ ИНИЦИАЛИЗАЦИИ ---


        console.log(`[SYNC_SERVICE] Начинаем загрузку товаров для кабинета "${cabinetName}" и склада "${storageName}".`);
        const wbProducts = await fetchAllProductsFromWb(wbApiToken);
        console.log(`[SYNC_SERVICE] Получено ${wbProducts.length} товаров из WB для обработки.`);

        let insertedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const productData of wbProducts) {
            try {
                const wbSkus = productData.sizes.flatMap(size => size.skus || []);
                if (wbSkus.length === 0) {
                    console.log(`[SYNC_SERVICE] Товар nmID ${productData.nmID} пропущен: нет SKU для проверки.`);
                    skippedCount++;
                    continue;
                }

                const existingProduct = await Product.findOne({
                    integrationLink: integrationLinkId,
                    user: userId,
                    'sizes.skus': { $in: wbSkus }
                });

                if (existingProduct) {
                    console.log(`[SYNC_SERVICE] Товар nmID ${productData.nmID} (SKUs: ${wbSkus.join(', ')}) уже существует в БД. Пропускаем.`);
                    skippedCount++;
                    continue;
                }

                console.log(`[SYNC_SERVICE] Товар nmID ${productData.nmID} не найден по SKU. Создаем новый.`);

                const newProduct = new Product({
                    nmID: productData.nmID,
                    imtID: productData.imtID,
                    nmUUID: productData.nmUUID,
                    subjectID: productData.subjectID,
                    subjectName: productData.DsubjectName,
                    vendorCode: productData.vendorCode,
                    brand: productData.brand,
                    title: productData.title,
                    description: productData.description,
                    needKiz: productData.needKiz,
                    video: productData.video,
                    dimensions: productData.dimensions,
                    characteristics: productData.characteristics,
                    sizes: productData.sizes,
                    tags: productData.tags,
                    createdAt: productData.createdAt ? new Date(productData.createdAt) : undefined,
                    updatedAt: productData.updatedAt ? new Date(productData.updatedAt) : undefined,
                    integrationLink: integrationLinkId,
                    user: userId,
                    wbCabinet: integrationLink.wbCabinet._id,
                    storage: integrationLink.storage._id,
                    complect: false, // Явно устанавливаем false для новых товаров
                });

                await newProduct.save();
                insertedCount++;
                console.log(`[SYNC_SERVICE] Товар nmID ${productData.nmID} успешно создан.`);

            } catch (productError) {
                if (productError.code === 11000) {
                    console.warn(`[SYNC_SERVICE WARN] Попытка создания дубликата товара nmID ${productData.nmID} (уникальный ключ). Возможно, товар уже добавлен другим способом.`);
                    skippedCount++;
                } else {
                    console.error(`[SYNC_SERVICE ERROR] Ошибка при обработке товара nmID ${productData.nmID}: ${productError.message}`);
                    errorCount++;
                }
            }
        }

        console.log(`[SYNC_SERVICE] Синхронизация завершена: Создано: ${insertedCount}, Пропущено (существующие или без SKU): ${skippedCount}, Ошибок: ${errorCount}. Всего товаров WB: ${wbProducts.length}`);

        return {
            message: `Синхронизация завершена. Создано ${insertedCount} товаров, пропущено ${skippedCount}, ошибок ${errorCount}.`,
            insertedCount: insertedCount,
            skippedCount: skippedCount,
            errorCount: errorCount,
            totalWbProducts: wbProducts.length
        };

    } catch (error) {
        console.error(`[SYNC_SERVICE ERROR] Общая ошибка синхронизации товаров: ${error.message}.`);
        throw error;
    }
}

module.exports = {
    syncProducts,
};
