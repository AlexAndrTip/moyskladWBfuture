const IntegrationLink = require('../models/IntegrationLink');
const WbCabinet = require('../models/WbCabinet');
const { getWbIncomes } = require('../services/wbIncomesService');
const WbIncome = require('../models/WbIncome');
const OrganizationLink = require('../models/OrganizationLink');
const axios = require('axios');
const Product = require('../models/Product');

// Получить поставки по integrationLinkId (только из БД)
exports.getPostavki = async (req, res) => {
  console.log('[BACKEND] getPostavki called, integrationLinkId:', req.params.integrationLinkId, 'user:', req.user?.id);
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user.id;
    
    // Проверяем существование integrationLink
    const integrationLink = await IntegrationLink.findById(integrationLinkId)
      .populate('wbCabinet', 'name')
      .populate('storage', 'name');
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }
    
    // Получаем поставки из БД с учетом фильтров
    const filter = { integrationLink: integrationLinkId, user: userId };
    const { search, dateFrom, dateTo, status, exported, page = 1, limit = 20 } = req.query;
    
    if (search) {
      filter.$or = [
        { barcode: { $regex: search, $options: 'i' } },
        { supplierArticle: { $regex: search, $options: 'i' } }
      ];
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    if (status) filter.status = status;
    if (exported === 'true') filter.ms_href = { $ne: null };
    if (exported === 'false') filter.ms_href = null;
    
    // Подсчитываем общее количество записей для пагинации
    const totalPostavki = await WbIncome.countDocuments(filter);
    
    // Вычисляем параметры пагинации
    const currentPage = parseInt(page);
    const limitPerPage = parseInt(limit);
    const totalPages = Math.ceil(totalPostavki / limitPerPage);
    const skip = (currentPage - 1) * limitPerPage;
    
    // Получаем поставки с пагинацией
    const incomes = await WbIncome.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(limitPerPage);
    
    res.status(200).json({
      data: incomes,
      summary: {
        totalInDB: totalPostavki
      },
      currentPage,
      totalPages,
      totalPostavki,
      limitPerPage
    });
  } catch (error) {
    console.error('Ошибка получения поставок из БД:', error);
    res.status(500).json({ 
      message: 'Ошибка сервера при получении поставок',
      details: error.message 
    });
  }
};

