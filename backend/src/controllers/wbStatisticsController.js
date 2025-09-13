const wbStatisticsService = require('../services/wbStatisticsService');
const WbCabinet = require('../models/WbCabinet');

/**
 * Обновить остатки FBY для всех кабинетов пользователя через Statistics API
 * @route POST /api/wb-statistics/update-all-stocks
 * @access Private
 */
exports.updateAllStocks = async (req, res) => {
    try {
      const userId = req.user._id;
      const { dateFrom, filters = {} } = req.body;
      
      console.log(`[WB_STATISTICS_CONTROLLER] Запрос на обновление остатков FBY через Statistics API для пользователя ${userId}`);

      // Получаем все кабинеты пользователя
      const wbCabinets = await WbCabinet.find({ user: userId }).select('+token');
      
      if (!wbCabinets || wbCabinets.length === 0) {
        return res.status(404).json({ 
          message: 'У вас нет настроенных WB кабинетов' 
        });
      }

      const results = [];
      let totalUpdated = 0;
      let totalErrors = 0;

      // Обрабатываем каждый кабинет
      for (const cabinet of wbCabinets) {
        try {
          console.log(`[WB_STATISTICS_CONTROLLER] Обновляем остатки для кабинета: ${cabinet.name}`);
          
          const result = await wbStatisticsService.updateFbyStocks(
            cabinet.token, 
            cabinet._id, 
            userId,
            dateFrom,
            filters
          );

          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            ...result
          });

          if (result.success) {
            totalUpdated += result.updated || 0;
          } else {
            totalErrors++;
          }

        } catch (error) {
          console.error(`[WB_STATISTICS_CONTROLLER] Ошибка при обновлении кабинета ${cabinet.name}:`, error.message);
          
          results.push({
            cabinetId: cabinet._id,
            cabinetName: cabinet.name,
            success: false,
            error: error.message
          });
          totalErrors++;
        }
      }

      const response = {
        message: `Обновление остатков FBY через Statistics API завершено. Обработано кабинетов: ${wbCabinets.length}`,
        summary: {
          totalCabinets: wbCabinets.length,
          successfulCabinets: wbCabinets.length - totalErrors,
          failedCabinets: totalErrors,
          totalUpdatedProducts: totalUpdated
        },
        results
      };

      res.json(response);

    } catch (error) {
      console.error('[WB_STATISTICS_CONTROLLER] Ошибка при обновлении остатков FBY:', error.message);
      res.status(500).json({ 
        message: 'Ошибка сервера при обновлении остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Обновить остатки FBY для конкретного кабинета через Statistics API
 * @route POST /api/wb-statistics/update-stocks/:cabinetId
 * @access Private
 */
exports.updateCabinetStocks = async (req, res) => {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;
      const { dateFrom, filters = {} } = req.body;

      console.log(`[WB_STATISTICS_CONTROLLER] Запрос на обновление остатков FBY для кабинета ${cabinetId}`);

      // Получаем кабинет пользователя
      const wbCabinet = await WbCabinet.findOne({ 
        _id: cabinetId, 
        user: userId 
      }).select('+token');

      if (!wbCabinet) {
        return res.status(404).json({ 
          message: 'WB кабинет не найден или у вас нет прав на его использование' 
        });
      }

      // Обновляем остатки
      const result = await wbStatisticsService.updateFbyStocks(
        wbCabinet.token, 
        wbCabinet._id, 
        userId,
        dateFrom,
        filters
      );

      if (result.success) {
        res.json({
          message: `Остатки FBY для кабинета "${wbCabinet.name}" обновлены успешно`,
          cabinetId: wbCabinet._id,
          cabinetName: wbCabinet.name,
          ...result
        });
      } else {
        res.status(400).json({
          message: `Ошибка при обновлении остатков FBY для кабинета "${wbCabinet.name}"`,
          cabinetId: wbCabinet._id,
          cabinetName: wbCabinet.name,
          error: result.error
        });
      }

    } catch (error) {
      console.error('[WB_STATISTICS_CONTROLLER] Ошибка при обновлении остатков кабинета:', error.message);
      res.status(500).json({ 
        message: 'Ошибка сервера при обновлении остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Получить отфильтрованные остатки FBY без сохранения в БД
 * @route GET /api/wb-statistics/stocks/:cabinetId
 * @access Private
 */
exports.getFilteredStocks = async (req, res) => {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;
      const { dateFrom, ...filters } = req.query;

      console.log(`[WB_STATISTICS_CONTROLLER] Запрос на получение отфильтрованных остатков для кабинета ${cabinetId}`);

      // Получаем кабинет пользователя
      const wbCabinet = await WbCabinet.findOne({ 
        _id: cabinetId, 
        user: userId 
      }).select('+token');

      if (!wbCabinet) {
        return res.status(404).json({ 
          message: 'WB кабинет не найден или у вас нет прав на его использование' 
        });
      }

      // Если дата не указана, используем сегодняшнюю
      const queryDateFrom = dateFrom || new Date().toISOString().split('T')[0];

      // Получаем отфильтрованные остатки
      const stocksData = await wbStatisticsService.getFilteredStocks(
        wbCabinet.token,
        queryDateFrom,
        filters
      );

      res.json({
        message: 'Отфильтрованные остатки FBY получены успешно',
        cabinetId: wbCabinet._id,
        cabinetName: wbCabinet.name,
        dateFrom: queryDateFrom,
        filters,
        totalRecords: stocksData.length,
        data: stocksData
      });

    } catch (error) {
      console.error('[WB_STATISTICS_CONTROLLER] Ошибка при получении отфильтрованных остатков:', error.message);
      res.status(400).json({ 
        message: 'Ошибка при получении отфильтрованных остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Получить статистику остатков FBY
 * @route GET /api/wb-statistics/stats
 * @access Private
 */
exports.getStocksStats = async (req, res) => {
    try {
      const userId = req.user._id;
      const Product = require('../models/Product');

      console.log(`[WB_STATISTICS_CONTROLLER] Запрос статистики остатков FBY для пользователя ${userId}`);

      // Получаем статистику по остаткам FBY
      const stats = await Product.aggregate([
        {
          $match: { 
            user: userId,
            'sizes.stockFBY': { $exists: true }
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
                $cond: [{ $gt: ['$sizes.stockFBY', 0] }, 1, 0]
              }
            },
            totalStockQuantity: { $sum: '$sizes.stockFBY' },
            avgStockQuantity: { $avg: '$sizes.stockFBY' },
            maxStockQuantity: { $max: '$sizes.stockFBY' },
            minStockQuantity: { $min: '$sizes.stockFBY' }
          }
        }
      ]);

      // Получаем статистику по кабинетам
      const cabinetStats = await Product.aggregate([
        {
          $match: { 
            user: userId,
            'sizes.stockFBY': { $exists: true }
          }
        },
        {
          $unwind: '$sizes'
        },
        {
          $group: {
            _id: '$wbCabinet',
            totalProducts: { $sum: 1 },
            totalWithStock: {
              $sum: {
                $cond: [{ $gt: ['$sizes.stockFBY', 0] }, 1, 0]
              }
            },
            totalStockQuantity: { $sum: '$sizes.stockFBY' }
          }
        },
        {
          $lookup: {
            from: 'wbcabinets',
            localField: '_id',
            foreignField: '_id',
            as: 'cabinet'
          }
        },
        {
          $unwind: '$cabinet'
        },
        {
          $project: {
            cabinetId: '$_id',
            cabinetName: '$cabinet.name',
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
        byCabinet: cabinetStats
      };

      res.json(result);

    } catch (error) {
      console.error('[WB_STATISTICS_CONTROLLER] Ошибка при получении статистики остатков:', error.message);
      res.status(500).json({ 
        message: 'Ошибка сервера при получении статистики остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Тестовый метод для проверки Statistics API
 * @route GET /api/wb-statistics/test/:cabinetId
 * @access Private
 */
exports.testStatisticsApi = async (req, res) => {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;
      const { dateFrom } = req.query;

      console.log(`[WB_STATISTICS_CONTROLLER] Тестовый запрос Statistics API для кабинета ${cabinetId}`);

      // Получаем кабинет пользователя
      const wbCabinet = await WbCabinet.findOne({ 
        _id: cabinetId, 
        user: userId 
      }).select('+token');

      if (!wbCabinet) {
        return res.status(404).json({ 
          message: 'WB кабинет не найден или у вас нет прав на его использование' 
        });
      }

      // Если дата не указана, используем сегодняшнюю
      const queryDateFrom = dateFrom || new Date().toISOString().split('T')[0];

      // Тестируем получение остатков (только первые 10 записей)
      const stocksData = await wbStatisticsService.getFilteredStocks(
        wbCabinet.token,
        queryDateFrom,
        {}
      );

      res.json({
        message: 'Тест Statistics API прошел успешно',
        cabinetId: wbCabinet._id,
        cabinetName: wbCabinet.name,
        dateFrom: queryDateFrom,
        totalRecords: stocksData.length,
        sampleData: stocksData.slice(0, 10), // Показываем только первые 10 записей
        note: 'Показаны первые 10 записей. Используйте полное обновление для получения всех данных.'
      });

    } catch (error) {
      console.error('[WB_STATISTICS_CONTROLLER] Ошибка при тестировании Statistics API:', error.message);
      res.status(400).json({ 
        message: 'Ошибка при тестировании Statistics API', 
        error: error.message 
      });
    }
  };
