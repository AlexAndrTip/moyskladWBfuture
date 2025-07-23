const Uslugi = require('../models/Uslugi');
const StatRashodov = require('../models/StatRashodov');
const IntegrationLink = require('../models/IntegrationLink');
const { processWBServices } = require('../services/moySkladServiceService');
const { processWBExpenseItems } = require('../services/moySkladExpenseItemService');

// Список услуг WB
const WB_SERVICES = [
  'Логистика WB',
  'Платная приемка WB',
  'Прочие удержания WB',
  'Хранение WB',
  'Штрафы WB'
];

// Список статей расходов WB
const WB_EXPENSE_ITEMS = [
  'Логистика WB',
  'Платная приемка WB',
  'Прочие удержания WB',
  'Хранение WB',
  'Штрафы WB'
];

// Синхронизация услуг
const syncUslugi = async (req, res) => {
  try {
    const { integrationLinkId } = req.body;
    const userId = req.user.id;

    // Проверяем существование интеграционной связки с populate для получения токена
    const integrationLink = await IntegrationLink.findById(integrationLinkId)
      .populate('storage', 'token')
      .populate('wbCabinet', 'name');
      
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }

    // Проверяем, что связка принадлежит пользователю
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }

    // Получаем токен МойСклад
    const moySkladToken = integrationLink.storage.token;
    if (!moySkladToken) {
      return res.status(400).json({ message: 'Токен МойСклад не найден для выбранного склада' });
    }

    // Обрабатываем услуги в МойСклад: находим или создаем
    console.log('Начинаем обработку услуг WB в МойСклад...');
    const moySkladResults = await processWBServices(moySkladToken, WB_SERVICES);
    
    // Удаляем существующие записи для данной интеграции
    await Uslugi.deleteMany({ 
      user: userId, 
      integrationLink: integrationLinkId 
    });

    // Создаем новые записи с полученными href
    const uslugiRecords = WB_SERVICES.map(serviceName => {
      const moySkladResult = moySkladResults.find(r => r.name === serviceName);
      return {
        user: userId,
        integrationLink: integrationLinkId,
        name: serviceName,
        ms_href: moySkladResult?.success ? moySkladResult.href : null,
        type: 'service',
      };
    });

    const createdUslugi = await Uslugi.insertMany(uslugiRecords);

    // Подготавливаем детальную информацию для ответа
    const detailedResults = createdUslugi.map(usluga => {
      const moySkladResult = moySkladResults.find(r => r.name === usluga.name);
      return {
        _id: usluga._id,
        name: usluga.name,
        ms_href: usluga.ms_href,
        moySkladStatus: moySkladResult?.success ? 'success' : 'error',
        moySkladMessage: moySkladResult?.message || 'Не удалось обработать в МойСклад',
        wasCreated: moySkladResult?.wasCreated || false
      };
    });

    const successCount = detailedResults.filter(r => r.moySkladStatus === 'success').length;
    const createdCount = detailedResults.filter(r => r.wasCreated).length;

    res.status(200).json({
      message: `Услуги успешно синхронизированы. Обработано: ${successCount}/${WB_SERVICES.length}, Создано новых: ${createdCount}`,
      count: createdUslugi.length,
      services: detailedResults,
      summary: {
        total: WB_SERVICES.length,
        successful: successCount,
        created: createdCount,
        failed: WB_SERVICES.length - successCount
      }
    });

  } catch (error) {
    console.error('Ошибка синхронизации услуг:', error);
    res.status(500).json({ message: 'Ошибка сервера при синхронизации услуг' });
  }
};

