const Settings = require('../models/Settings');

/**
 * Получить настройки для конкретной интеграции
 * @param {string} integrationLinkId - ID интеграционной связки
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} Объект настроек
 */
async function getSettings(integrationLinkId, userId) {
  try {
    let settings = await Settings.findOne({ integrationLink: integrationLinkId, user: userId });
    
    // Если настройки не найдены, создаем новые с дефолтными значениями
    if (!settings) {
      settings = new Settings({
        integrationLink: integrationLinkId,
        user: userId,
        autoExportProducts: false,
        autoExportSupplies: false,
        autoExportReports: false,
        createServiceReceipts: false,
        createServiceExpenseOrders: false,
        exportFBSOrders: false,
      });
      await settings.save();
    }
    
    return settings;
  } catch (error) {
    console.error('[SETTINGS_SERVICE] Ошибка при получении настроек:', error);
    throw new Error('Ошибка при получении настроек');
  }
}

/**
 * Обновить настройки для конкретной интеграции
 * @param {string} integrationLinkId - ID интеграционной связки
 * @param {string} userId - ID пользователя
 * @param {Object} settingsData - Объект с настройками
 * @returns {Promise<Object>} Обновленный объект настроек
 */
async function updateSettings(integrationLinkId, userId, settingsData) {
  try {
    // Проверяем правило: autoExportReports можно включить только если autoExportProducts включен
    if (settingsData.autoExportReports && !settingsData.autoExportProducts) {
      throw new Error('Сначала следует включить Автоматическую выгрузку товаров');
    }

    let settings = await Settings.findOne({ integrationLink: integrationLinkId, user: userId });
    
    if (!settings) {
      // Если настройки не найдены, создаем новые
      settings = new Settings({
        integrationLink: integrationLinkId,
        user: userId,
        ...settingsData
      });
    } else {
      // Обновляем существующие настройки
      Object.assign(settings, settingsData);
    }
    
    await settings.save();
    return settings;
  } catch (error) {
    console.error('[SETTINGS_SERVICE] Ошибка при обновлении настроек:', error);
    throw error;
  }
}

/**
 * Получить все настройки пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} Массив настроек
 */
async function getAllUserSettings(userId) {
  try {
    const settings = await Settings.find({ user: userId }).populate('integrationLink');
    return settings;
  } catch (error) {
    console.error('[SETTINGS_SERVICE] Ошибка при получении всех настроек пользователя:', error);
    throw new Error('Ошибка при получении настроек');
  }
}

module.exports = {
  getSettings,
  updateSettings,
  getAllUserSettings
}; 