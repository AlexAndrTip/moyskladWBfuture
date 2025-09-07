const wbRemainsService = require('../services/wbRemainsService');
const WbCabinet = require('../models/WbCabinet');

/**
 * Обновить остатки FBY для всех кабинетов пользователя
 * @route POST /api/wb-remains/update-all
 * @access Private
 */
exports.updateAllRemains = async (req, res) => {
    try {
      const userId = req.user._id;
      
      console.log(`[WB_REMAINS_CONTROLLER] Запрос на обновление остатков FBY для пользователя ${userId}`);

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
          console.log(`[WB_REMAINS_CONTROLLER] Обновляем остатки для кабинета: ${cabinet.name}`);
          
          const result = await wbRemainsService.updateFbyRemains(
            cabinet.token, 
            cabinet._id, 
            userId
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
          console.error(`[WB_REMAINS_CONTROLLER] Ошибка при обновлении кабинета ${cabinet.name}:`, error.message);
          
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
        message: `Обновление остатков FBY завершено. Обработано кабинетов: ${wbCabinets.length}`,
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
      console.error('[WB_REMAINS_CONTROLLER] Ошибка при обновлении остатков FBY:', error.message);
      res.status(500).json({ 
        message: 'Ошибка сервера при обновлении остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Обновить остатки FBY для конкретного кабинета
 * @route POST /api/wb-remains/update/:cabinetId
 * @access Private
 */
exports.updateCabinetRemains = async (req, res) => {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;

      console.log(`[WB_REMAINS_CONTROLLER] Запрос на обновление остатков FBY для кабинета ${cabinetId}`);

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
      const result = await wbRemainsService.updateFbyRemains(
        wbCabinet.token, 
        wbCabinet._id, 
        userId
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
      console.error('[WB_REMAINS_CONTROLLER] Ошибка при обновлении остатков кабинета:', error.message);
      res.status(500).json({ 
        message: 'Ошибка сервера при обновлении остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Получить статистику остатков FBY
 * @route GET /api/wb-remains/stats
 * @access Private
 */
exports.getRemainsStats = async (req, res) => {
    try {
      const userId = req.user._id;
      const Product = require('../models/Product');

      console.log(`[WB_REMAINS_CONTROLLER] Запрос статистики остатков FBY для пользователя ${userId}`);

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
      console.error('[WB_REMAINS_CONTROLLER] Ошибка при получении статистики остатков:', error.message);
      res.status(500).json({ 
        message: 'Ошибка сервера при получении статистики остатков FBY', 
        error: error.message 
      });
    }
  }

/**
 * Тестовый метод для проверки API остатков
 * @route GET /api/wb-remains/test/:cabinetId
 * @access Private
 */
exports.testRemainsApi = async (req, res) => {
    try {
      const userId = req.user._id;
      const cabinetId = req.params.cabinetId;

      console.log(`[WB_REMAINS_CONTROLLER] Тестовый запрос API остатков для кабинета ${cabinetId}`);

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

      // Тестируем только создание отчета
      const taskId = await wbRemainsService.createRemainsReport(wbCabinet.token);

      res.json({
        message: 'Тест API остатков прошел успешно',
        cabinetId: wbCabinet._id,
        cabinetName: wbCabinet.name,
        taskId,
        note: 'Отчет создан, но не скачан. Используйте полное обновление для получения данных.'
      });

    } catch (error) {
      console.error('[WB_REMAINS_CONTROLLER] Ошибка при тестировании API остатков:', error.message);
      res.status(400).json({ 
        message: 'Ошибка при тестировании API остатков', 
        error: error.message 
      });
    }
  };
