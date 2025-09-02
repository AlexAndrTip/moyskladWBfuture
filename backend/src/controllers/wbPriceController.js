const wbPriceService = require('../services/wbPriceService');

class WbPriceController {
  constructor() {
    // Привязываем методы к экземпляру класса
    this.getWbPrices = this.getWbPrices.bind(this);
    this.getLastUpdateStatus = this.getLastUpdateStatus.bind(this);
    this.updatePricesForCabinet = this.updatePricesForCabinet.bind(this);
    this.testGetAllGoods = this.testGetAllGoods.bind(this);
    this.testUpdateProduct = this.testUpdateProduct.bind(this);
    this.testToken = this.testToken.bind(this);
  }

  // Получение цен с WB API для списка товаров
  async getWbPrices(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      console.log('🚀 Начало обновления цен с WB API...');
      
      const result = await wbPriceService.getPricesForProducts(limit, offset);
      
      res.json({
        success: true,
        message: 'Обновление цен завершено',
        data: result
      });

    } catch (error) {
      console.error('❌ Ошибка в getWbPrices:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при получении цен с WB API',
        error: error.message 
      });
    }
  }

  // Получение статуса последнего обновления цен
  async getLastUpdateStatus(req, res) {
    try {
      const status = await wbPriceService.getUpdateStatus();
      
      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('❌ Ошибка в getLastUpdateStatus:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при получении статуса обновления',
        error: error.message 
      });
    }
  }

  // Обновление цен для конкретного WB кабинета
  async updatePricesForCabinet(req, res) {
    try {
      const { cabinetId } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      console.log(`🚀 Обновление цен для WB кабинета: ${cabinetId}`);
      
      const result = await wbPriceService.updatePricesForCabinetById(cabinetId, limit, offset);
      
      res.json({
        success: true,
        message: 'Обновление цен для кабинета завершено',
        data: result
      });

    } catch (error) {
      console.error('❌ Ошибка в updatePricesForCabinet:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при обновлении цен для кабинета',
        error: error.message 
      });
    }
  }

  // Тестирование получения всех товаров с WB API
  async testGetAllGoods(req, res) {
    try {
      const { cabinetId } = req.params;
      const { maxPages = 3 } = req.query; // По умолчанию максимум 3 страницы для теста
      
      console.log(`🧪 Тестирование получения всех товаров для WB кабинета: ${cabinetId}`);
      
      // Находим кабинет
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findById(cabinetId).select('+token');
      
      if (!cabinet) {
        return res.status(404).json({
          success: false,
          message: 'WB кабинет не найден'
        });
      }

      if (!cabinet.token) {
        return res.status(400).json({
          success: false,
          message: 'Для кабинета не установлен токен'
        });
      }

      // Получаем все товары с WB API
      const allGoods = await wbPriceService.getAllWbGoods(cabinet.token, parseInt(maxPages));
      
      res.json({
        success: true,
        message: 'Тестирование завершено',
        data: {
          cabinetName: cabinet.name,
          totalGoods: allGoods.length,
          goods: allGoods.slice(0, 10), // Показываем только первые 10 товаров
          sampleGoods: allGoods.slice(0, 3) // Детально показываем первые 3
        }
      });

    } catch (error) {
      console.error('❌ Ошибка в testGetAllGoods:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при тестировании получения товаров',
        error: error.message 
      });
    }
  }

  // Тестирование обновления цен для конкретного товара
  async testUpdateProduct(req, res) {
    try {
      const { cabinetId, nmID } = req.params;
      
      console.log(`🧪 Тестирование обновления цен для товара nmID: ${nmID} в кабинете: ${cabinetId}`);
      
      // Находим кабинет
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findById(cabinetId).select('+token');
      
      if (!cabinet) {
        return res.status(404).json({
          success: false,
          message: 'WB кабинет не найден'
        });
      }

      if (!cabinet.token) {
        return res.status(400).json({
          success: false,
          message: 'Для кабинета не установлен токен'
        });
      }

      // Находим товар в БД
      const Product = require('../models/Product');
      const product = await Product.findOne({ nmID: parseInt(nmID) });
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Товар с nmID ${nmID} не найден в БД`
        });
      }

      console.log(`📦 Найден товар: ${product.title || product.nmID}`);

      // Получаем все товары с WB API (только первую страницу для теста)
      const allGoods = await wbPriceService.getAllWbGoods(cabinet.token, 1);
      
      // Фильтруем по нужному nmID
      const targetGood = allGoods.find(good => good.nmID === parseInt(nmID));
      
      if (!targetGood) {
        return res.status(404).json({
          success: false,
          message: `Товар с nmID ${nmID} не найден в WB API`,
          data: {
            cabinetName: cabinet.name,
            productTitle: product.title || product.nmID,
            availableNmIDs: allGoods.slice(0, 20).map(g => g.nmID)
          }
        });
      }

      console.log(`✅ Товар найден в WB API, размеров: ${targetGood.sizes.length}`);

      // Обновляем цены для этого товара
      const updateResult = await wbPriceService.updateProductPrices([targetGood]);
      
      res.json({
        success: true,
        message: 'Тестирование обновления цен завершено',
        data: {
          cabinetName: cabinet.name,
          productTitle: product.title || product.nmID,
          productNmID: nmID,
          wbGood: {
            nmID: targetGood.nmID,
            sizes: targetGood.sizes.map(s => ({
              sizeID: s.sizeID,
              price: s.price,
              discountedPrice: s.discountedPrice,
              clubDiscountedPrice: s.clubDiscountedPrice
            }))
          },
          updateResult
        }
      });

    } catch (error) {
      console.error('❌ Ошибка в testUpdateProduct:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при тестировании обновления цен',
        error: error.message 
      });
    }
  }

  // Тестирование токена и получения информации о кабинете
  async testToken(req, res) {
    try {
      const { cabinetId } = req.params;
      
      console.log(`🔑 Тестирование токена для кабинета: ${cabinetId}`);
      
      // Находим кабинет
      const WbCabinet = require('../models/WbCabinet');
      const cabinet = await WbCabinet.findById(cabinetId).select('+token');
      
      if (!cabinet) {
        return res.status(404).json({
          success: false,
          message: 'WB кабинет не найден'
        });
      }

      if (!cabinet.token) {
        return res.status(400).json({
          success: false,
          message: 'Для кабинета не установлен токен'
        });
      }

      console.log(`📋 Информация о кабинете:`);
      console.log(`   - Название: ${cabinet.name}`);
      console.log(`   - ID: ${cabinet._id}`);
      console.log(`   - Токен: ${cabinet.token.substring(0, 50)}...`);
      console.log(`   - Длина токена: ${cabinet.token.length}`);

      // Тестируем простой запрос к WB API
      const axios = require('axios');
      const testUrl = 'https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter';
      
      console.log(`🧪 Тестовый запрос к WB API:`);
      console.log(`   - URL: ${testUrl}`);
      console.log(`   - Параметры: limit=1, offset=0`);
      
      const response = await axios.get(testUrl, {
        params: {
          limit: 1,
          offset: 0
        },
        headers: {
          'Authorization': `Bearer ${cabinet.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ Ответ от WB API:`);
      console.log(`   - Статус: ${response.status}`);
      console.log(`   - Заголовки:`, response.headers);
      console.log(`   - Данные:`, JSON.stringify(response.data, null, 2));

      res.json({
        success: true,
        message: 'Тестирование токена завершено',
        data: {
          cabinetName: cabinet.name,
          cabinetId: cabinet._id,
          tokenPreview: cabinet.token.substring(0, 50) + '...',
          tokenLength: cabinet.token.length,
          apiResponse: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data
          }
        }
      });

    } catch (error) {
      console.error('❌ Ошибка в testToken:', error);
      
      let errorDetails = {
        message: error.message
      };
      
      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.statusText = error.response.statusText;
        errorDetails.data = error.response.data;
        errorDetails.headers = error.response.headers;
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при тестировании токена',
        error: errorDetails
      });
    }
  }
}

module.exports = new WbPriceController(); 