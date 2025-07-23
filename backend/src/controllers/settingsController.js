const settingsService = require('../services/settingsService');

// @desc    Получить настройки для конкретной интеграции
// @route   GET /api/settings/:integrationLinkId
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user._id;

    if (!integrationLinkId) {
      return res.status(400).json({ message: 'Необходимо указать ID интеграционной связки.' });
    }

    const settings = await settingsService.getSettings(integrationLinkId, userId);
    res.status(200).json(settings);
  } catch (error) {
    console.error(`[SETTINGS_CONTROLLER] Ошибка при получении настроек: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении настроек.' });
  }
};

// @desc    Обновить настройки для конкретной интеграции
// @route   PUT /api/settings/:integrationLinkId
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user._id;
    const settingsData = req.body;

    if (!integrationLinkId) {
      return res.status(400).json({ message: 'Необходимо указать ID интеграционной связки.' });
    }

    const updatedSettings = await settingsService.updateSettings(integrationLinkId, userId, settingsData);
    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error(`[SETTINGS_CONTROLLER] Ошибка при обновлении настроек: ${error.message}`);
    
    // Если ошибка связана с правилом валидации, возвращаем 400
    if (error.message.includes('Сначала следует включить')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: error.message || 'Ошибка сервера при обновлении настроек.' });
  }
};

// @desc    Получить все настройки пользователя
// @route   GET /api/settings
// @access  Private
exports.getAllUserSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const settings = await settingsService.getAllUserSettings(userId);
    res.status(200).json(settings);
  } catch (error) {
    console.error(`[SETTINGS_CONTROLLER] Ошибка при получении всех настроек пользователя: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении настроек.' });
  }
}; 