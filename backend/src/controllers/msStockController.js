// backend/src/controllers/msStockController.js

const moySkladStockService = require('../services/moySkladStockService');
const IntegrationLink = require('../models/IntegrationLink');

/**
 * Обновить остатки МойСклад для всех интеграций пользователя
 * @route POST /api/ms-stock/update-all
 * @access Private
 */
exports.updateAllStock = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`[MS_STOCK_CONTROLLER] Запрос на обновление остатков МойСклад для пользователя ${userId}`);

    const result = await moySkladStockService.updateAllMoySkladStock(userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('[MS_STOCK_CONTROLLER] Ошибка при обновлении остатков МойСклад:', error.message);
    res.status(500).json({ 
      message: 'Ошибка сервера при обновлении остатков МойСклад', 
      error: error.message 
    });
  }
};

/**
 * Обновить остатки МойСклад для конкретной интеграционной связки
 * @route POST /api/ms-stock/update/:integrationLinkId
 * @access Private
 */
exports.updateIntegrationStock = async (req, res) => {
  try {
    const userId = req.user._id;
    const integrationLinkId = req.params.integrationLinkId;

    console.log(`[MS_STOCK_CONTROLLER] Запрос на обновление остатков МойСклад для интеграции ${integrationLinkId}`);

    // Проверяем, что интеграционная связка принадлежит пользователю
    const integrationLink = await IntegrationLink.findOne({ 
      _id: integrationLinkId, 
      user: userId 
    }).populate('storage', 'name').populate('wbCabinet', 'name');

    if (!integrationLink) {
      return res.status(404).json({ 
        message: 'Интеграционная связка не найдена или у вас нет прав на её использование' 
      });
    }

    const result = await moySkladStockService.updateMoySkladStock(integrationLinkId, userId);

    if (result.success) {
      res.json({
        message: `Остатки МойСклад для интеграции "${integrationLink.storage?.name || 'Неизвестный склад'}" обновлены успешно`,
        integrationLinkId: integrationLink._id,
        storageName: integrationLink.storage?.name || 'Неизвестный склад',
        wbCabinetName: integrationLink.wbCabinet?.name || 'Неизвестный кабинет',
        ...result
      });
    } else {
      res.status(400).json({
        message: `Ошибка при обновлении остатков МойСклад для интеграции "${integrationLink.storage?.name || 'Неизвестный склад'}"`,
        integrationLinkId: integrationLink._id,
        storageName: integrationLink.storage?.name || 'Неизвестный склад',
        wbCabinetName: integrationLink.wbCabinet?.name || 'Неизвестный кабинет',
        error: result.error
      });
    }

  } catch (error) {
    console.error('[MS_STOCK_CONTROLLER] Ошибка при обновлении остатков интеграции:', error.message);
    res.status(500).json({ 
      message: 'Ошибка сервера при обновлении остатков МойСклад', 
      error: error.message 
    });
  }
};

/**
 * Получить статистику остатков МойСклад
 * @route GET /api/ms-stock/stats
 * @access Private
 */
exports.getStockStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const Product = require('../models/Product');

    console.log(`[MS_STOCK_CONTROLLER] Запрос статистики остатков МойСклад для пользователя ${userId}`);

    // Получаем статистику по остаткам МойСклад
    const stats = await Product.aggregate([
      {
        $match: { 
          user: userId,
          'sizes.stockMS': { $exists: true }
        }
      },
      {
        $unwind: '$sizes'
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalWithStock: {
            $sum: {
              $cond: [{ $gt: ['$sizes.stockMS', 0] }, 1, 0]
            }
          },
          totalStockQuantity: { $sum: '$sizes.stockMS' },
          avgStockQuantity: { $avg: '$sizes.stockMS' },
          maxStockQuantity: { $max: '$sizes.stockMS' },
          minStockQuantity: { $min: '$sizes.stockMS' }
        }
      }
    ]);

    // Получаем статистику по интеграционным связкам
    const integrationStats = await Product.aggregate([
      {
        $match: { 
          user: userId,
          'sizes.stockMS': { $exists: true }
        }
      },
      {
        $unwind: '$sizes'
      },
      {
        $group: {
          _id: '$integrationLink',
          totalProducts: { $sum: 1 },
          totalWithStock: {
            $sum: {
              $cond: [{ $gt: ['$sizes.stockMS', 0] }, 1, 0]
            }
          },
          totalStockQuantity: { $sum: '$sizes.stockMS' }
        }
      },
      {
        $lookup: {
          from: 'integrationlinks',
          localField: '_id',
          foreignField: '_id',
          as: 'integrationLink'
        }
      },
      {
        $unwind: '$integrationLink'
      },
      {
        $lookup: {
          from: 'storages',
          localField: 'integrationLink.storage',
          foreignField: '_id',
          as: 'storage'
        }
      },
      {
        $lookup: {
          from: 'wbcabinets',
          localField: 'integrationLink.wbCabinet',
          foreignField: '_id',
          as: 'wbCabinet'
        }
      },
      {
        $project: {
          integrationLinkId: '$_id',
          storageName: { $arrayElemAt: ['$storage.name', 0] },
          wbCabinetName: { $arrayElemAt: ['$wbCabinet.name', 0] },
          totalProducts: 1,
          totalWithStock: 1,
          totalStockQuantity: 1
        }
      }
    ]);

    const result = {
      overall: stats.length > 0 ? stats[0] : {
        totalProducts: 0,
        totalWithStock: 0,
        totalStockQuantity: 0,
        avgStockQuantity: 0,
        maxStockQuantity: 0,
        minStockQuantity: 0
      },
      byIntegration: integrationStats
    };

    res.json(result);

  } catch (error) {
    console.error('[MS_STOCK_CONTROLLER] Ошибка при получении статистики остатков:', error.message);
    res.status(500).json({ 
      message: 'Ошибка сервера при получении статистики остатков МойСклад', 
      error: error.message 
    });
  }
};

/**
 * Тестовый метод для проверки API остатков МойСклад
 * @route GET /api/ms-stock/test/:integrationLinkId
 * @access Private
 */
exports.testStockApi = async (req, res) => {
  try {
    const userId = req.user._id;
    const integrationLinkId = req.params.integrationLinkId;

    console.log(`[MS_STOCK_CONTROLLER] Тестовый запрос API остатков МойСклад для интеграции ${integrationLinkId}`);

    // Проверяем, что интеграционная связка принадлежит пользователю
    const integrationLink = await IntegrationLink.findOne({ 
      _id: integrationLinkId, 
      user: userId 
    }).populate('storage', 'name').populate('wbCabinet', 'name');

    if (!integrationLink) {
      return res.status(404).json({ 
        message: 'Интеграционная связка не найдена или у вас нет прав на её использование' 
      });
    }

    // Тестируем только получение данных из МойСклад
    const stocks = await moySkladStockService.getMoySkladStock(integrationLinkId, userId);

    res.json({
      message: 'Тест API остатков МойСклад прошел успешно',
      integrationLinkId: integrationLink._id,
      storageName: integrationLink.storage?.name || 'Неизвестный склад',
      wbCabinetName: integrationLink.wbCabinet?.name || 'Неизвестный кабинет',
      stocksCount: stocks.length,
      note: 'Данные получены, но не сохранены. Используйте полное обновление для сохранения в БД.'
    });

  } catch (error) {
    console.error('[MS_STOCK_CONTROLLER] Ошибка при тестировании API остатков:', error.message);
    res.status(400).json({ 
      message: 'Ошибка при тестировании API остатков МойСклад', 
      error: error.message 
    });
  }
};
