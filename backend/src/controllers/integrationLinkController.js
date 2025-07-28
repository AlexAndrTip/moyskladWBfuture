// backend/src/controllers/integrationLinkController.js
const IntegrationLink = require('../models/IntegrationLink');
const WbCabinet = require('../models/WbCabinet'); // Для проверки существования кабинета
const Storage = require('../models/Storage');     // Для проверки существования склада

// @desc    Получить все связки для текущего пользователя
// @route   GET /api/integration-links
// @access  Private
exports.getIntegrationLinks = async (req, res) => {
  try {
    const links = await IntegrationLink.find({ user: req.user._id })
      .populate('wbCabinet', 'name') // Получаем имя кабинета
      .populate('storage', 'name');  // Получаем имя склада

    res.json(links);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении связок', error: error.message });
  }
};

// @desc    Создать новую связку (подключить склад к кабинету)
// @route   POST /api/integration-links
// @access  Private
exports.createIntegrationLink = async (req, res) => {
  const { wbCabinetId, storageId } = req.body;
  const userId = req.user._id;

  if (!wbCabinetId || !storageId) {
    return res.status(400).json({ message: 'Пожалуйста, выберите WB Кабинет и Склад.' });
  }

  try {
    // Проверяем, что WB Кабинет и Склад действительно принадлежат текущему пользователю
    const wbCabinet = await WbCabinet.findOne({ _id: wbCabinetId, user: userId });
    const storage = await Storage.findOne({ _id: storageId, user: userId });

    if (!wbCabinet) {
      return res.status(404).json({ message: 'Выбранный WB Кабинет не найден или не принадлежит вам.' });
    }
    if (!storage) {
      return res.status(404).json({ message: 'Выбранный Склад не найден или не принадлежит вам.' });
    }

    // Проверяем, не существует ли уже интеграции с этим WB Кабинетом для пользователя
const existingLink = await IntegrationLink.findOne({ wbCabinet: wbCabinetId, user: userId });
if (existingLink) {
  return res.status(400).json({ message: 'Для данного WB Кабинета уже создана интеграция.' });
}

    const newLink = await IntegrationLink.create({
      wbCabinet: wbCabinetId,
      storage: storageId,
      user: userId,
    });

    // Возвращаем полную связку с заполненными именами для обновления UI
    const populatedLink = await IntegrationLink.findById(newLink._id)
      .populate('wbCabinet', 'name')
      .populate('storage', 'name');

    res.status(201).json(populatedLink);

  } catch (error) {
    console.error("Error creating integration link:", error);
    res.status(500).json({ message: 'Ошибка сервера при создании связки', error: error.message });
  }
};

// @desc    Удалить связку (отключить склад от кабинета)
// @route   DELETE /api/integration-links/:id
// @access  Private
exports.deleteIntegrationLink = async (req, res) => {
  const linkId = req.params.id;
  const userId = req.user._id;

  try {
    const link = await IntegrationLink.findOne({ _id: linkId, user: userId });

    if (!link) {
      return res.status(404).json({ message: 'Связка не найдена или у вас нет прав на ее удаление.' });
    }

    // Каскадное удаление связанных данных
    const Product = require('../models/Product');
    const OrganizationLink = require('../models/OrganizationLink');
    const StatRashodov = require('../models/StatRashodov');
    const Uslugi = require('../models/Uslugi');
    const WbIncome = require('../models/WbIncome');

    await Promise.all([
      Product.deleteMany({ integrationLink: linkId, user: userId }),
      OrganizationLink.deleteMany({ integrationLink: linkId, user: userId }),
      StatRashodov.deleteMany({ integrationLink: linkId, user: userId }),
      Uslugi.deleteMany({ integrationLink: linkId, user: userId }),
      WbIncome.deleteMany({ integrationLink: linkId, user: userId })
    ]);

    await link.deleteOne();
    res.json({ message: 'Связка и все связанные данные успешно удалены' });
  } catch (error) {
    console.error("Error deleting integration link:", error);
    res.status(500).json({ message: 'Ошибка сервера при удалении связки', error: error.message });
  }
};

// @desc    Проверить валидность токена WB API для интеграции
// @route   GET /api/integration-links/:id/check-token
// @access  Private
exports.checkWbToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    
    // Находим интеграцию
    const integrationLink = await IntegrationLink.findOne({ _id: id, user: userId })
      .populate('wbCabinet', 'token name');
    
    if (!integrationLink) {
      return res.status(404).json({ 
        success: false,
        message: 'Интеграция не найдена' 
      });
    }
    
    const wbToken = integrationLink.wbCabinet?.token;
    if (!wbToken) {
      return res.status(400).json({ 
        success: false,
        message: 'Токен WB не найден' 
      });
    }
    
    // Проверяем токен, делая простой запрос к WB API
    const axios = require('axios');
    const { WB_CONTENT_API_URL } = require('../config/constants');
    
    try {
      const response = await axios.post(WB_CONTENT_API_URL, {
        settings: {
          cursor: { limit: 1 },
          filter: { withPhoto: -1 }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${wbToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 секунд таймаут
      });
      
      // Если запрос прошел успешно, токен валиден
      res.json({
        success: true,
        tokenValid: true,
        message: 'Токен WB API действителен'
      });
      
    } catch (wbError) {
      console.error('[INTEGRATION_CONTROLLER] Ошибка WB API:', wbError.response?.data || wbError.message);
      
      // Проверяем, является ли ошибка связанной с токеном
      if (wbError.response?.status === 401) {
        // Возвращаем 200 OK с информацией о невалидном токене
        // НЕ 401, чтобы не разрывать сессию пользователя
        res.status(200).json({
          success: true,
          tokenValid: false,
          message: 'Токен WB API недействителен или просрочен',
          organizationName: integrationLink.wbCabinet?.name || 'неизвестной организации'
        });
      } else {
        // Другие ошибки (сеть, таймаут и т.д.) считаем токен валидным
        res.status(200).json({
          success: true,
          tokenValid: true,
          message: 'Токен WB API действителен (ошибка сети не связана с токеном)'
        });
      }
    }
    
  } catch (error) {
    console.error('[INTEGRATION_CONTROLLER] Ошибка проверки токена:', error);
    // Возвращаем 200 OK даже при ошибке, чтобы не разрывать сессию
    res.status(200).json({ 
      success: false,
      tokenValid: false,
      message: 'Ошибка сервера при проверке токена' 
    });
  }
};
