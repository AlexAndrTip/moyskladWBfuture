// backend/src/services/moySkladStockService.js

const axios = require('axios');
const IntegrationLink = require('../models/IntegrationLink');
const Product = require('../models/Product');

// Вспомогательная функция для получения токена МойСклад
async function getMoyskladToken(integrationLinkId, userId) {
  const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
    .populate({
      path: 'storage',
      select: 'token'
    });

  if (!integrationLink) {
    throw new Error('Интеграционная связка не найдена.');
  }
  
  if (!integrationLink.storage || !integrationLink.storage.token) {
    throw new Error('Склад в интеграционной связке не имеет токена МойСклад.');
  }
  
  return integrationLink.storage.token;
}

// Базовый URL для API МойСклад отчетов
const MOYSKLAD_REPORT_API_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2/report/';

/**
 * Получить остатки всех товаров из МойСклад
 * @param {string} integrationLinkId - ID интеграционной связки
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} - Массив товаров с остатками
 */
async function getMoySkladStock(integrationLinkId, userId) {
  console.log(`[MOYSK_STOCK_SERVICE] Получение остатков из МойСклад для интеграции ${integrationLinkId}`);
  
  try {
    const token = await getMoyskladToken(integrationLinkId, userId);
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Получаем все остатки с пагинацией
    let allStocks = [];
    let offset = 0;
    const limit = 1000; // Максимальный лимит для одного запроса
    let hasMore = true;

    while (hasMore) {
      const params = {
        limit: limit,
        offset: offset
      };

      console.log(`[MOYSK_STOCK_SERVICE] Запрос остатков: offset=${offset}, limit=${limit}`);
      
      const response = await axios.get(`${MOYSKLAD_REPORT_API_BASE_URL}stock/all`, { 
        headers, 
        params 
      });

      const stocks = response.data.rows || [];
      allStocks = allStocks.concat(stocks);
      
      console.log(`[MOYSK_STOCK_SERVICE] Получено ${stocks.length} товаров с остатками (всего: ${allStocks.length})`);
      
      // Проверяем, есть ли еще данные
      hasMore = stocks.length === limit;
      offset += limit;
      
      // Защита от бесконечного цикла
      if (offset > 100000) {
        console.warn(`[MOYSK_STOCK_SERVICE] Достигнут лимит пагинации (100000), прерываем запрос`);
        break;
      }
    }

    console.log(`[MOYSK_STOCK_SERVICE] Всего получено ${allStocks.length} товаров с остатками`);
    return allStocks;

  } catch (error) {
    console.error(`[MOYSK_STOCK_SERVICE ERROR] Ошибка при получении остатков из МойСклад:`, error.response?.data || error.message);
    throw new Error(`Ошибка при получении остатков из МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

/**
 * Обновить остатки МойСклад для товаров пользователя
 * @param {string} integrationLinkId - ID интеграционной связки
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Результат обновления
 */
async function updateMoySkladStock(integrationLinkId, userId) {
  console.log(`[MOYSK_STOCK_SERVICE] Начало обновления остатков МойСклад для пользователя ${userId}`);
  
  try {
    // Получаем остатки из МойСклад
    const moySkladStocks = await getMoySkladStock(integrationLinkId, userId);
    
    if (!moySkladStocks || moySkladStocks.length === 0) {
      console.log(`[MOYSK_STOCK_SERVICE] Нет данных об остатках в МойСклад`);
      return {
        success: true,
        message: 'Нет данных об остатках в МойСклад',
        updated: 0,
        errors: 0
      };
    }

    // Создаем карту остатков по href товара
    const stockMap = new Map();
    moySkladStocks.forEach(stock => {
      if (stock.meta && stock.meta.href) {
        stockMap.set(stock.meta.href, stock.quantity || 0);
      }
    });

    console.log(`[MOYSK_STOCK_SERVICE] Создана карта остатков для ${stockMap.size} товаров`);

    // Получаем все товары пользователя для данной интеграции
    const products = await Product.find({ 
      integrationLink: integrationLinkId, 
      user: userId 
    });

    console.log(`[MOYSK_STOCK_SERVICE] Найдено ${products.length} товаров в БД для обновления`);

    let updatedCount = 0;
    let errorCount = 0;
    const updatePromises = [];

    // Обновляем остатки для каждого товара
    for (const product of products) {
      try {
        let hasUpdates = false;
        const updateData = {};

        // Обновляем общий ms_href_general если есть
        if (product.ms_href_general && stockMap.has(product.ms_href_general)) {
          // Для общего товара обновляем первый размер или создаем его
          if (product.sizes && product.sizes.length > 0) {
            product.sizes[0].stockMS = stockMap.get(product.ms_href_general);
            product.sizes[0].lastStockUpdate = new Date();
            hasUpdates = true;
          }
        }

        // Обновляем остатки для каждого размера
        if (product.sizes && product.sizes.length > 0) {
          for (const size of product.sizes) {
            if (size.ms_href && stockMap.has(size.ms_href)) {
              size.stockMS = stockMap.get(size.ms_href);
              size.lastStockUpdate = new Date();
              hasUpdates = true;
            }
          }
        }

        if (hasUpdates) {
          updatePromises.push(product.save());
          updatedCount++;
        }

      } catch (error) {
        console.error(`[MOYSK_STOCK_SERVICE ERROR] Ошибка при обновлении товара ${product.nmID}:`, error.message);
        errorCount++;
      }
    }

    // Выполняем все обновления параллельно
    if (updatePromises.length > 0) {
      console.log(`[MOYSK_STOCK_SERVICE] Сохраняем обновления для ${updatePromises.length} товаров`);
      await Promise.all(updatePromises);
    }

    const result = {
      success: true,
      message: `Обновление остатков МойСклад завершено`,
      updated: updatedCount,
      errors: errorCount,
      totalProducts: products.length,
      totalStocksFromMS: moySkladStocks.length
    };

    console.log(`[MOYSK_STOCK_SERVICE] Результат обновления:`, result);
    return result;

  } catch (error) {
    console.error(`[MOYSK_STOCK_SERVICE ERROR] Общая ошибка при обновлении остатков МойСклад:`, error.message);
    throw error;
  }
}

/**
 * Обновить остатки МойСклад для всех интеграций пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} - Результат обновления
 */
async function updateAllMoySkladStock(userId) {
  console.log(`[MOYSK_STOCK_SERVICE] Обновление остатков МойСклад для всех интеграций пользователя ${userId}`);
  
  try {
    // Получаем все интеграционные связки пользователя
    const integrationLinks = await IntegrationLink.find({ user: userId })
      .populate('storage', 'name token')
      .populate('wbCabinet', 'name');

    if (!integrationLinks || integrationLinks.length === 0) {
      return {
        success: true,
        message: 'У вас нет настроенных интеграционных связок',
        results: []
      };
    }

    const results = [];
    let totalUpdated = 0;
    let totalErrors = 0;

    // Обрабатываем каждую интеграционную связку
    for (const integrationLink of integrationLinks) {
      try {
        console.log(`[MOYSK_STOCK_SERVICE] Обновляем остатки для интеграции: ${integrationLink.storage?.name || 'Неизвестный склад'}`);
        
        const result = await updateMoySkladStock(integrationLink._id, userId);

        results.push({
          integrationLinkId: integrationLink._id,
          storageName: integrationLink.storage?.name || 'Неизвестный склад',
          wbCabinetName: integrationLink.wbCabinet?.name || 'Неизвестный кабинет',
          ...result
        });

        if (result.success) {
          totalUpdated += result.updated || 0;
        } else {
          totalErrors++;
        }

      } catch (error) {
        console.error(`[MOYSK_STOCK_SERVICE] Ошибка при обновлении интеграции ${integrationLink._id}:`, error.message);
        
        results.push({
          integrationLinkId: integrationLink._id,
          storageName: integrationLink.storage?.name || 'Неизвестный склад',
          wbCabinetName: integrationLink.wbCabinet?.name || 'Неизвестный кабинет',
          success: false,
          error: error.message
        });
        totalErrors++;
      }
    }

    const response = {
      success: true,
      message: `Обновление остатков МойСклад завершено. Обработано интеграций: ${integrationLinks.length}`,
      summary: {
        totalIntegrations: integrationLinks.length,
        successfulIntegrations: integrationLinks.length - totalErrors,
        failedIntegrations: totalErrors,
        totalUpdatedProducts: totalUpdated
      },
      results
    };

    console.log(`[MOYSK_STOCK_SERVICE] Итоговый результат:`, response);
    return response;

  } catch (error) {
    console.error(`[MOYSK_STOCK_SERVICE ERROR] Общая ошибка при обновлении остатков МойСклад:`, error.message);
    throw error;
  }
}

module.exports = {
  getMoySkladStock,
  updateMoySkladStock,
  updateAllMoySkladStock
};