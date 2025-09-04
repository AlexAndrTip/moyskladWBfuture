const MsCostUpdateService = require('../services/msCostUpdateService');
const IntegrationLink = require('../models/IntegrationLink');

class MsCostController {
  constructor() {
    this.msCostService = new MsCostUpdateService();
  }

  /**
   * Обновляет себестоимость МойСклад для всех товаров интеграции
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateCosts(req, res) {
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

      // Запускаем обновление себестоимости
      const result = await this.msCostService.updateAllCosts(integrationId, integration.storage.token);

      if (result.success) {
        res.json({
          success: true,
          message: 'Обновление себестоимости завершено',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления себестоимости МойСклад:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Обновляет себестоимость для конкретного товара
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateProductCosts(req, res) {
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

      // Обновляем себестоимость для конкретного товара
      const result = await this.msCostService.updateProductCosts(product, integration.storage.token);

      if (result.success) {
        res.json({
          success: true,
          message: 'Себестоимость товара обновлена',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления себестоимости товара:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Обновляет себестоимость МойСклад для всех интеграций
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async updateAllIntegrationsCosts(req, res) {
    try {
      console.log('Запрос на обновление себестоимости для всех интеграций МойСклад');
      
      // Запускаем обновление себестоимости для всех интеграций
      const result = await this.msCostService.updateAllIntegrationsCosts();

      if (result.success) {
        res.json({
          success: true,
          message: 'Обновление себестоимости для всех интеграций завершено',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Ошибка в контроллере обновления себестоимости всех интеграций:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }

  /**
   * Получает статистику по себестоимости МойСклад
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCostStats(req, res) {
    try {
      const { integrationId } = req.params;
      
      if (!integrationId) {
        return res.status(400).json({
          success: false,
          message: 'ID интеграции обязателен'
        });
      }

      // Получаем статистику
      const stats = await this.msCostService.getCostStats(integrationId);

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
      console.error('Ошибка в контроллере получения статистики себестоимости:', error);
      res.status(500).json({
        success: false,
        message: `Внутренняя ошибка сервера: ${error.message}`
      });
    }
  }
}

module.exports = MsCostController;