// Синхронизация статей расходов
const syncStatRashodov = async (req, res) => {
  try {
    const { integrationLinkId } = req.body;
    const userId = req.user.id;

    // Проверяем существование интеграционной связки с populate для получения токена
    const integrationLink = await IntegrationLink.findById(integrationLinkId)
      .populate('storage', 'token')
      .populate('wbCabinet', 'name');
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }
    const moySkladToken = integrationLink.storage.token;
    if (!moySkladToken) {
      return res.status(400).json({ message: 'Токен МойСклад не найден для выбранного склада' });
    }

    // Обрабатываем статьи расходов в МойСклад: находим или создаем
    console.log('Начинаем обработку статей расходов WB в МойСклад...');
    const moySkladResults = await processWBExpenseItems(moySkladToken, WB_EXPENSE_ITEMS);

    // Удаляем существующие записи для данной интеграции
    await StatRashodov.deleteMany({ 
      user: userId, 
      integrationLink: integrationLinkId 
    });

    // Создаем новые записи с полученными href
    const statRashodovRecords = WB_EXPENSE_ITEMS.map(itemName => {
      const moySkladResult = moySkladResults.find(r => r.name === itemName);
      return {
        user: userId,
        integrationLink: integrationLinkId,
        name: itemName,
        ms_href: moySkladResult?.success ? moySkladResult.href : null,
        type: 'expenseitem',
      };
    });

    const createdStatRashodov = await StatRashodov.insertMany(statRashodovRecords);

    // Подготавливаем детальную информацию для ответа
    const detailedResults = createdStatRashodov.map(item => {
      const moySkladResult = moySkladResults.find(r => r.name === item.name);
      return {
        _id: item._id,
        name: item.name,
        ms_href: item.ms_href,
        moySkladStatus: moySkladResult?.success ? 'success' : 'error',
        moySkladMessage: moySkladResult?.message || 'Не удалось обработать в МойСклад',
        wasCreated: moySkladResult?.wasCreated || false
      };
    });

    const successCount = detailedResults.filter(r => r.moySkladStatus === 'success').length;
    const createdCount = detailedResults.filter(r => r.wasCreated).length;

    res.status(200).json({
      message: `Статьи расходов успешно синхронизированы. Обработано: ${successCount}/${WB_EXPENSE_ITEMS.length}, Создано новых: ${createdCount}`,
      count: createdStatRashodov.length,
      expenseItems: detailedResults,
      summary: {
        total: WB_EXPENSE_ITEMS.length,
        successful: successCount,
        created: createdCount,
        failed: WB_EXPENSE_ITEMS.length - successCount
      }
    });

  } catch (error) {
    console.error('Ошибка синхронизации статей расходов:', error);
    res.status(500).json({ message: 'Ошибка сервера при синхронизации статей расходов' });
  }
};

// Получение списка услуг для интеграции
const getUslugiByIntegration = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user.id;

    // Проверяем существование интеграционной связки
    const integrationLink = await IntegrationLink.findById(integrationLinkId);
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }

    // Проверяем, что связка принадлежит пользователю
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }

    const uslugi = await Uslugi.find({ 
      user: userId, 
      integrationLink: integrationLinkId 
    }).sort({ name: 1 });

    res.status(200).json(uslugi);

  } catch (error) {
    console.error('Ошибка получения услуг:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении услуг' });
  }
};

// Получение списка статей расходов для интеграции
const getStatRashodovByIntegration = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user.id;

    // Проверяем существование интеграционной связки
    const integrationLink = await IntegrationLink.findById(integrationLinkId);
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }

    // Проверяем, что связка принадлежит пользователю
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }

    const statRashodov = await StatRashodov.find({ 
      user: userId, 
      integrationLink: integrationLinkId 
    }).sort({ name: 1 });

    res.status(200).json(statRashodov);

  } catch (error) {
    console.error('Ошибка получения статей расходов:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении статей расходов' });
  }
};

// Разорвать все связи услуг для интеграции
const unlinkUslugiByIntegration = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user.id;
    // Проверяем существование интеграционной связки
    const integrationLink = await IntegrationLink.findById(integrationLinkId);
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }
    const result = await Uslugi.deleteMany({ user: userId, integrationLink: integrationLinkId });
    res.status(200).json({ message: 'Все связи услуг разорваны', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Ошибка при разрыве связей услуг:', error);
    res.status(500).json({ message: 'Ошибка сервера при разрыве связей услуг' });
  }
};

// Разорвать все связи статей расходов для интеграции
const unlinkStatRashodovByIntegration = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user.id;
    // Проверяем существование интеграционной связки
    const integrationLink = await IntegrationLink.findById(integrationLinkId);
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }
    const result = await StatRashodov.deleteMany({ user: userId, integrationLink: integrationLinkId });
    res.status(200).json({ message: 'Все связи статей расходов разорваны', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Ошибка при разрыве связей статей расходов:', error);
    res.status(500).json({ message: 'Ошибка сервера при разрыве связей статей расходов' });
  }
};

module.exports = {
  syncUslugi,
  syncStatRashodov,
  getUslugiByIntegration,
  getStatRashodovByIntegration,
  unlinkUslugiByIntegration,
  unlinkStatRashodovByIntegration
};
