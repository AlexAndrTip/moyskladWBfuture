// backend/src/services/moySkladBundleService.js

const Product = require('../models/Product');
const IntegrationLink = require('../models/IntegrationLink');
const axios = require('axios');

const MS_PRODUCT_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/product';
const MS_BUNDLE_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/bundle';
const EMPTY_COMPONENT_NAME = 'Пустой для комплектов';

// Получает или создаёт товар "Пустой для комплектов"
async function getOrCreateEmptyComponentHref(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json;charset=utf-8',
    'Content-Type': 'application/json',
  };

  try {
    const searchRes = await axios.get(
      `${MS_PRODUCT_URL}?filter=name~${encodeURIComponent(EMPTY_COMPONENT_NAME)}`,
      { headers }
    );
    const found = searchRes.data?.rows?.[0];

    if (found?.meta?.href) {
      console.log(`[BUNDLE] Найден товар "${EMPTY_COMPONENT_NAME}": ${found.meta.href}`);
      return found.meta.href;
    }

    const createRes = await axios.post(
      MS_PRODUCT_URL,
      { name: EMPTY_COMPONENT_NAME },
      { headers }
    );

    const createdHref = createRes.data.meta.href;
    console.log(`[BUNDLE] Создан товар "${EMPTY_COMPONENT_NAME}": ${createdHref}`);
    return createdHref;

  } catch (err) {
    console.error(`[BUNDLE ERROR] Ошибка при поиске/создании "${EMPTY_COMPONENT_NAME}"`, err?.response?.data || err.message);
    throw new Error(`Не удалось получить или создать товар "${EMPTY_COMPONENT_NAME}"`);
  }
}

// Основная функция создания комплектов
async function createProductBundlesInMoySklad(integrationLinkId, userId, productIds, selectedAllPages) {
  console.log(`[BUNDLE SERVICE] Начало создания комплектов в МойСклад...`);

  const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
    .populate('storage', 'token');

  if (!integrationLink || !integrationLink.storage?.token) {
    throw new Error('Интеграционная связка не найдена или отсутствует токен МойСклад.');
  }

  const MOYSKLAD_API_TOKEN = integrationLink.storage.token;

  let productsToLoadIds = [];
  if (productIds?.length > 0) {
    productsToLoadIds = productIds;
  } else if (selectedAllPages) {
    const allProducts = await Product.find({ integrationLink: integrationLinkId, user: userId, complect: true }).select('_id');
    productsToLoadIds = allProducts.map(p => p._id);
  }

  if (!productsToLoadIds.length) {
    return { message: 'Нет товаров-комплектов для создания.', results: [] };
  }

  const products = await Product.find({
    _id: { $in: productsToLoadIds },
    integrationLink: integrationLinkId,
    user: userId,
    complect: true
  });

  const emptyComponentHref = await getOrCreateEmptyComponentHref(MOYSKLAD_API_TOKEN);

  const results = [];
  const headers = {
    Authorization: `Bearer ${MOYSKLAD_API_TOKEN}`,
    Accept: 'application/json;charset=utf-8',
    'Content-Type': 'application/json',
  };

  for (const product of products) {
    try {
      const firstSize = product.sizes?.[0];
      // Получаем SKU напрямую из первого элемента массива skus, если он есть
      const skuCode = firstSize?.skus?.[0] || ''; // <-- Вот это изменение!

      const bundlePayload = {
        name: product.title,
        article: product.vendorCode || '',
        code: skuCode, // Используем исправленное значение skuCode
        externalCode: String(product.nmID),
        archived: false,
        components: [
          {
            assortment: {
              meta: {
                href: emptyComponentHref,
                metadataHref: 'https://api.moysklad.ru/api/remap/1.2/entity/product/metadata',
                type: 'product',
                mediaType: 'application/json'
              }
            },
            quantity: 1
          }
        ]
      };

      console.log(`[BUNDLE DEBUG] Тело запроса на создание комплекта "${product.title}" (${product.nmID}):\n` + JSON.stringify(bundlePayload, null, 2));

      const response = await axios.post(MS_BUNDLE_URL, bundlePayload, { headers });
      const ms_href = response.data.meta.href;

      const targetSizeIndex = product.sizes.findIndex(s => s.chrtID === firstSize?.chrtID);
      if (targetSizeIndex !== -1) {
        product.sizes[targetSizeIndex].ms_href = ms_href;
        await product.save();
      }

      results.push({
        productId: product._id,
        nmID: product.nmID,
        title: product.title,
        ms_href,
        status: 'success',
        message: 'Комплект создан в МойСклад'
      });

    } catch (err) {
      console.error(`[BUNDLE ERROR] ${product.nmID}`, err?.response?.data || err.message);
      results.push({
        productId: product._id,
        nmID: product.nmID,
        title: product.title,
        status: 'error',
        message: err?.response?.data?.errors?.[0]?.error || err.message
      });
    }
  }

  return {
    message: 'Операция создания комплектов завершена',
    results
  };
}

module.exports = {
  createProductBundlesInMoySklad,
};
