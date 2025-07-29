const axios = require('axios');
const Report = require('../models/Report');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const IntegrationLink = require('../models/IntegrationLink');
const OrganizationLink = require('../models/OrganizationLink');

const MS_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

async function checkReportExists(reportNumber, msToken) {
  const url = `${MS_BASE_URL}/entity/commissionreportin`;
  const resp = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${msToken}`,
      'Accept-Encoding': 'gzip'
    },
    params: {
      filter: `name=${reportNumber}`
    }
  });
  if (resp.status === 200) {
    const found = resp.data.rows.find(r => r.name === String(reportNumber));
    return found ? found.meta.href : null;
  }
  return null;
}

async function createCommissionReport({ reportNumber, dateFrom, dateTo, orgLink, msToken }) {
  const url = `${MS_BASE_URL}/entity/commissionreportin`;

  const payload = {
    name: String(reportNumber),
    contract: { meta: { href: orgLink.moyskladContractHref, type: 'contract', mediaType: 'application/json' } },
    agent: { meta: { href: orgLink.moyskladCounterpartyHref, type: 'counterparty', mediaType: 'application/json' } },
    organization: { meta: { href: orgLink.moyskladOrganizationHref, type: 'organization', mediaType: 'application/json' } },
    moment: `${dateTo} 00:00:00`,
    commissionPeriodStart: `${dateFrom} 00:00:00`,
    commissionPeriodEnd: `${dateTo} 00:00:00`
  };

  const resp = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${msToken}`,
      'Content-Type': 'application/json'
    }
  });
  return resp.data.meta.href;
}

// список операций, влияющих на overhead
const OVERHEAD_OPER_NAMES = [
  'Коррекция продаж',
  'Добровольная компенсация при возврате',
  'Компенсация ущерба',
  'Перевыставление эквайринга',
  'Корректировка эквайринга',
];