// POST /api/postavki/:integrationLinkId/demand/:incomeId
exports.createDemand = async (req, res) => {
  try {
    const { integrationLinkId, incomeId } = req.params;
    const userId = req.user.id;
    // Находим integrationLink и storage (для токена МС)
    const integrationLink = await IntegrationLink.findById(integrationLinkId)
      .populate('storage', 'token')
      .populate('wbCabinet', 'name');
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }
    const msToken = integrationLink.storage.token;
    if (!msToken) {
      return res.status(400).json({ message: 'Токен МойСклад не найден' });
    }
    // Находим organizationLink по integrationLink
    const orgLink = await OrganizationLink.findOne({ integrationLink: integrationLinkId });
    if (!orgLink || !orgLink.moyskladOrganizationHref || !orgLink.moyskladCounterpartyHref || !orgLink.moyskladStoreHref) {
      return res.status(400).json({ message: 'Не найдены все необходимые href в organizationlinks' });
    }
    // Находим поставку
    const income = await WbIncome.findOne({ _id: incomeId, integrationLink: integrationLinkId, user: userId });
    if (!income) {
      return res.status(404).json({ message: 'Поставка не найдена' });
    }
    // Проверяем, есть ли уже отгрузка с таким code в МС
    const filterUrl = `https://api.moysklad.ru/api/remap/1.2/entity/demand?filter=code=${income._id}`;
    const msGetResp = await axios.get(filterUrl, {
      headers: {
        'Authorization': `Bearer ${msToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 30000
    });
    if (msGetResp.data.rows && msGetResp.data.rows.length > 0) {
      // Уже есть отгрузка, просто обновляем ms_href
      const ms_href = msGetResp.data.rows[0].meta.href;
      await WbIncome.updateOne({ _id: income._id }, { $set: { ms_href } });
      return res.status(200).json({ message: 'Отгрузка уже существует в МойСклад', ms_href });
    }
    // Формируем позиции для отгрузки
    let positions = [];
    // Найти product по barcode (ищем по sizes.skus)
    const product = await Product.findOne({ 'sizes.skus': income.barcode });
    if (!product) {
      return res.status(400).json({ message: 'Товар не найден' });
    }

    // Пытаемся найти размер с данным баркодом и его ms_href
    const sizeEntry = product.sizes.find(s => Array.isArray(s.skus) && s.skus.includes(income.barcode));
    let hrefToUse = null;

    if (sizeEntry && sizeEntry.ms_href) {
      hrefToUse = sizeEntry.ms_href;
    } else if (product.ms_href_general) {
      hrefToUse = product.ms_href_general;
    }

    if (!hrefToUse) {
      return res.status(400).json({ message: 'Не найдено ms_href для товара. Сначала выгрузите товар в МС.' });
    }

    console.log(`[POSTAVKI] href для Demand: ${hrefToUse} | nmID: ${product.nmID}`);
    positions.push({
      quantity: income.quantity,
      assortment: {
        meta: {
          href: hrefToUse,
          type: hrefToUse.includes('/bundle/') ? 'bundle' : 'product',
          mediaType: 'application/json'
        }
      }
    });
    // Преобразуем дату в формат 'YYYY-MM-DD HH:mm:ss'
    let momentStr = income.date;
    if (momentStr.includes('T')) {
      momentStr = momentStr.replace('T', ' ');
    }
    if (momentStr.endsWith('Z')) {
      momentStr = momentStr.slice(0, -1);
    }
    const payload = {
      organization: { meta: { href: orgLink.moyskladOrganizationHref, type: 'organization', mediaType: 'application/json' } },
      agent: { meta: { href: orgLink.moyskladCounterpartyHref, type: 'counterparty', mediaType: 'application/json' } },
      store: { meta: { href: orgLink.moyskladStoreHref, type: 'store', mediaType: 'application/json' } },
      moment: momentStr,
      code: income._id.toString(),
      positions // <-- снова передаём позиции
    };
    // Отправляем запрос в МойСклад
    const msResp = await axios.post('https://api.moysklad.ru/api/remap/1.2/entity/demand', payload, {
      headers: {
        'Authorization': `Bearer ${msToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 30000
    });
    const ms_href = msResp.data.meta.href;
    await WbIncome.updateOne({ _id: income._id }, { $set: { ms_href } });
    res.status(200).json({ message: 'Отгрузка создана в МойСклад', ms_href });
  } catch (error) {
    console.error('Ошибка создания отгрузки в МойСклад:', error);
    res.status(500).json({ message: 'Ошибка создания отгрузки в МойСклад', error: error.message });
  }
};

// DELETE /api/postavki/:integrationLinkId/demand/:incomeId
exports.deleteDemandMsHref = async (req, res) => {
  try {
    const { integrationLinkId, incomeId } = req.params;
    const userId = req.user.id;
    const income = await WbIncome.findOne({ _id: incomeId, integrationLink: integrationLinkId, user: userId });
    if (!income) {
      return res.status(404).json({ message: 'Поставка не найдена' });
    }
    await WbIncome.updateOne({ _id: incomeId }, { $set: { ms_href: null } });
    res.status(200).json({ message: 'ms_href удален' });
  } catch (error) {
    console.error('Ошибка удаления ms_href:', error);
    res.status(500).json({ message: 'Ошибка удаления ms_href', error: error.message });
  }
};


exports.getSupplies = async (req, res) => {
  const { search, dateFrom, dateTo, warehouse, status, exported } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { barcode: { $regex: search, $options: 'i' } },
      { article: { $regex: search, $options: 'i' } }
    ];
  }
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }
  if (warehouse) filter.warehouse = warehouse;
  if (status) filter.status = status;
  if (exported === 'true') filter.ms_href = { $ne: null };
  if (exported === 'false') filter.ms_href = null;

  const supplies = await WbIncome.find(filter);
  res.json(supplies);
};

exports.createIntegrationLink = async (req, res) => {
  const { wbCabinet, /* другие поля */ } = req.body;
  const userId = req.user._id;

  // Проверка на уникальность WB-кабинета
  const existingLink = await IntegrationLink.findOne({ wbCabinet: wbCabinet, user: userId });
  if (existingLink) {
    return res.status(400).json({ message: 'Интеграция с этим кабинетом WB уже существует.' });
  }

  // ... остальной код создания интеграции ...
};

