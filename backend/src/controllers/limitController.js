const Limit = require('../models/Limit');
const Storage = require('../models/Storage');
const WbCabinet = require('../models/WbCabinet');

// @desc    Получить лимиты текущего пользователя
// @route   GET /api/limits
// @access  Private
exports.getUserLimits = async (req, res) => {
  try {
    const userId = req.user.id;

    // Пытаемся найти лимиты пользователя
    let limits = await Limit.findOne({ user: userId });

    // Если запись отсутствует — создаём с настройками по умолчанию
    if (!limits) {
      limits = await Limit.create({ user: userId });
    }

    // Текущее фактическое количество объектов
    const currentStorages = await Storage.countDocuments({ user: userId });
    const currentWbCabinets = await WbCabinet.countDocuments({ user: userId });

    return res.json({
      maxStorages: limits.maxStorages,
      maxWbCabinets: limits.maxWbCabinets,
      maxReportDepthWeeks: limits.maxReportDepthWeeks,
      currentStorages,
      currentWbCabinets,
    });
  } catch (error) {
    console.error('[LIMITS] Ошибка получения лимитов:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении лимитов', error: error.message });
  }
}; 