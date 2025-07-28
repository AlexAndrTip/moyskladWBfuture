const Settings = require('../models/Settings');
const Report = require('../models/Report');
const cron = require('node-cron');

/**
 * Удаляет из коллекции Report все записи, выходящие за пределы reportDepthWeeks
 * для каждой интеграции пользователя.
 */
async function cleanupOldReports() {
  try {
    const settingsList = await Settings.find({});

    for (const settings of settingsList) {
      const weeks = settings.reportDepthWeeks || 12;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);
      const cutoffStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const deleteResult = await Report.deleteMany({
        user: settings.user,
        integrationlinks_id: settings.integrationLink,
        date_to: { $lt: cutoffStr }
      });

      if (deleteResult.deletedCount) {
        console.log(`[REPORT_CLEANUP] Удалено ${deleteResult.deletedCount} старых записей для интеграции ${settings.integrationLink} (user: ${settings.user}).`);
      }
    }
  } catch (error) {
    console.error('[REPORT_CLEANUP] Ошибка очистки старых отчетов:', error);
  }
}

/**
 * Планирует ежедневную очистку в 00:00 и запускает сразу при старте сервера.
 */
function scheduleDailyCleanup() {
  // Немедленно при старте
  cleanupOldReports();

  // Каждый день в 00:00
  cron.schedule('0 0 * * *', () => {
    console.log('[REPORT_CLEANUP] Запуск ежедневной очистки старых отчетов');
    cleanupOldReports();
  });
}

/**
 * Очистка только для одной интеграции (вызывается при изменении настроек).
 */
async function cleanupForIntegration(userId, integrationLinkId, weeks) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const deleteResult = await Report.deleteMany({
      user: userId,
      integrationlinks_id: integrationLinkId,
      date_to: { $lt: cutoffStr }
    });

    if (deleteResult.deletedCount) {
      console.log(`[REPORT_CLEANUP] Удалено ${deleteResult.deletedCount} старых отчетов после изменения настроек (integration: ${integrationLinkId}).`);
    }
  } catch (error) {
    console.error('[REPORT_CLEANUP] Ошибка при точечной очистке:', error);
  }
}

module.exports = { scheduleDailyCleanup, cleanupOldReports, cleanupForIntegration }; 