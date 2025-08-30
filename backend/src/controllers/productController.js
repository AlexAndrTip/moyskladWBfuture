// backend/src/controllers/productController.js

const { syncProducts } = require('../services/syncService');
// ИСПРАВЛЕННЫЙ ИМПОРТ: Объединяем все необходимые функции из productDbService в одну строку
const {
    getProductsFromDb,
    getAllProductsFromDb,
    unlinkMoySkladLinks,
    bulkUnlinkMoySkladLinks,
    updateProductComplect,
    linkMoySkladProduct // <-- ДОБАВЛЕНО: Новая функция для связывания
} = require('../services/productDbService');
const { createProductInMoySklad } = require('../services/moySkladProductService');
const { createVariantsInMoySklad } = require('../services/moySkladVariantService');
const { getProductsFromMoySklad } = require('../services/moySkladProductSearchService'); // Получение товаров из МС
const { getVariantsFromMoySklad } = require('../services/moySkladVariantSearchService');  // Получение модификаций из МС
const { getBundlesFromMoySklad } = require('../services/moySkladBundleSearchService');  // Получение комплектов из МС
// const { createProductBundlesInMoySklad } = require('../services/moySkladBundleService'); // Убедись, что этот импорт находится здесь или выше, если он используется ниже

// @desc      Получить товары всех интеграций пользователя
// @route     GET /api/products/all
// @access    Private
exports.getAllProducts = async (req, res) => {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const searchTerm = req.query.searchTerm;

    try {
        // Получаем товары всех интеграций из БД через сервис
        const msFilter = req.query.msFilter;

        let result = await getAllProductsFromDb(
          userId, page, limit, searchTerm, msFilter
        );

        const { products, currentPage, totalPages, totalProducts } = result;

        res.json({
            success: true,
            products,
            currentPage,
            totalPages,
            totalProducts,
        });
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Общая ошибка при получении товаров всех интеграций: ${error.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Ошибка сервера при получении товаров.' 
        });
    }
};

// @desc      Получить товары для конкретной интеграции
// @route     GET /api/products/:integrationLinkId
// @access    Private
exports.getProductsByIntegration = async (req, res) => {
    const { integrationLinkId } = req.params;
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const searchTerm = req.query.searchTerm;

    try {
        // Получаем товары из БД через сервис
        const msFilter = req.query.msFilter;

        let result = await getProductsFromDb(
          integrationLinkId, userId, page, limit, searchTerm, msFilter
        );

        // Если товаров нет, пробуем выполнить синхронизацию с WB и повторить запрос
        if (result.totalProducts === 0) {
            console.log(`[CONTROLLER] Для связки ${integrationLinkId} в базе не найдено товаров. Запускаем автоматическую синхронизацию c WB...`);
            try {
                await syncProducts(integrationLinkId, userId);
                // Повторяем запрос к БД после синхронизации
                result = await getProductsFromDb(
                  integrationLinkId, userId, page, limit, searchTerm, msFilter
                );
            } catch(syncErr) {
                console.error(`[CONTROLLER ERROR] Ошибка автоматической синхронизации: ${syncErr.message}`);
                // Не прерываем работу, просто логируем
            }
        }

        const { products, currentPage, totalPages, totalProducts } = result;

        res.json({
            success: true,
            products,
            currentPage,
            totalPages,
            totalProducts,
        });
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Общая ошибка при получении товаров для связки ${integrationLinkId}: ${error.message}`);
        res.status(500).json({ 
            success: false,
            message: 'Ошибка сервера при получении товаров.' 
        });
    }
};

// @desc      Создать/обновить товары в МойСклад (массово или индивидуально)
// @route     POST /api/products/create-in-ms
// @access    Private
exports.createProductInMoySklad = async (req, res) => {
    const { productId, sizeChrtID, productIds, selectedAllPages, integrationLinkId } = req.body;
    const userId = req.user._id;

    try {
        const result = await createProductInMoySklad(
            integrationLinkId, userId, productId, sizeChrtID, productIds, selectedAllPages
        );

        // Возвращаем результаты в соответствии с типом запроса
        if (productId) { // Если это был индивидуальный запрос
            return res.status(200).json(result);
        } else { // Для массовых запросов
            return res.status(200).json(result);
        }
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Общая ошибка при создании товаров в МойСклад: ${error.message}`);
        // Более детальная обработка ошибок, если нужно
        if (error.message.includes('Интеграционная связка не найдена')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Склад в интеграционной связке не имеет токена')) {
            return res.status(400).json({ message: error.message });
        }
        // Здесь можно добавить обработку ошибок от МойСклад API, если они перебрасываются из сервиса
        res.status(500).json({ message: `Ошибка сервера при создании товара в МойСклад: ${error.message}` });
    }
};

