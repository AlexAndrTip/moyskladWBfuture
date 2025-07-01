// backend/src/controllers/productController.js
const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const WbCabinet = require('../models/WbCabinet');
const Storage = require('../models/Storage');
const axios = require('axios');

const WB_CONTENT_API_URL = 'https://content-api.wildberries.ru/content/v2/get/cards/list';
const MOYSKLAD_PRODUCT_API_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/product';

// --- Вспомогательная функция для загрузки всех товаров с пагинацией (без изменений) ---
async function fetchAllProductsFromWb(token) {
  let allCards = [];
  let cursor = { limit: 100 };

  console.log(`[WB_SYNC] Начинаем загрузку товаров с WB Content API. Начальный лимит: ${cursor.limit}`);

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

      console.log(`[WB_SYNC] Запрос #${requestCounter}: Отправляем запрос к ${WB_CONTENT_API_URL} с курсором:`, cursor);

      const response = await axios.post(WB_CONTENT_API_URL, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const { cards, cursor: nextCursor, total } = response.data;

      console.log(`[WB_SYNC] Запрос #${requestCounter} завершен. Получено карточек: ${cards ? cards.length : 0}. Total в ответе WB (оставшиеся): ${total !== undefined ? total : 'N/A'}`);

      if (cards && cards.length > 0) {
        allCards = allCards.concat(cards);
      }

      if (
          (total !== undefined && total < cursor.limit) ||
          (cards && cards.length < cursor.limit) ||
          !nextCursor ||
          (nextCursor && (!nextCursor.updatedAt || nextCursor.nmID === undefined))
      ) {
        hasMore = false;
        console.log(`[WB_SYNC] Пагинация завершена. Условие остановки выполнено.`);
      } else {
        cursor = {
          updatedAt: nextCursor.updatedAt,
          nmID: nextCursor.nmID,
          limit: cursor.limit
        };
        console.log(`[WB_SYNC] Переходим к следующему курсору: updatedAt=${cursor.updatedAt}, nmID=${cursor.nmID}`);
      }
    }
    console.log(`[WB_SYNC] Загрузка с WB завершена. Всего загружено: ${allCards.length} карточек.`);
    return allCards;
  } catch (error) {
    console.error(`[WB_SYNC ERROR] Ошибка при загрузке товаров с WB Content API. Статус: ${error.response?.status || 'N/A'}, Сообщение: ${error.message}`);
    console.error(`[WB_SYNC ERROR] Ответ WB API:`, error.response?.data);
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

// --- exports.syncProducts (без изменений) ---
exports.syncProducts = async (req, res) => {
  const { integrationLinkId } = req.body;
  const userId = req.user._id;

  console.log(`[SYNC_HANDLER] Получен запрос на синхронизацию для integrationLink ID: ${integrationLinkId} пользователем ${userId}`);

  if (!integrationLinkId) {
    console.error(`[SYNC_HANDLER ERROR] Отсутствует integrationLinkId в запросе.`);
    throw new Error('Необходимо указать ID интеграционной связки для синхронизации.');
  }

  try {
    const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
      .populate('wbCabinet', 'token')
      .populate('storage', 'name');

    if (!integrationLink) {
      console.error(`[SYNC_HANDLER ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
      throw new Error('Интеграционная связка не найдена или не принадлежит вам для синхронизации.');
    }

    const wbApiToken = integrationLink.wbCabinet.token;
    const cabinetName = integrationLink.wbCabinet.name;
    const storageName = integrationLink.storage.name;

    if (!wbApiToken) {
      console.error(`[SYNC_HANDLER ERROR] WB Кабинет "${cabinetName}" в связке ${integrationLinkId} не имеет токена API.`);
      throw new Error('WB Кабинет в связке не имеет токена API для синхронизации.');
    }

    console.log(`[SYNC_HANDLER] Начинаем загрузку товаров для кабинета "${cabinetName}" и склада "${storageName}".`);
    const wbProducts = await fetchAllProductsFromWb(wbApiToken);
    console.log(`[SYNC_HANDLER] Получено ${wbProducts.length} товаров из WB для сохранения.`);

    const operations = wbProducts.map(productData => ({
      updateOne: {
        filter: {
          nmID: productData.nmID,
          integrationLink: integrationLinkId,
          user: userId,
        },
        update: {
          $set: {
            nmID: productData.nmID,
            imtID: productData.imtID,
            nmUUID: productData.nmUUID,
            subjectID: productData.subjectID,
            subjectName: productData.subjectName,
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
          },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
        console.log(`[SYNC_HANDLER] Выполняем массовую запись ${operations.length} операций (upsert) в MongoDB.`);
        const result = await Product.bulkWrite(operations);
        console.log(`[SYNC_HANDLER] Результаты bulkWrite: Вставлено: ${result.upsertedCount}, Изменено: ${result.modifiedCount}, Сопоставлено: ${result.matchedCount}`);
        return {
            message: `Синхронизация завершена. Загружено и обработано ${wbProducts.length} товаров.`,
            insertedCount: result.upsertedCount,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount,
            totalWbProducts: wbProducts.length
        };
    } else {
        console.log(`[SYNC_HANDLER] Нет товаров для сохранения. Загружено 0 карточек.`);
        return {
            message: `Синхронизация завершена. Нет новых товаров для обработки.`,
            insertedCount: 0,
            modifiedCount: 0,
            matchedCount: 0,
            totalWbProducts: 0
        };
    }

  } catch (error) {
    console.error(`[SYNC_HANDLER ERROR] Общая ошибка синхронизации товаров: ${error.message}.`);
    throw error;
  }
};


// --- exports.getProductsByIntegration (без изменений) ---
exports.getProductsByIntegration = async (req, res) => {
  const { integrationLinkId } = req.params;
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  console.log(`[GET_PRODUCTS] Получен запрос на товары для integrationLink ID: ${integrationLinkId}, страница: ${page}, лимит: ${limit}`);

  try {
    const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
      .populate('wbCabinet', 'token')
      .populate('storage', 'name');

    if (!integrationLink) {
      console.error(`[GET_PRODUCTS ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
      return res.status(404).json({ message: 'Интеграционная связка не найдена или не принадлежит вам.' });
    }

    // --- АВТОМАТИЧЕСКИЙ ЗАПУСК СИНХРОНИЗАЦИИ ---
    console.log(`[GET_PRODUCTS] Запускаем автоматическую синхронизацию для связки ${integrationLinkId} перед получением товаров.`);
    try {
        const syncResult = await exports.syncProducts({
            user: { _id: userId },
            body: { integrationLinkId: integrationLinkId }
        }, {});
        console.log(`[GET_PRODUCTS] Автоматическая синхронизация завершена: ${syncResult.message}`);
    } catch (syncError) {
        console.error(`[GET_PRODUCTS ERROR] Ошибка при автоматической синхронизации: ${syncError.message}`);
        return res.status(500).json({ message: `Ошибка при синхронизации товаров: ${syncError.message}` });
    }
    // --- КОНЕЦ АВТОМАТИЧЕСКОГО ЗАПУСКА СИНХРОНИЗАЦИИ ---


    const products = await Product.find({ integrationLink: integrationLinkId, user: userId })
      .skip(skip)
      .limit(limit)
      .select('nmID title brand vendorCode sizes'); // Убедитесь, что sizes.ms_href также выбирается, если он нужен на фронте

    const totalProducts = await Product.countDocuments({ integrationLink: integrationLinkId, user: userId });

    console.log(`[GET_PRODUCTS] Найдено ${products.length} товаров на странице ${page} из ${totalProducts} всего для связки ${integrationLinkId}.`);

    res.json({
      products,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
    });
  } catch (error) {
    console.error(`[GET_PRODUCTS ERROR] Общая ошибка при получении товаров для связки ${integrationLinkId}: ${error.message}`);
    res.status(500).json({ message: 'Ошибка сервера при получении товаров.' });
  }
};


// --- Вспомогательная функция: Подготовка данных товара для МойСклад ---
// Принимает объект товара из нашей БД и chrtID размера (опционально)
// Возвращает объект данных, готовый для отправки в МойСклад, или null/ошибку
function _prepareProductDataForMoySklad(product, sizeChrtID = null) {
  let skusValue = null;
  let targetSize = null; // Будет ссылаться на объект размера, если он есть
  let msHref = null; // Текущий ms_href, если товар уже создан

  // console.log(`[PREPARE_MS] Подготовка товара ${product.nmID}. sizeChrtID: ${sizeChrtID}.`);

  if (!product.sizes || product.sizes.length === 0) {
    skusValue = null; // Товар без SKU/Code
  } else if (sizeChrtID !== undefined && sizeChrtID !== null) {
    // Конкретный размер
    targetSize = product.sizes.find(s => s.chrtID === sizeChrtID);
    if (!targetSize) {
      throw new Error(`Указанный размер (chrtID: ${sizeChrtID}) не найден для товара ${product.nmID}.`);
    }
    if (targetSize.ms_href) {
      msHref = targetSize.ms_href;
    }
    skusValue = targetSize.skus && targetSize.skus.length > 0 ? targetSize.skus[0] : null;
  } else {
    // Если sizeChrtID не указан, но есть размеры:
    // По вашей логике, если у товара несколько размеров, но chrtID не указан, "code" не передается.
    // Если только один размер, и chrtID не указан, берем его.
    if (product.sizes.length === 1) {
      targetSize = product.sizes[0];
      if (targetSize.ms_href) {
        msHref = targetSize.ms_href;
      }
      skusValue = targetSize.skus && targetSize.skus.length > 0 ? targetSize.skus[0] : null;
    } else {
      skusValue = null; // Несколько размеров, но без chrtID - код не передаем
      // console.log(`[PREPARE_MS] Товар ${product.nmID} имеет несколько размеров, 'code' не будет передан.`);
    }
  }

  const moySkladItem = {
    name: product.title,
    externalCode: product.nmID.toString(), // nmID как externalCode
    article: product.vendorCode, // vendorCode как article
  };

  if (skusValue) {
    moySkladItem.code = skusValue; // skus как code
  }

  // Если товар уже создан в МС (т.е. msHref найден для targetSize), добавляем метаданные для обновления
  if (msHref) {
    moySkladItem.meta = {
      href: msHref,
      // тип объекта должен быть правильным, 'product' в большинстве случаев,
      // но если это был комплект/модификация, нужен другой тип
      type: 'product',
    };
  }

  // Возвращаем также targetSize, skusValue и оригинальный ID продукта
  return { moySkladItem, targetSize, skusValue, productOriginalId: product._id };
}


// --- НОВАЯ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Общая логика выполнения массового запроса к МойСклад ---
// Эта функция вызывает axios.post и обрабатывает ответы, обновляя БД.
async function _executeMoySkladProductOperation(moySkladRequests, MOYSKLAD_API_TOKEN, productsMap, userId) {
    let msResponseData;
    const operationResults = []; // Собираем результаты для возврата

    try {
        const msResponse = await axios.post(MOYSKLAD_PRODUCT_API_URL, moySkladRequests, {
            headers: {
                'Authorization': `Bearer ${MOYSKLAD_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            timeout: 120000 // 2 минуты таймаут
        });
        msResponseData = msResponse.data;
        console.log(`[MOYSKLAD_EXEC] Массовая операция завершена. Получено ${msResponseData.length} ответов.`);
    } catch (error) {
        console.error(`[MOYSKLAD_EXEC ERROR] Ошибка при запросе к МойСклад API: ${error.message}`);
        if (error.response) {
            console.error(`[MOYSKLAD_EXEC ERROR] Статус ответа МойСклад: ${error.response.status}`);
            console.error(`[MOYSKLAD_EXEC ERROR] Данные ответа МойСклад:`, error.response.data);
        }
        // Перебрасываем ошибку для обработки выше, т.к. весь запрос упал
        throw error;
    }

    const bulkUpdateOperations = [];
    for (let i = 0; i < msResponseData.length; i++) {
        const msItemResult = msResponseData[i];
        const { product, targetSize } = productsMap.get(moySkladRequests[i].externalCode); // Используем externalCode для поиска в Map

        if (msItemResult.meta && msItemResult.meta.href) {
            let msHref = msItemResult.meta.href;
            let updatePath = null;

            if (targetSize) {
                const sizeIndex = product.sizes.findIndex(s => s.chrtID === targetSize.chrtID);
                if (sizeIndex !== -1) { updatePath = `sizes.${sizeIndex}.ms_href`; }
            } else if (product.sizes && product.sizes.length === 1) {
                updatePath = `sizes.0.ms_href`;
            }

            if (updatePath) {
                bulkUpdateOperations.push({
                    updateOne: {
                        filter: { _id: product._id, user: userId },
                        update: { $set: { [updatePath]: msHref } }
                    }
                });
                console.log(`[MOYSKLAD_EXEC] Подготовлено обновление ms_href для товара ${product.nmID} (путь: ${updatePath}).`);
            } else {
                console.log(`[MOYSKLAD_EXEC] ms_href для товара ${product.nmID} не был привязан к конкретному размеру (нет updatePath).`);
            }

            operationResults.push({
                productId: product._id,
                nmID: product.nmID,
                title: product.title,
                status: 'success',
                ms_href: msHref,
                message: `Создан/обновлен в МС.`,
                sizeTechSize: targetSize ? targetSize.techSize : 'Общий'
            });
        } else {
            const errorMessage = msItemResult.errors && msItemResult.errors.length > 0 ? msItemResult.errors[0].error : 'Неизвестная ошибка в МС.';
            console.error(`[MOYSKLAD_EXEC ERROR] Ошибка для товара ${product.nmID} в массовом ответе МС: ${errorMessage}`);
            operationResults.push({
                productId: product._id,
                nmID: product.nmID,
                title: product.title,
                status: 'error',
                message: `Ошибка МС: ${errorMessage}`
            });
        }
    }

    if (bulkUpdateOperations.length > 0) {
        console.log(`[MOYSKLAD_EXEC] Выполняем массовое обновление ${bulkUpdateOperations.length} товаров в нашей БД.`);
        try {
            await Product.bulkWrite(bulkUpdateOperations);
            console.log(`[MOYSKLAD_EXEC] Обновление нашей БД завершено.`);
        } catch (dbError) {
            console.error(`[MOYSKLAD_EXEC ERROR] Ошибка при выполнении bulkWrite в MongoDB: ${dbError.message}`);
            // Здесь можно добавить более детальную обработку для каждого результата
        }
    }
    return { results: operationResults };
}


// @desc    Создать/обновить товары в МойСклад (массово или индивидуально)
// @route   POST /api/products/create-in-ms
// @access  Private
exports.createProductInMoySklad = async (req, res) => {
  const { productId, sizeChrtID, productIds, selectedAllPages, integrationLinkId } = req.body;
  const userId = req.user._id;

  console.log(`[API_CREATE_IN_MS] Получен API запрос на создание/обновление товаров в МС.`);
  console.log(`[API_CREATE_IN_MS] productId (индивидуально): ${productId || 'N/A'}, productIds (массово): ${productIds ? productIds.length : 'N/A'}, selectedAllPages: ${selectedAllPages}`);

  try {
    const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
      .populate('storage', 'token');

    if (!integrationLink) {
        console.error(`[API_CREATE_IN_MS ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
        return res.status(404).json({ message: 'Интеграционная связка не найдена или не принадлежит вам.' });
    }
    const MOYSKLAD_API_TOKEN = integrationLink.storage.token;
    if (!MOYSKLAD_API_TOKEN) {
      console.error(`[API_CREATE_IN_MS ERROR] Склад "${integrationLink.storage.name}" не имеет токена МойСклад API.`);
      return res.status(400).json({ message: 'Склад в интеграционной связке не имеет токена МойСклад API.' });
    }
    console.log(`[API_CREATE_IN_MS] Токен МойСклад API получен.`);

    let productsToLoad = []; // Товары, которые нужно загрузить из БД для обработки
    if (productId) {
        productsToLoad.push(productId);
    } else if (productIds && productIds.length > 0) {
        productsToLoad = productIds;
    } else if (selectedAllPages) {
        // Если selectedAllPages, нам нужно получить ВСЕ товары для интеграции
        const allProductsForIntegration = await Product.find({ integrationLink: integrationLinkId, user: userId });
        productsToLoad = allProductsForIntegration.map(p => p._id);
        console.log(`[API_CREATE_IN_MS] Для массовой операции выбрано ${productsToLoad.length} товаров по флагу selectedAllPages.`);
    } else {
        console.error(`[API_CREATE_IN_MS ERROR] Не выбраны товары для создания/обновления.`);
        return res.status(400).json({ message: 'Не выбраны товары для создания/обновления.' });
    }

    if (productsToLoad.length === 0) {
        console.log(`[API_CREATE_IN_MS] Нет товаров для обработки после фильтрации.`);
        return res.status(200).json({ message: 'Нет товаров для обработки.', results: [] });
    }

    // Загружаем полные объекты продуктов из БД
    const productsFromDb = await Product.find({ _id: { $in: productsToLoad }, integrationLink: integrationLinkId, user: userId });
    console.log(`[API_CREATE_IN_MS] Загружено ${productsFromDb.length} полных объектов товаров из БД.`);

    // --- Подготовка и выполнение операции ---
    const moySkladRequests = [];
    const productsMapByExternalCode = new Map(); // Карта для сопоставления ответа МС с оригинальным продуктом

    for (const product of productsFromDb) {
        let preparedData;
        try {
            // Для индивидуального запроса передаем sizeChrtID, для массового - null
            preparedData = _prepareProductDataForMoySklad(product, productId ? sizeChrtID : null);
            moySkladRequests.push(preparedData.moySkladItem);
            productsMapByExternalCode.set(preparedData.moySkladItem.externalCode, { product, targetSize: preparedData.targetSize });
        } catch (prepError) {
            console.warn(`[API_CREATE_IN_MS WARNING] Пропущен товар ${product.nmID} из-за ошибки подготовки: ${prepError.message}`);
            // Добавляем результат о пропуске
            // Здесь нужен ProductId, nmID, title
            const errorResult = {
                productId: product._id,
                nmID: product.nmID,
                title: product.title,
                status: 'skipped',
                message: `Ошибка подготовки: ${prepError.message}`
            };
            // Если это индивидуальный запрос, сразу вернем ошибку
            if (productId) {
                return res.status(400).json(errorResult);
            }
            // Для массовых - собираем результаты
            productsMapByExternalCode.set(preparedData.moySkladItem.externalCode, { product, targetSize: preparedData.targetSize, errorResult });
        }
    }

    if (moySkladRequests.length === 0) {
        console.log(`[API_CREATE_IN_MS] После подготовки нет товаров для отправки в МойСклад.`);
        return res.status(200).json({ message: 'Нет товаров для обработки после подготовки.', results: [] });
    }

    console.log(`[API_CREATE_IN_MS] Вызываем _executeMoySkladProductOperation для ${moySkladRequests.length} товаров.`);
    const { results: operationResults } = await _executeMoySkladProductOperation(
        moySkladRequests, MOYSKLAD_API_TOKEN, productsMapByExternalCode, userId
    );

    // Если это индивидуальный запрос, возвращаем его результат в другом формате
    if (productId) {
        const individualResult = operationResults.find(r => r.productId.toString() === productId.toString());
        if (individualResult && individualResult.status === 'success') {
            return res.status(200).json(individualResult);
        } else {
            return res.status(400).json(individualResult || { message: 'Неизвестная ошибка индивидуальной операции.' });
        }
    } else {
        // Для массовых запросов
        return res.status(200).json({ message: 'Массовая операция завершена.', results: operationResults });
    }

  } catch (error) {
    console.error(`[API_CREATE_IN_MS ERROR] Общая ошибка при создании товаров в МойСклад: ${error.message}`);
    if (error.response) {
        console.error(`[API_CREATE_IN_MS ERROR] Статус ответа МойСклад: ${error.response.status}`);
        console.error(`[API_CREATE_IN_MS ERROR] Данные ответа МойСклад:`, error.response.data);
    } else if (error.request) {
        console.error(`[API_CREATE_IN_MS ERROR] Запрос отправлен, но ответ не получен (нет error.response).`);
    } else {
        console.error(`[API_CREATE_IN_MS ERROR] Ошибка настройки запроса или до его отправки:`, error.message);
    }

    if (error.response && error.response.status === 401) {
      return res.status(401).json({ message: 'Недействительный токен МойСклад API.' });
    } else if (error.response && error.response.status === 403) {
      return res.status(403).json({ message: 'Токен МойСклад API не имеет достаточных прав.' });
    } else if (error.response && error.response.data && error.response.data.errors && error.response.data.errors.length > 0) {
        const msError = error.response.data.errors[0];
        return res.status(400).json({ message: `Ошибка МойСклад: ${msError.error} (${msError.code || ''})` });
    }
    res.status(500).json({ message: `Ошибка сервера при создании товара в МойСклад: ${error.message}` });
  }
};

// @desc    Получить список товаров для конкретной интеграции И ЗАПУСТИТЬ СИНХРОНИЗАЦИЮ
// @route   GET /api/products/:integrationLinkId
// @access  Private
exports.getProductsByIntegration = async (req, res) => {
  const { integrationLinkId } = req.params;
  const userId = req.user._id;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  console.log(`[GET_PRODUCTS] Получен запрос на товары для integrationLink ID: ${integrationLinkId}, страница: ${page}, лимит: ${limit}`);

  try {
    const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
      .populate('wbCabinet', 'token') // Нужно получить токен WB
      .populate('storage', 'name'); // Для логирования

    if (!integrationLink) {
      console.error(`[GET_PRODUCTS ERROR] Интеграционная связка ${integrationLinkId} не найдена или не принадлежит пользователю ${userId}.`);
      return res.status(404).json({ message: 'Интеграционная связка не найдена или не принадлежит вам.' });
    }

    // --- АВТОМАТИЧЕСКИЙ ЗАПУСК СИНХРОНИЗАЦИИ ---
    console.log(`[GET_PRODUCTS] Запускаем автоматическую синхронизацию для связки ${integrationLinkId} перед получением товаров.`);
    try {
        // Мы вызываем логику syncProducts напрямую, не через req, res
        const syncResult = await exports.syncProducts({ // Передаем минимальные req-подобные данные
            user: { _id: userId },
            body: { integrationLinkId: integrationLinkId }
        }, {}); // Второй аргумент пустой, т.к. res там не используется напрямую для ответа
        console.log(`[GET_PRODUCTS] Автоматическая синхронизация завершена: ${syncResult.message}`);
    } catch (syncError) {
        console.error(`[GET_PRODUCTS ERROR] Ошибка при автоматической синхронизации: ${syncError.message}`);
        // Если синхронизация не удалась, возвращаем ошибку и не пытаемся получить товары
        return res.status(500).json({ message: `Ошибка при синхронизации товаров: ${syncError.message}` });
    }
    // --- КОНЕЦ АВТОМАТИЧЕСКОГО ЗАПУСКА СИНХРОНИЗАЦИИ ---


    // Теперь, после (потенциальной) синхронизации, получаем товары из нашей БД
    const products = await Product.find({ integrationLink: integrationLinkId, user: userId })
      .skip(skip)
      .limit(limit)
      .select('nmID title brand vendorCode sizes');

    const totalProducts = await Product.countDocuments({ integrationLink: integrationLinkId, user: userId });

    console.log(`[GET_PRODUCTS] Найдено ${products.length} товаров на странице ${page} из ${totalProducts} всего для связки ${integrationLinkId}.`);

    res.json({
      products,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
    });
  } catch (error) {
    console.error(`[GET_PRODUCTS ERROR] Общая ошибка при получении товаров для связки ${integrationLinkId}: ${error.message}`);
    res.status(500).json({ message: 'Ошибка сервера при получении товаров.' });
  }
};
