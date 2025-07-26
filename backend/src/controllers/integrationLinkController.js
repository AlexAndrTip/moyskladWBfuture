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
