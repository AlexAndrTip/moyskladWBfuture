const { uploadReportToDB } = require('../reports/reportUploadService');
const Report = require('../models/Report');

// POST /api/reports/upload
// { integrationLinkId, reportId, dateFrom, dateTo }
exports.uploadReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId, reportId, dateFrom, dateTo } = req.body;
    if (!integrationLinkId || !reportId || !dateFrom || !dateTo) {
      return res.status(400).json({ message: 'Необходимы integrationLinkId, reportId, dateFrom, dateTo' });
    }
    const result = await uploadReportToDB({ userId, integrationLinkId, reportId, dateFrom, dateTo });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка выгрузки отчета:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при выгрузке отчета' });
  }
};

// GET /api/reports/status/:integrationLinkId
// Получить статус отчетов для интеграции
exports.getReportsStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId } = req.params;
    
    if (!integrationLinkId) {
      return res.status(400).json({ message: 'Необходим integrationLinkId' });
    }
    
    // Получаем уникальные Report_id для данной интеграции и пользователя
    const reports = await Report.distinct('Report_id', {
      user: userId,
      integrationlinks_id: integrationLinkId
    });
    
    res.json({ 
      success: true, 
      loadedReports: reports,
      count: reports.length 
    });
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка получения статуса отчетов:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении статуса отчетов' });
  }
}; 