// @desc      Создать модификации в МойСклад (массово или индивидуально)
// @route     POST /api/products/create-variants-in-ms
// @access    Private
exports.createVariantsInMoySklad = async (req, res) => {
    const { productId, productIds, selectedAllPages, integrationLinkId } = req.body;
    const userId = req.user._id;

    try {
        const result = await createVariantsInMoySklad(
            integrationLinkId, userId, productId, productIds, selectedAllPages
        );
        res.status(200).json(result);
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Общая ошибка при создании модификаций: ${error.message}`);
        // Более детальная обработка ошибок
        if (error.message.includes('Интеграционная связка не найдена')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Склад в интеграционной связке не имеет токена')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: `Ошибка сервера при создании модификаций: ${error.message}` });
    }
};

// @desc      Запустить принудительную синхронизацию товаров с WB
// @route     POST /api/products/sync-now
// @access    Private (нужна авторизация пользователя)
exports.syncProductsOnDemand = async (req, res) => {
    const { integrationLinkId } = req.body;
    const userId = req.user._id;

    console.log(`[CONTROLLER] Получен запрос на принудительную синхронизацию для integrationLink ID: ${integrationLinkId} от пользователя ${userId}`);

    if (!integrationLinkId) {
        return res.status(400).json({ message: 'Необходимо указать ID интеграционной связки для синхронизации.' });
    }

    try {
        // Вызываем сервис синхронизации
        const syncResult = await syncProducts(integrationLinkId, userId);

        res.status(200).json({
            message: 'Синхронизация запущена успешно.',
            details: syncResult
        });
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при принудительной синхронизации: ${error.message}`);
        if (error.message.includes('Интеграционная связка не найдена')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('WB Кабинет в связке не имеет токена')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('Ошибка WB API')) {
            return res.status(502).json({ message: `Ошибка при подключении к Wildberries: ${error.message}` });
        }
        res.status(500).json({ message: `Ошибка сервера при синхронизации: ${error.message}` });
    }
};

// --- КОНТРОЛЛЕР ДЛЯ УДАЛЕНИЯ ИНДИВИДУАЛЬНОЙ СВЯЗКИ ---
exports.unlinkProduct = async (req, res) => {
    const { productId, integrationLinkId } = req.body;
    const userId = req.user._id;

    try {
        const result = await unlinkMoySkladLinks(integrationLinkId, userId, [productId]); // Передаем productId как массив
        if (result.results && result.results.length > 0 && result.results[0].status === 'success') {
            return res.status(200).json({ message: `Связка для товара успешно удалена.`, details: result.results[0].details });
        } else {
            // Если статус не успех или результатов нет, возвращаем ошибку
            const errorMessage = result.results && result.results.length > 0 ? result.results[0].message : 'Не удалось удалить связку.';
            return res.status(400).json({ message: errorMessage });
        }
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при удалении связки для товара ${productId}: ${error.message}`);
        res.status(500).json({ message: `Ошибка сервера при удалении связки: ${error.message}` });
    }
};

// --- КОНТРОЛЛЕР ДЛЯ МАССОВОГО УДАЛЕНИЯ СВЯЗОК ---
exports.bulkUnlinkProducts = async (req, res) => {
    const { productIds, selectedAllPages, integrationLinkId } = req.body;
    const userId = req.user._id;

    try {
        const result = await bulkUnlinkMoySkladLinks(integrationLinkId, userId, productIds, selectedAllPages);
        res.status(200).json(result);
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при массовом удалении связок: ${error.message}`);
        res.status(500).json({ message: `Ошибка сервера при массовом удалении связок: ${error.message}` });
    }
};


// --- ОБНОВЛЕНО: Контроллер для обновления поля COMPLECT ---
exports.setComplectStatus = async (req, res) => {
    const { productId, complect, integrationLinkId } = req.body;
    const userId = req.user._id;

    // ОБНОВЛЕНО: Валидация complect (теперь boolean)
    if (!productId || typeof complect !== 'boolean') {
        return res.status(400).json({ message: 'Неверные данные: productId обязателен, complect должен быть true или false.' });
    }

    try {
        const result = await updateProductComplect(integrationLinkId, userId, productId, complect);
        res.status(200).json({ message: result.message });
    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка в setComplectStatus для товара ${productId}: ${error.message}`);
        res.status(500).json({ message: error.message || 'Ошибка сервера при обновлении статуса комплекта.' });
    }
};

// --- ОБНОВЛЕНО: Контроллер для создания COMPLECT  в МС---
const { createProductBundlesInMoySklad } = require('../services/moySkladBundleService');

exports.createProductBundlesInMoySklad = async (req, res) => {
  try {
    const { integrationLinkId, productId, productIds, selectedAllPages } = req.body;
    const userId = req.user.id;

    const result = await createProductBundlesInMoySklad(
      integrationLinkId,
      userId,
      productId,
      productIds,
      selectedAllPages
    );

    res.json(result);
  } catch (error) {
    console.error('[Controller Error] createProductBundlesInMoySklad:', error);
    res.status(500).json({ message: error.message || 'Ошибка при создании комплекта в МойСклад.' });
  }
};


// @desc     Получить список товаров из МойСклад
// @route    GET /api/products/moysklad-products
// @access   Private
exports.getMoySkladProducts = async (req, res) => {
    const { integrationLinkId } = req.query; // integrationLinkId теперь в query params
    const userId = req.user._id;

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const searchTerm = req.query.searchTerm || '';

    // Валидация limit
    if (limit < 1 || limit > 1000) {
        return res.status(400).json({ message: 'Параметр limit должен быть от 1 до 1000.' });
    }
    // Валидация offset
    if (offset < 0) {
        return res.status(400).json({ message: 'Параметр offset не может быть отрицательным.' });
    }

    try {
        const moySkladResponse = await getProductsFromMoySklad(integrationLinkId, userId, limit, offset, searchTerm);

        // Возвращаем данные МойСклад напрямую
        res.status(200).json({
            products: moySkladResponse.rows,
            total: moySkladResponse.meta.size, // Общее количество товаров в МС по запросу
        });

    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при получении товаров из МойСклад: ${error.message}`);
        if (error.message.includes('Интеграционная связка не найдена')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Склад в интеграционной связке не имеет токена')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: `Ошибка сервера при получении товаров МойСклад: ${error.message}` });
    }
};