async function fillReportPositionsAndOverhead(reportDoc, href, msToken) {
  // Берём все строки одного отчёта
  const rows = await Report.find({
    user: reportDoc.user,
    integrationlinks_id: reportDoc.integrationlinks_id,
    Report_id: reportDoc.Report_id,
  }).lean();

  const sales = []; const returns = [];

  for (const r of rows) {
    if (!r.barcode) continue;

    const prod = await Product.findOne({
      user: r.user,
      integrationLink: r.integrationlinks_id,
      'sizes.skus': r.barcode,
    }).lean();
    if (!prod) continue;

    let hrefMS = prod.ms_href_general;
    let type = prod.complect ? 'bundle' : 'product';
    if (prod.sizes) {
      const sz = prod.sizes.find((s) => (s.skus || []).includes(r.barcode));
      if (sz && sz.ms_href) {
        hrefMS = sz.ms_href;
        // Корректируем тип по href (product / variant / bundle)
        let detectedType;
        if (hrefMS.includes('/entity/bundle/')) detectedType = 'bundle';
        else if (hrefMS.includes('/entity/variant/')) detectedType = 'variant';
        else if (hrefMS.includes('/entity/product/')) detectedType = 'product';
        if (!detectedType) detectedType = type; // fallback на ранее определённый
        type = prod.complect ? 'bundle' : detectedType;
      }
    }
    if (!hrefMS) continue;

    const position = {
      assortment: {
        meta: { href: hrefMS, type, mediaType: 'application/json' },
      },
      quantity: r.quantity,
      price: Math.round((r.retail_amount || 0) * 100),
      vat: 0,
      reward: Math.round(((r.retail_amount || 0) - (r.ppvz_for_pay || 0)) * 100),
    };

    if (r.doc_type_name === 'Возврат') returns.push(position);
    else if (r.doc_type_name === 'Продажа') sales.push(position);
  }

  const cleanId = href.split('/').pop();
  const postChunk = async (arr, isReturn = false) => {
    if (!arr.length) return;
    const url = `${MS_BASE_URL}/entity/commissionreportin/${cleanId}` +
      (isReturn ? '/returntocommissionerpositions' : '/positions');
    for (let i = 0; i < arr.length; i += 1000) {
      await axios.post(url, arr.slice(i, i + 1000), {
        headers: {
          Authorization: `Bearer ${msToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
  };

  await postChunk(sales, false);
  await postChunk(returns, true);

  // overhead
  const overheadSum = rows
    .filter((r) => OVERHEAD_OPER_NAMES.includes(r.supplier_oper_name))
    .reduce((sum, r) => {
      if (r.doc_type_name === 'Возврат') return sum + (r.ppvz_for_pay || 0);
      if (r.doc_type_name === 'Продажа') return sum - (r.ppvz_for_pay || 0);
      return sum;
    }, 0);

  if (overheadSum !== 0) {
    await axios.put(
      `${MS_BASE_URL}/entity/commissionreportin/${cleanId}`,
      { commissionOverhead: { sum: Math.round(overheadSum * 100) } },
      {
        headers: {
          Authorization: `Bearer ${msToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  console.log(
    `[MS_EXPORT] Позиции отправлены (продажи ${sales.length}, возвраты ${returns.length}), overhead = ${overheadSum}`,
  );
}

/**
 * Экспортирует отчёт (Report) в МойСклад: создаёт документ commissionreportin, добавляет позиции, overhead
 */
async function exportReportToMS({ userId, reportId, integrationLinkId }) {
  // Получаем токен МС из Storage, связанного с интеграцией
  const integrationLink = await IntegrationLink.findById(integrationLinkId).populate({ path: 'storage', select: '+token' });
  if (!integrationLink || !integrationLink.storage || !integrationLink.storage.token) {
    throw new Error('Не найден токен МС для выбранного склада');
  }
  const msToken = integrationLink.storage.token;

  const report = await Report.findOne({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId });
  if (!report) throw new Error('Отчёт не найден');

  // 1. Проверяем наличие отчёта в МойСклад по имени (оно уникально)
  let remoteHref = await checkReportExists(reportId, msToken);

  if (remoteHref) {
    // Отчёт существует в МС
    if (!report.exportedToMS || !report.msHref) {
      // Локальный флаг не установлен – синхронизируем
      report.exportedToMS = true;
      report.msHref = remoteHref;
      await report.save();
    }
    console.log(`[MS_EXPORT] Отчёт уже существует в МС, href=${remoteHref}`);
    return { alreadyExported: true, href: remoteHref };
  }

  // Отчёта нет в МС, но вдруг локально стоит флаг exportedToMS – сбросим его
  if (report.exportedToMS || report.msHref) {
    console.warn('[MS_EXPORT] Локально отчёт помечен как экспортированный, но в МС он не найден – сбрасываем флаги');
    report.exportedToMS = false;
    report.msHref = undefined;
    await report.save();
  }

  const orgLink = await OrganizationLink.findOne({ user: userId, integrationLink: integrationLinkId });
  if (!orgLink) throw new Error('OrganizationLink не найден. Заполните связи организации/контрагента/договора');

  console.log(`[MS_EXPORT] Обработка отчёта ${reportId}`);

  // 1. Проверяем существование в МС
  let href = await checkReportExists(reportId, msToken);
  if (!href) {
    console.log('[MS_EXPORT] Отчёт не найден – создаём пустой');
    href = await createCommissionReport({
      reportNumber: reportId,
      dateFrom: report.date_from,
      dateTo: report.date_to,
      orgLink,
      msToken
    });
    console.log(`[MS_EXPORT] Создан отчёт, href=${href}`);
  } else {
    console.log(`[MS_EXPORT] Отчёт уже существует в МС, href=${href}`);
  }

  // TODO: добавить позиции и overhead в следующих итерациях
  await fillReportPositionsAndOverhead(report, href, msToken);

  report.exportedToMS = true;
  report.msHref = href;
  await report.save();

  return { success: true, href };
}

module.exports = { exportReportToMS }; 