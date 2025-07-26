const { addReportUploadJob, getJobStatus, getQueueStats } = require('../services/queueService');

// POST /api/queue/report-upload
// Добавить задачу загрузки отчета в очередь
exports.addReportUploadJob = async (req, res) => {
  try {
    const userId = req.user._id;
    const { integrationLinkId, reportId, dateFrom, dateTo } = req.body;
    
    if (!integrationLinkId || !reportId || !dateFrom || !dateTo) {
      return res.status(400).json({ 
        success: false,
        message: 'Необходимы integrationLinkId, reportId, dateFrom, dateTo' 
      });
    }
    
    // Добавляем задачу в очередь
    const result = await addReportUploadJob({
      userId,
      integrationLinkId,
      reportId,
      dateFrom,
      dateTo
    });
    
    res.json({
      success: true,
      message: 'Задача добавлена в очередь',
      jobId: result.jobId,
      status: result.status
    });
    
  } catch (error) {
    console.error('[QUEUE_CONTROLLER] Ошибка добавления задачи:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка добавления задачи в очередь: ' + error.message 
    });
  }
};

// GET /api/queue/job/:jobId
// Получить статус задачи
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({ 
        success: false,
        message: 'Необходим jobId' 
      });
    }
    
    const status = await getJobStatus(jobId);
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('[QUEUE_CONTROLLER] Ошибка получения статуса задачи:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка получения статуса задачи: ' + error.message 
    });
  }
};

// GET /api/queue/stats
// Получить статистику очереди
exports.getQueueStats = async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('[QUEUE_CONTROLLER] Ошибка получения статистики:', error);
    res.status(500).json({ 
      success: false,
      message: 'Ошибка получения статистики очереди: ' + error.message 
    });
  }
}; 