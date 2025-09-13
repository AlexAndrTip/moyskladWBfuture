#!/usr/bin/env node

/**
 * Воркер для обработки задач обновления остатков
 * 
 * Использование:
 * node src/queue/workers/remainsUpdateWorker.js
 * 
 * Переменные окружения:
 * - REDIS_HOST - хост Redis (по умолчанию: localhost)
 * - REDIS_PORT - порт Redis (по умолчанию: 6379)
 * - REDIS_PASSWORD - пароль Redis (опционально)
 * - REDIS_DB - база данных Redis (по умолчанию: 0)
 * - WORKER_POLL_INTERVAL - интервал опроса в мс (по умолчанию: 5000)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

const workerService = require('../services/workerService');

// Типы задач, которые обрабатывает этот воркер
const SUPPORTED_TASK_TYPES = [
  'WB_REMAINS_UPDATE',
  'MS_STOCK_UPDATE'
];

async function startWorker() {
  try {
    console.log('🚀 Запуск воркера обновления остатков...');
    console.log(`📋 Поддерживаемые типы задач: ${SUPPORTED_TASK_TYPES.join(', ')}`);

    // Устанавливаем интервал опроса из переменных окружения
    const pollInterval = parseInt(process.env.WORKER_POLL_INTERVAL) || 5000;
    workerService.setPollInterval(pollInterval);

    // Запускаем воркер
    const started = await workerService.start(SUPPORTED_TASK_TYPES);

    if (!started) {
      console.error('❌ Не удалось запустить воркер');
      process.exit(1);
    }

    console.log('✅ Воркер обновления остатков запущен успешно');
    console.log('⏱️ Нажмите Ctrl+C для остановки');

    // Периодический вывод статистики
    setInterval(() => {
      const stats = workerService.getStats();
      if (stats.isRunning) {
        console.log(`📊 [${new Date().toISOString()}] Статистика воркера:`);
        console.log(`   - Обработано задач: ${stats.processedTasks}`);
        console.log(`   - Неудачных задач: ${stats.failedTasks}`);
        console.log(`   - Время работы: ${Math.floor(stats.uptime / 1000)}с`);
        if (stats.currentTask) {
          console.log(`   - Текущая задача: ${stats.currentTask.id} (${stats.currentTask.type})`);
        }
      }
    }, 60000); // Каждую минуту

  } catch (error) {
    console.error('❌ Критическая ошибка воркера:', error.message);
    process.exit(1);
  }
}

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
  process.exit(1);
});

// Запускаем воркер
if (require.main === module) {
  startWorker();
}

module.exports = { startWorker };
