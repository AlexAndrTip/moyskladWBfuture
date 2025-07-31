const { uploadReportToDB } = require('../reports/reportUploadService');
const Report = require('../models/Report');
const IntegrationLink = require('../models/IntegrationLink');
const WbCabinet = require('../models/WbCabinet');
const { exportReportToMS: exportReportToMSService } = require('../services/msReportExportService');
const { createServiceReceipts: createServiceReceiptsService } = require('../services/msServiceSupplyService');
const { createExpenseOrders: createExpenseOrdersService } = require('../services/msServiceSupplyService');

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

// DELETE /api/reports/:integrationLinkId/:reportId
// Удалить отчет из БД
exports.deleteReport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId, reportId } = req.params;
    
    if (!integrationLinkId || !reportId) {
      return res.status(400).json({ 
        success: false,
        message: 'Необходимы integrationLinkId и reportId' 
      });
    }
    
    // Удаляем все записи отчета
    const deleteResult = await Report.deleteMany({
      user: userId,
      integrationlinks_id: integrationLinkId,
      Report_id: reportId
    });
    
    console.log(`[REPORT_CONTROLLER] Удалено записей отчета ${reportId}:`, deleteResult.deletedCount);
    
    res.json({
      success: true,
      message: `Отчет ${reportId} удален из БД`,
      deletedCount: deleteResult.deletedCount
    });
    
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка удаления отчета:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка сервера при удалении отчета: ' + error.message 
    });
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
    
    // Берём все отчёты, чтобы понять какие выгружены в МС
    const reportsCursor = await Report.find({
      user: userId,
      integrationlinks_id: integrationLinkId
    }).select('Report_id exportedToMS serviceReceiptsCreated expenseOrdersCreated').lean();

    const serviceReceipts = new Set();
    const expenseOrders = new Set();

    const loadedReports = new Set();
    const exportedReports = new Set();

    for (const r of reportsCursor) {
      loadedReports.add(r.Report_id);
      if (r.exportedToMS) exportedReports.add(r.Report_id);
      if (r.serviceReceiptsCreated) serviceReceipts.add(r.Report_id);
      if (r.expenseOrdersCreated) expenseOrders.add(r.Report_id);
    }

    res.json({ 
      success: true, 
      loadedReports: Array.from(loadedReports),
      exportedReports: Array.from(exportedReports),
      serviceReceipts: Array.from(serviceReceipts),
      expenseOrders: Array.from(expenseOrders),
      count: loadedReports.size 
    });
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка получения статуса отчетов:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении статуса отчетов' });
  }
};

// GET /api/reports/details/:reportId?integrationLinkId=...
exports.getReportDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { reportId } = req.params;
        const { integrationLinkId } = req.query;

        if (!reportId || !integrationLinkId) {
            return res.status(400).json({ message: 'Необходимы reportId и integrationLinkId' });
        }

        const reportEntries = await Report.find({
            user: userId,
            Report_id: reportId,
            integrationlinks_id: integrationLinkId
        }).lean();

        if (!reportEntries || reportEntries.length === 0) {
            return res.status(404).json({ message: 'Отчет не найден' });
        }

        const integrationLink = await IntegrationLink.findById(integrationLinkId).populate('wbCabinet');
        if (!integrationLink || !integrationLink.wbCabinet) {
            return res.status(404).json({ message: 'Связанный кабинет WB не найден.' });
        }

        const firstEntry = reportEntries[0];

        const totalRetailPrice = reportEntries.reduce((sum, entry) => {
            if (entry.doc_type_name === 'Продажа') {
                return sum + (entry.retail_amount || 0);
            }
            if (entry.doc_type_name === 'Возврат') {
                return sum - (entry.retail_amount || 0);
            }
            return sum;
        }, 0);
        const totalPpvzForPay = reportEntries.reduce((sum, entry) => {
            if (entry.doc_type_name === 'Продажа') {
                return sum + (entry.ppvz_for_pay || 0);
            }
            if (entry.doc_type_name === 'Возврат') {
                return sum - (entry.ppvz_for_pay || 0);
            }
            return sum;
        }, 0);
        const totalDeliveryRub = reportEntries.reduce((sum, entry) => sum + (entry.delivery_rub || 0), 0);

        // Штрафы
        const penaltySum = reportEntries
          .filter(e => e.supplier_oper_name === 'Штраф')
          .reduce((s, e) => s + (e.penalty || 0), 0);

        const realizationReportIds = [...new Set(reportEntries.map(e => e.realizationreport_id.toString()))].join(' / ');


        const reportDetails = {
            report_ids: realizationReportIds,
            jur_name: integrationLink.wbCabinet.name,
            period: `${firstEntry.date_from} - ${firstEntry.date_to}`,
            create_dt: firstEntry.create_dt,
            total_retail_price: totalRetailPrice,
            total_ppvz_for_pay: totalPpvzForPay,
            total_delivery_rub: totalDeliveryRub,
            currency: firstEntry.currency_name,

            // Заглушки для будущих расчетов
            penalty: penaltySum,
            increased_logistics: 0,
            other_fines: 0,
            total_fines: 0,
            reward_correction: 0,
            wb_reward: 0,
            storage_cost: 0,
            paid_acceptance_cost: 0,
            other_deductions_payouts: 0,
            total_to_pay: 0,
        };

        res.json({ success: true, reportDetails });

    } catch (error) {
        console.error('[REPORT_CONTROLLER] Ошибка получения деталей отчета:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при получении деталей отчета: ' + error.message });
    }
}; 

// POST /api/reports/export-ms
// { integrationLinkId, reportId }
exports.exportReportToMS = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId, reportId } = req.body;

    if (!integrationLinkId || !reportId) {
      return res.status(400).json({ message: 'Необходимы integrationLinkId и reportId' });
    }

    const result = await exportReportToMSService({ userId, integrationLinkId, reportId });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка выгрузки отчёта в МС:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при выгрузке отчёта в МС' });
  }
}; 

// POST /api/reports/service-receipts
// { integrationLinkId, reportId }
exports.createServiceReceipts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId, reportId } = req.body;
    if (!integrationLinkId || !reportId) {
      return res.status(400).json({ message: 'Необходимы integrationLinkId и reportId' });
    }
    const result = await createServiceReceiptsService({ userId, integrationLinkId, reportId });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка создания приёмок услуг:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании приёмок услуг' });
  }
}; 

// POST /api/reports/expense-orders
exports.createExpenseOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId, reportId } = req.body;
    if (!integrationLinkId || !reportId) {
      return res.status(400).json({ message: 'Необходимы integrationLinkId и reportId' });
    }
    const result = await createExpenseOrdersService({ userId, integrationLinkId, reportId });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[REPORT_CONTROLLER] Ошибка создания расходных ордеров:', error);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании расходных ордеров' });
  }
}; 