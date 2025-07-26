const Queue = require('bull');
const redis = require('redis');

// Создаем Redis клиент
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: process.env.REDIS_DB || 0
});

// Обработчик ошибок Redis
redisClient.on('error', (err) => {
  console.error('[QUEUE_SERVICE] Redis ошибка:', err);
});

// Создаем очередь для загрузки отчетов
const reportUploadQueue = new Queue('report-upload', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0
  },
  defaultJobOptions: {
    attempts: 3, // Количество попыток
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100, // Удалять завершенные задачи
    removeOnFail: 50 // Удалять неудачные задачи
  }
});

// Ограничиваем количество параллельных задач
reportUploadQueue.process(10, async (job) => {
  console.log(`[QUEUE_SERVICE] Обрабатываем задачу ${job.id}:`, job.data);
  
  try {
    const { userId, integrationLinkId, reportId, dateFrom, dateTo } = job.data;
    
    // Импортируем сервис загрузки отчетов
    const { uploadReportToDB } = require('../reports/reportUploadService');
    
    // Выполняем загрузку отчета
    const result = await uploadReportToDB({
      userId,
      integrationLinkId,
      reportId,
      dateFrom,
      dateTo
    });
    
    console.log(`[QUEUE_SERVICE] Задача ${job.id} завершена успешно:`, result);
    
    return {
      success: true,
      ...result
    };
    
  } catch (error) {
    console.error(`[QUEUE_SERVICE] Ошибка в задаче ${job.id}:`, error);
    throw error; // Bull автоматически повторит задачу
  }
});

// Обработчики событий очереди
reportUploadQueue.on('completed', (job, result) => {
  console.log(`[QUEUE_SERVICE] Задача ${job.id} завершена:`, result);
});

reportUploadQueue.on('failed', (job, err) => {
  console.error(`[QUEUE_SERVICE] Задача ${job.id} провалена:`, err.message);
});

reportUploadQueue.on('error', (err) => {
  console.error('[QUEUE_SERVICE] Ошибка очереди:', err);
});

// Функция для добавления задачи в очередь
const addReportUploadJob = async (jobData) => {
  try {
    const job = await reportUploadQueue.add(jobData, {
      priority: 1, // Приоритет задачи
      delay: 0 // Без задержки
    });
    
    console.log(`[QUEUE_SERVICE] Задача добавлена в очередь:`, job.id);
    
    return {
      jobId: job.id,
      status: 'queued'
    };
    
  } catch (error) {
    console.error('[QUEUE_SERVICE] Ошибка добавления задачи:', error);
    throw error;
  }
};

// Функция для получения статуса задачи
const getJobStatus = async (jobId) => {
  try {
    const job = await reportUploadQueue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }
    
    const state = await job.getState();
    const progress = job._progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;
    
    return {
      jobId: job.id,
      status: state,
      progress,
      result,
      failedReason,
      data: job.data
    };
    
  } catch (error) {
    console.error('[QUEUE_SERVICE] Ошибка получения статуса задачи:', error);
    throw error;
  }
};

// Функция для получения статистики очереди
const getQueueStats = async () => {
  try {
    const waiting = await reportUploadQueue.getWaiting();
    const active = await reportUploadQueue.getActive();
    const completed = await reportUploadQueue.getCompleted();
    const failed = await reportUploadQueue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
    
  } catch (error) {
    console.error('[QUEUE_SERVICE] Ошибка получения статистики:', error);
    throw error;
  }
};

// Функция для очистки очереди
const clearQueue = async () => {
  try {
    await reportUploadQueue.empty();
    console.log('[QUEUE_SERVICE] Очередь очищена');
  } catch (error) {
    console.error('[QUEUE_SERVICE] Ошибка очистки очереди:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[QUEUE_SERVICE] Получен SIGTERM, закрываем очередь...');
  await reportUploadQueue.close();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[QUEUE_SERVICE] Получен SIGINT, закрываем очередь...');
  await reportUploadQueue.close();
  await redisClient.quit();
  process.exit(0);
});

module.exports = {
  addReportUploadJob,
  getJobStatus,
  getQueueStats,
  clearQueue,
  reportUploadQueue
}; 