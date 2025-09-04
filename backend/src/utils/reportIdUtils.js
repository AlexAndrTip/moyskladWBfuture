/**
 * Утилиты для работы с номерами отчетов
 */

/**
 * Генерирует уникальный номер отчета в формате: {integrationIdSuffix}-{dateRange}
 * @param {string} integrationId - ID интеграции
 * @param {string} dateRange - диапазон дат в формате DDMMYYDDMMYY
 * @returns {string} уникальный номер отчета
 */
function generateUniqueReportId(integrationId, dateRange) {
  if (!integrationId || !dateRange) {
    throw new Error('Необходимы integrationId и dateRange');
  }
  
  // Получаем последние 8 символов ID интеграции
  const integrationIdSuffix = integrationId.slice(-8);
  
  // Формируем уникальный номер: {integrationIdSuffix}-{dateRange}
  return `${integrationIdSuffix}-${dateRange}`;
}

/**
 * Извлекает короткий номер отчета (без префикса интеграции)
 * @param {string} fullReportId - полный номер отчета
 * @returns {string} короткий номер отчета
 */
function getShortReportId(fullReportId) {
  if (!fullReportId || !fullReportId.includes('-')) {
    return fullReportId;
  }
  
  return fullReportId.split('-')[1];
}

/**
 * Извлекает префикс интеграции из номера отчета
 * @param {string} fullReportId - полный номер отчета
 * @returns {string} префикс интеграции
 */
function getIntegrationPrefix(fullReportId) {
  if (!fullReportId || !fullReportId.includes('-')) {
    return null;
  }
  
  return fullReportId.split('-')[0];
}

/**
 * Проверяет, является ли номер отчета в новом формате
 * @param {string} reportId - номер отчета
 * @returns {boolean} true если в новом формате
 */
function isNewFormatReportId(reportId) {
  return reportId && reportId.includes('-') && reportId.split('-').length === 2;
}

module.exports = {
  generateUniqueReportId,
  getShortReportId,
  getIntegrationPrefix,
  isNewFormatReportId
};