// Обновить поставки из WB API
exports.refreshPostavkiFromWB = async (req, res) => {
  console.log('[BACKEND] refreshPostavkiFromWB called, integrationLinkId:', req.params.integrationLinkId, 'user:', req.user?.id);
  try {
    const { integrationLinkId } = req.params;
    const userId = req.user.id;
    
    // Находим integrationLink и populate wbCabinet с токеном
    const integrationLink = await IntegrationLink.findById(integrationLinkId)
      .populate('wbCabinet', 'token name')
      .populate('storage', 'name');
    if (!integrationLink) {
      return res.status(404).json({ message: 'Интеграционная связка не найдена' });
    }
    if (integrationLink.user.toString() !== userId) {
      return res.status(403).json({ message: 'Нет доступа к данной интеграционной связке' });
    }
    
    const wbToken = integrationLink.wbCabinet.token;
    console.log('[WB] wbToken:', JSON.stringify(wbToken));
    if (!wbToken || typeof wbToken !== 'string' || !wbToken.trim()) {
      throw new Error('Токен WB не найден или невалиден');
    }
    
    // Получаем данные поставок из WB
    console.log('[WB] Запрашиваем поставки из WB...');
    const wbIncomes = await getWbIncomes(wbToken);
    console.log(`[WB] Получено ${wbIncomes.length} поставок из WB`);
    
    // Сохраняем поставки в базу данных
    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const income of wbIncomes) {
      try {
        // Проверяем, существует ли уже такая поставка
        const existingIncome = await WbIncome.findOne({
          user: userId,
          integrationLink: integrationLinkId,
          incomeId: income.incomeId,
          warehouseName: income.warehouseName,
          barcode: income.barcode,
          supplierArticle: income.supplierArticle
        });
        
        if (existingIncome) {
          // Обновляем существующую запись
          await WbIncome.updateOne(
            { _id: existingIncome._id },
            {
              $set: {
                quantity: income.quantity,
                status: income.status,
                date: income.date,
              }
            }
          );
          updatedCount++;
        } else {
          // Создаем новую запись
          await WbIncome.create({
            user: userId,
            integrationLink: integrationLinkId,
            incomeId: income.incomeId,
            date: income.date,
            supplierArticle: income.supplierArticle,
            barcode: income.barcode,
            quantity: income.quantity || 0,
            warehouseName: income.warehouseName || '',
            status: income.status || ''
          });
          savedCount++;
        }
      } catch (error) {
        console.error(`[WB] Ошибка при сохранении поставки:`, error);
        errorCount++;
      }
    }
    
    console.log(`[WB] Сохранение завершено: Создано ${savedCount}, Обновлено ${updatedCount}, Ошибок ${errorCount}`);
    
    // Получаем обновленные поставки из БД с учетом фильтров
    const filter = { integrationLink: integrationLinkId, user: userId };
    const { search, dateFrom, dateTo, status, exported, page = 1, limit = 20 } = req.query;
    if (search) {
      filter.$or = [
        { barcode: { $regex: search, $options: 'i' } },
        { supplierArticle: { $regex: search, $options: 'i' } }
      ];
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    if (status) filter.status = status;
    if (exported === 'true') filter.ms_href = { $ne: null };
    if (exported === 'false') filter.ms_href = null;
    
    // Подсчитываем общее количество записей для пагинации
    const totalPostavki = await WbIncome.countDocuments(filter);
    
    // Вычисляем параметры пагинации
    const currentPage = parseInt(page);
    const limitPerPage = parseInt(limit);
    const totalPages = Math.ceil(totalPostavki / limitPerPage);
    const skip = (currentPage - 1) * limitPerPage;
    
    // Получаем поставки с пагинацией
    const incomes = await WbIncome.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip(skip)
      .limit(limitPerPage);
    
    res.status(200).json({
      data: incomes,
      summary: {
        totalFromWB: wbIncomes.length,
        saved: savedCount,
        updated: updatedCount,
        errors: errorCount,
        totalInDB: totalPostavki
      },
      currentPage,
      totalPages,
      totalPostavki,
      limitPerPage
    });
  } catch (error) {
    console.error('Ошибка обновления поставок из WB:', error);
    let errorMessage = 'Ошибка сервера при обновлении поставок из WB';
    
    if (error.message.includes('Токен WB не найден')) {
      errorMessage = 'Токен WB не найден или невалиден';
    } else if (error.message.includes('Ошибка при получении поставок из WB')) {
      errorMessage = 'Ошибка при получении данных из Wildberries API';
    } else if (error.message.includes('Ошибка при сохранении поставки')) {
      errorMessage = 'Ошибка при сохранении данных в базу данных';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      details: error.message 
    });
  }
}; 