// @desc     Получить список модификаций из МойСклад
// @route    GET /api/products/moysklad-variants
// @access   Private
exports.getMoySkladVariants = async (req, res) => {
    const { integrationLinkId } = req.query;
    const userId = req.user._id;

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const searchTerm = req.query.searchTerm || '';

    if (limit < 1 || limit > 1000) {
        return res.status(400).json({ message: 'Параметр limit должен быть от 1 до 1000.' });
    }
    if (offset < 0) {
        return res.status(400).json({ message: 'Параметр offset не может быть отрицательным.' });
    }
    if (!integrationLinkId) {
        return res.status(400).json({ message: 'Необходимо указать ID интеграционной связки для получения модификаций МойСклад.' });
    }

    try {
        const moySkladResponse = await getVariantsFromMoySklad(integrationLinkId, userId, limit, offset, searchTerm);

        res.status(200).json({
            variants: moySkladResponse.rows, // Используем variants вместо products
            total: moySkladResponse.meta.size,
        });

    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при получении модификаций из МойСклад: ${error.message}`);
        if (error.message.includes('Интеграционная связка не найдена')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Склад в интеграционной связке не имеет токена')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: `Ошибка сервера при получении модификаций МойСклад: ${error.message}` });
    }
};


// @desc     Получить список комплектов из МойСклад
// @route    GET /api/products/moysklad-bundles
// @access   Private
exports.getMoySkladBundles = async (req, res) => {
    const { integrationLinkId } = req.query;
    const userId = req.user._id;

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const searchTerm = req.query.searchTerm || '';

    if (limit < 1 || limit > 1000) {
        return res.status(400).json({ message: 'Параметр limit должен быть от 1 до 1000.' });
    }
    if (offset < 0) {
        return res.status(400).json({ message: 'Параметр offset не может быть отрицательным.' });
    }
    if (!integrationLinkId) {
        return res.status(400).json({ message: 'Необходимо указать ID интеграционной связки для получения комплектов МойСклад.' });
    }

    try {
        const moySkladResponse = await getBundlesFromMoySklad(integrationLinkId, userId, limit, offset, searchTerm);

        res.status(200).json({
            bundles: moySkladResponse.rows, // Используем bundles вместо products
            total: moySkladResponse.meta.size,
        });

    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при получении комплектов из МойСклад: ${error.message}`);
        if (error.message.includes('Интеграционная связка не найдена')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('Склад в интеграционной связке не имеет токена')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: `Ошибка сервера при получении комплектов МойСклад: ${error.message}` });
    }
};


// @desc      Привязать товар WB (или его размер) к товару/модификации МойСклад
// @route     POST /api/products/link-product
// @access    Private
exports.linkProduct = async (req, res) => {
    const { wbProductId, msProductHref, wbSizeChrtID, integrationLinkId } = req.body;
    const userId = req.user._id;

    if (!wbProductId || !msProductHref || !integrationLinkId) {
        return res.status(400).json({ message: 'Необходимо указать wbProductId, msProductHref и integrationLinkId.' });
    }

    try {
        // Вызываем сервис для связывания
        const updatedWbProduct = await linkMoySkladProduct(
            integrationLinkId,
            userId,
            wbProductId,
            msProductHref,
            wbSizeChrtID
        );

        // Формируем сообщение об успехе
        let message = `WB товар ID ${wbProductId} успешно связан с МойСклад.`;
        if (wbSizeChrtID) {
            message = `Размер chrtID ${wbSizeChrtID} WB товара ID ${wbProductId} успешно связан с МойСклад.`;
        }

        // Возвращаем обновленный WB товар и ms_href, который был связан
        res.status(200).json({
            message: message,
            updatedWbProduct: updatedWbProduct,
            ms_href_linked: msProductHref // Передаем href обратно для отображения во фронтенде
        });

    } catch (error) {
        console.error(`[CONTROLLER ERROR] Ошибка при связывании товара: ${error.message}`);
        if (error.message.includes('не найден')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('отсутствует токен')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: `Ошибка сервера при связывании товара: ${error.message}` });
    }
};
