const Report = require('../models/Report');
const IntegrationLink = require('../models/IntegrationLink');
const OrganizationLink = require('../models/OrganizationLink');
const Uslugi = require('../models/Uslugi');
const { findOrCreateMoySkladService } = require('./moySkladServiceService');
const { generateUniqueDocumentName } = require('../utils/reportIdUtils');
const axios = require('axios');
const MS_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

async function createServiceReceipts({ userId, reportId, integrationLinkId }) {
  const reportRows = await Report.find({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }).lean();
  if (!reportRows.length) throw new Error('Отчёт не найден');
  // берём любой документ отчёта как "шапку"
  const reportHeader = reportRows[0];
  if (reportHeader.serviceReceiptsCreated) return { already: true };

  // получаем токен МС
  const integrationLink = await IntegrationLink.findById(integrationLinkId).populate({ path: 'storage', select: '+token' });
  if (!integrationLink || !integrationLink.storage || !integrationLink.storage.token) {
    throw new Error('Не найден токен МС для выбранного склада');
  }
  const msToken = integrationLink.storage.token;

  // получаем ссылки организации/контрагента/склада
  const orgLink = await OrganizationLink.findOne({ user: userId, integrationLink: integrationLinkId });
  if (!orgLink) throw new Error('OrganizationLink не настроен');
  const organizationHref = orgLink.moyskladOrganizationHref;
  const counterpartyHref = orgLink.moyskladCounterpartyHref;
  const storeHref = orgLink.moyskladStoreExpensesHref || orgLink.moyskladStoreHref;
  const contractHref = orgLink.moyskladContractHref;
  if (!organizationHref || !counterpartyHref || !storeHref || !contractHref) throw new Error('Не заполнены href организации/контрагента/договора/склада');

  // считаем суммы
  const sumFields = {
    totalDeduction: 0,
    totalAcceptance: 0,
    totalStorageFee: 0,
    totalPenalty: 0,
    totalDeliveryRub: 0,
  };
  for (const row of reportRows) {
    sumFields.totalDeduction += row.deduction || 0;
    sumFields.totalAcceptance += row.acceptance || 0;
    sumFields.totalStorageFee += row.storage_fee || 0;
    sumFields.totalPenalty += row.penalty || 0;
    sumFields.totalDeliveryRub += row.delivery_rub || 0;
  }
  // перевод в копейки
  for (const k of Object.keys(sumFields)) {
    sumFields[k] = Math.round(sumFields[k] * 100);
  }

  const serviceMap = {
    'Прочие удержания WB': sumFields.totalDeduction,
    'Платная приемка WB': sumFields.totalAcceptance,
    'Хранение WB': sumFields.totalStorageFee,
    'Штрафы WB': sumFields.totalPenalty,
    'Логистика WB': sumFields.totalDeliveryRub,
  };

  const positions = [];
  const negativeServices = [];
  for (const [name, price] of Object.entries(serviceMap)) {
    if (price === 0) continue;
    // получаем/создаём услугу
    let usl = await Uslugi.findOne({ user: userId, integrationLink: integrationLinkId, name });
    if (!usl || !usl.ms_href) {
      const res = await findOrCreateMoySkladService(msToken, name);
      if (usl) {
        usl.ms_href = res.href;
        await usl.save();
      } else {
        usl = await Uslugi.create({ user: userId, integrationLink: integrationLinkId, name, ms_href: res.href });
      }
    }
    if (!usl.ms_href) continue;
    if (price > 0) {
      positions.push({
        quantity: 1,
        price: price,
        vat: 0,
        assortment: { meta: { href: usl.ms_href, type: 'service', mediaType: 'application/json' } },
      });
    } else {
      negativeServices.push({ name, href: usl.ms_href, amount: Math.abs(price) });
    }
  }
  if (!positions.length && !negativeServices.length) {
    console.log('[SERVICE_SUPPLY] Нет сумм для создания приёмок');
    await Report.updateMany({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }, { serviceReceiptsCreated: true, msSupplyHref: null });
    return { skipped: true };
  }
  // создаём supply, если есть позиции
  let supplyHref = null;
  if (positions.length) {
    // Генерируем уникальное имя для приемки услуг
    const uniqueSupplyName = generateUniqueDocumentName(integrationLinkId, reportId);
    console.log(`[SERVICE_SUPPLY] Создаем приемку услуг с уникальным именем: ${uniqueSupplyName} для отчета: ${reportId}`);
    
    const supplyPayload = {
      organization: { meta: { href: organizationHref, type: 'organization', mediaType: 'application/json' } },
      contract: { meta: { href: contractHref, type: 'contract', mediaType: 'application/json' } },
      name: uniqueSupplyName,
      agent: { meta: { href: counterpartyHref, type: 'counterparty', mediaType: 'application/json' } },
      store: { meta: { href: storeHref, type: 'store', mediaType: 'application/json' } },
      moment: `${reportHeader.date_to} 00:00:00`,
      positions,
    };
    const resp = await axios.post(`${MS_BASE_URL}/entity/supply`, supplyPayload, {
      headers: {
        Authorization: `Bearer ${msToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      },
    });
    supplyHref = resp.data.meta.href;
    console.log('[SERVICE_SUPPLY] Создана приёмка услуг', supplyHref);
  }
  // создаём demands для отрицательных сумм
  for (const ns of negativeServices) {
    // Генерируем уникальное имя для отгрузки
    const uniqueDemandName = generateUniqueDocumentName(integrationLinkId, reportId);
    console.log(`[SERVICE_SUPPLY] Создаем отгрузку с уникальным именем: ${uniqueDemandName} для отчета: ${reportId}`);
    
    const demandPayload = {
      organization: { meta: { href: organizationHref, type: 'organization', mediaType: 'application/json' } },
      contract: { meta: { href: contractHref, type: 'contract', mediaType: 'application/json' } },
      name: uniqueDemandName,
      agent: { meta: { href: counterpartyHref, type: 'counterparty', mediaType: 'application/json' } },
      store: { meta: { href: storeHref, type: 'store', mediaType: 'application/json' } },
      moment: `${reportHeader.date_to} 00:00:00`,
      positions: [{ quantity: 1, price: ns.amount, vat: 0, assortment: { meta: { href: ns.href, type: 'service', mediaType: 'application/json' } } }],
    };
    await axios.post(`${MS_BASE_URL}/entity/demand`, demandPayload, {
      headers: { Authorization: `Bearer ${msToken}`, 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip' },
    });
    console.log('[SERVICE_SUPPLY] Создана отгрузка для', ns.name);
  }
  // отметим в БД
  await Report.updateMany({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }, { serviceReceiptsCreated: true, msSupplyHref: supplyHref });
  return { success: true, supplyHref };
}

async function createExpenseOrders({ userId, reportId, integrationLinkId }) {
  const reportRows = await Report.find({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }).lean();
  if (!reportRows.length) throw new Error('Отчёт не найден');
  if (reportRows[0].expenseOrdersCreated) return { already: true };

  // токен МС
  const integrationLink = await IntegrationLink.findById(integrationLinkId).populate({ path: 'storage', select: '+token' });
  if (!integrationLink || !integrationLink.storage || !integrationLink.storage.token) {
    throw new Error('Не найден токен МС');
  }
  const msToken = integrationLink.storage.token;

  // ссылки
  const orgLink = await OrganizationLink.findOne({ user: userId, integrationLink: integrationLinkId });
  if (!orgLink) throw new Error('OrganizationLink не настроен');
  const organizationHref = orgLink.moyskladOrganizationHref;
  const counterpartyHref = orgLink.moyskladCounterpartyHref;
  const contractHref = orgLink.moyskladContractHref;

  // функции для expense items
  const { findOrCreateMoySkladExpenseItem } = require('./moySkladExpenseItemService');
  const StatRashodov = require('../models/StatRashodov');

  // supplyHref из БД
  let supplyHref = reportRows[0].msSupplyHref;
  if (!supplyHref) {
    // резервный поиск по уникальному имени
    const uniqueSupplyName = generateUniqueDocumentName(integrationLinkId, reportId);
    console.log(`[EXPENSE_ORDERS] Ищем supply по уникальному имени: ${uniqueSupplyName} для отчета: ${reportId}`);
    const resp = await axios.get(`${MS_BASE_URL}/entity/supply`, {
      headers: { Authorization: `Bearer ${msToken}`, 'Accept-Encoding': 'gzip' },
      params: { filter: `name=${uniqueSupplyName}` }
    });
    const row = (resp.data.rows || []).find(r => r.name === uniqueSupplyName);
    supplyHref = row ? row.meta.href : null;
    if (supplyHref) {
      await Report.updateMany({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }, { msSupplyHref: supplyHref });
    }
  }

  // подсчёт сумм (положительные и отрицательные вместе)
  const serviceTotals = {
    'Прочие удержания WB': 0,
    'Платная приемка WB': 0,
    'Хранение WB': 0,
    'Штрафы WB': 0,
    'Логистика WB': 0,
  };
  for (const r of reportRows) {
    serviceTotals['Прочие удержания WB'] += r.deduction || 0;
    serviceTotals['Платная приемка WB'] += r.acceptance || 0;
    serviceTotals['Хранение WB'] += r.storage_fee || 0;
    serviceTotals['Штрафы WB'] += r.penalty || 0;
    serviceTotals['Логистика WB'] += r.delivery_rub || 0;
  }
  // копейки
  Object.keys(serviceTotals).forEach(k => { serviceTotals[k] = Math.round(serviceTotals[k] * 100); });

  for (const [name, sum] of Object.entries(serviceTotals)) {
    if (sum === 0) continue;

    // expense item
    let stat = await StatRashodov.findOne({ user: userId, integrationLink: integrationLinkId, name });
    if (!stat || !stat.ms_href) {
      const { href } = await findOrCreateMoySkladExpenseItem(msToken, name);
      if (stat) { stat.ms_href = href; await stat.save(); }
      else { stat = await StatRashodov.create({ user: userId, integrationLink: integrationLinkId, name, ms_href: href }); }
    }
    if (!stat.ms_href) continue;

    const cashoutPayload = {
      organization: { meta: { href: organizationHref, type: 'organization', mediaType: 'application/json' } },
      contract: { meta: { href: contractHref, type: 'contract', mediaType: 'application/json' } },
      agent: { meta: { href: counterpartyHref, type: 'counterparty', mediaType: 'application/json' } },
      sum: Math.abs(sum),
      moment: `${reportRows[0].date_to} 00:00:00`,
      expenseItem: { meta: { href: stat.ms_href, type: 'expenseitem', mediaType: 'application/json' } },
      operations: supplyHref ? [{ meta: { href: supplyHref, type: 'supply', mediaType: 'application/json' } }] : [],
    };
    await axios.post(`${MS_BASE_URL}/entity/cashout`, cashoutPayload, {
      headers: { Authorization: `Bearer ${msToken}`, 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip' },
    });
    console.log('[EXPENSE_ORDERS] Создан cashout', name, sum);
  }

  await Report.updateMany({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }, { expenseOrdersCreated: true });
  return { success: true };
}

module.exports = { createServiceReceipts, createExpenseOrders }; 