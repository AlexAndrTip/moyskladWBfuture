const MsPriceUpdateService = require('../services/msPriceUpdateService');
const IntegrationLink = require('../models/IntegrationLink');

class MsPriceController {
  constructor() {
    this.msPriceService = new MsPriceUpdateService();
  }

  /**
   * Обновляет цены МойСклад для всех товаров интеграции
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updatePrices(req, res) {
    try {
      const { integrationId } = req.params;
      
      if (!integrationId) {
        return res.status(400).json({
          success: false,
          message: 'ID интеграции обязателен'
        });
      }

      // Получаем интеграцию и проверяем токен МойСклад
      const integration = await IntegrationLink.findById(integrationId)
        .populate('storage', 'token name')
        .exec();
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Интеграция не найдена'
        });
      }

      if (!integration.storage || !integration.storage.token) {
        return res.status(400).json({
          success: false,
          message: 'Токен МойСклад не настроен для данной интеграции'
        });
      }

      // Запускаем обновление цен
      const result = await this.msPriceService.updateAllPrices(integrationId, integration.storage.token);

      if (result.success) {
        res.json({
          success: true,
          message: 'Обновление цен завершено',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления цен МойСклад:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Обновляет цены для товаров с одним размером
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateSingleSizePrices(req, res) {
    try {
      const { integrationId } = req.params;
      
      if (!integrationId) {
        return res.status(400).json({
          success: false,
          message: 'ID интеграции обязателен'
        });
      }

      // Получаем интеграцию и проверяем токен МойСклад
      const integration = await IntegrationLink.findById(integrationId)
        .populate('storage', 'token name')
        .exec();
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Интеграция не найдена'
        });
      }

      if (!integration.storage || !integration.storage.token) {
        return res.status(400).json({
          success: false,
          message: 'Токен МойСклад не настроен для данной интеграции'
        });
      }

      // Запускаем обновление цен для товаров с одним размером
      const result = await this.msPriceService.updateSingleSizeProductPrices(integrationId, integration.storage.token);

      if (result.success) {
        res.json({
          success: true,
          message: 'Обновление цен для товаров с одним размером завершено',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления цен для товаров с одним размером:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Обновляет цены для товаров с несколькими размерами
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateMultiSizePrices(req, res) {
    try {
      const { integrationId } = req.params;
      
      if (!integrationId) {
        return res.status(400).json({
          success: false,
          message: 'ID интеграции обязателен'
        });
      }

      // Получаем интеграцию и проверяем токен МойСклад
      const integration = await IntegrationLink.findById(integrationId)
        .populate('storage', 'token name')
        .exec();
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Интеграция не найдена'
        });
      }

      if (!integration.storage || !integration.storage.token) {
        return res.status(400).json({
          success: false,
          message: 'Токен МойСклад не настроен для данной интеграции'
        });
      }

      // Запускаем обновление цен для товаров с несколькими размерами
      const result = await this.msPriceService.updateMultiSizeProductPrices(integrationId, integration.storage.token);

      if (result.success) {
        res.json({
          success: true,
          message: 'Обновление цен для товаров с несколькими размерами завершено',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления цен для товаров с несколькими размерами:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Получает статистику по ценам МойСклад
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getPriceStats(req, res) {
    try {
      const { integrationId } = req.params;
      
      if (!integrationId) {
        return res.status(400).json({
          success: false,
          message: 'ID интеграции обязателен'
        });
      }

      // Получаем статистику
      const stats = await this.msPriceService.getPriceStats(integrationId);

      if (stats.success) {
        res.json({
          success: true,
          data: stats
        });
      } else {
        res.status(500).json({
          success: false,
          message: stats.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере получения статистики цен:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Обновляет цены для конкретного товара
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateProductPrices(req, res) {
    try {
      const { integrationId, productId } = req.params;
      
      if (!integrationId || !productId) {
        return res.status(400).json({
          success: false,
          message: 'ID интеграции и ID товара обязательны'
        });
      }

      // Получаем интеграцию и проверяем токен МойСклад
      const integration = await IntegrationLink.findById(integrationId)
        .populate('storage', 'token name')
        .exec();
      
      if (!integration) {
        return res.status(404).json({
          success: false,
          message: 'Интеграция не найдена'
        });
      }

      if (!integration.storage || !integration.storage.token) {
        return res.status(400).json({
          success: false,
          message: 'Токен МойСклад не настроен для данной интеграции'
        });
      }

      // Получаем товар
      const Product = require('../models/Product');
      const product = await Product.findById(productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Товар не найден'
        });
      }

      // Проверяем, что товар принадлежит данной интеграции
      if (product.integrationLink.toString() !== integrationId) {
        return res.status(403).json({
          success: false,
          message: 'Товар не принадлежит данной интеграции'
        });
      }

      // Обновляем цены для конкретного товара
      const result = await this.msPriceService.updateProductPrices(product, integration.storage.token);

      if (result.success) {
        res.json({
          success: true,
          message: 'Цены товара обновлены',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления цен товара:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }
}

module.exports = MsPriceController;
