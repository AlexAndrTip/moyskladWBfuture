const Report = require('../models/Report');

async function createServiceReceipts({ userId, reportId, integrationLinkId }) {
  const report = await Report.findOne({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId });
  if (!report) throw new Error('Отчёт не найден');
  if (report.serviceReceiptsCreated) return { already: true };
  console.log(`[SERVICE_SUPPLY] (stub) Создаём приёмки услуг для отчёта ${reportId}`);
  report.serviceReceiptsCreated = true;
  await report.save();
  return { success: true };
}

async function createExpenseOrders({ userId, reportId, integrationLinkId }) {
  const report = await Report.findOne({ user: userId, Report_id: reportId, integrationlinks_id: integrationLinkId });
  if (!report) throw new Error('Отчёт не найден');
  if (report.expenseOrdersCreated) return { already: true };
  console.log(`[EXPENSE_ORDERS] (stub) Создаём расходные ордера для отчёта ${reportId}`);
  report.expenseOrdersCreated = true;
  await report.save();
  return { success: true };
}

module.exports = { createServiceReceipts, createExpenseOrders }; 