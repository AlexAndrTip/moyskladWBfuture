const Report = require('../models/Report');
const IntegrationLink = require('../models/IntegrationLink');
const OrganizationLink = require('../models/OrganizationLink');
const axios = require('axios');
const MS_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

async function createIncomeOrder({ userId, reportId, integrationLinkId }) {
  const reportRows = await Report.find({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }).lean();
  if (!reportRows.length) throw new Error('Отчёт не найден');
  if (reportRows[0].incomeOrdersCreated) return { already: true };

  const integrationLink = await IntegrationLink.findById(integrationLinkId).populate({ path: 'storage', select: '+token' });
  if (!integrationLink || !integrationLink.storage || !integrationLink.storage.token) throw new Error('Не найден токен МС');
  const msToken = integrationLink.storage.token;

  const orgLink = await OrganizationLink.findOne({ user: userId, integrationLink: integrationLinkId });
  if (!orgLink) throw new Error('OrganizationLink не настроен');
  const organizationHref = orgLink.moyskladOrganizationHref;
  const counterpartyHref = orgLink.moyskladCounterpartyHref;
  const contractHref = orgLink.moyskladContractHref;
  if (!organizationHref || !counterpartyHref) throw new Error('Не заполнены href организации или контрагента');

  // Сумма к поступлению: ppvz_for_pay продажи минус возвраты
  const cashSum = reportRows.reduce((sum, r) => {
    if (r.doc_type_name === 'Продажа') return sum + (r.ppvz_for_pay || 0);
    if (r.doc_type_name === 'Возврат') return sum - (r.ppvz_for_pay || 0);
    return sum;
  }, 0);
  const cents = Math.round(cashSum * 100);
  if (cents <= 0) throw new Error('Сумма к поступлению не положительная');

  // href отчёта (commissionreportin)
  let reportHref = reportRows[0].msHref;
  if (!reportHref) reportHref = null;

  const payload = {
    organization: { meta: { href: organizationHref, type: 'organization', mediaType: 'application/json' } },
    agent: { meta: { href: counterpartyHref, type: 'counterparty', mediaType: 'application/json' } },
    contract: contractHref ? { meta: { href: contractHref, type: 'contract', mediaType: 'application/json' } } : undefined,
    sum: cents,
    moment: `${reportRows[0].date_to} 00:00:00`,
    operations: reportHref ? [{ meta: { href: reportHref, type: 'commissionreportin', mediaType: 'application/json' } }] : [],
  };

  const resp = await axios.post(`${MS_BASE_URL}/entity/cashin`, payload, {
    headers: {
      Authorization: `Bearer ${msToken}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
    },
  });

  await Report.updateMany({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId }, { incomeOrdersCreated: true });
  return { success: true, href: resp.data.meta.href };
}

module.exports = { createIncomeOrder }; 