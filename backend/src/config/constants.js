// backend/src/config/constants.js

// Константы для Wildberries API
const WB_CONTENT_API_URL = 'https://content-api.wildberries.ru/content/v2/get/cards/list';

// Константы для МойСклад API
const MOYSKLAD_PRODUCT_API_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/product';
const MOYSKLAD_VARIANT_API_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/variant';
const MOYSKLAD_SIZE_CHARACTERISTIC_NAME = 'Размер'; // Имя характеристики для размеров в МойСклад

module.exports = {
    WB_CONTENT_API_URL,
    MOYSKLAD_PRODUCT_API_URL,
    MOYSKLAD_VARIANT_API_URL,
    MOYSKLAD_SIZE_CHARACTERISTIC_NAME,
};
