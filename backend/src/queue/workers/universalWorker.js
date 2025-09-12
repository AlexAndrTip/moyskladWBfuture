#!/usr/bin/env node

/**
 * Универсальный воркер для обработки всех типов задач
 * 
 * Использование:
 * node src/queue/workers/universalWorker.js
 * 
 * Переменные окружения:
 * - REDIS_HOST - хост Redis (по умолчанию: localhost)
 * - REDIS_PORT - порт Redis (по умолчанию: 6379)
 * - REDIS_PASSWORD - пароль Redis (опционально)
 * - REDIS_DB - база данных Redis (по умолчанию: 0)
 * - WORKER_POLL_INTERVAL - интервал опроса в мс (по умолчанию: 5000)
 * - WORKER_TASK_TYPES - типы задач через запятую (опционально)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });

const workerService = require('../services/workerService');

// Все поддерживаемые типы задач
const ALL_TASK_TYPES = [
  'WB_PRICE_UPDATE',
  'WB_REMAINS_UPDATE',
  'MS_PRICE_UPDATE',
  'MS_STOCK_UPDATE',
  'WB_STATISTICS_UPDATE',
  'SYNC_PRODUCTS'
];

async function startWorker() {
  try {
    console.log('🚀 Запуск универсального воркера...');

    // Определяем типы задач для обработки
    let supportedTaskTypes = ALL_TASK_TYPES;
    
    if (process.env.WORKER_TASK_TYPES) {
      const envTaskTypes = process.env.WORKER_TASK_TYPES.split(',').map(t => t.trim());
      supportedTaskTypes = envTaskTypes.filter(type => ALL_TASK_TYPES.includes(type));
      
      if (supportedTaskTypes.length === 0) {
        console.error('❌ Неверные типы задач в WORKER_TASK_TYPES');
        process.exit(1);
      }
    }

    console.log(`📋 Поддерживаемые типы задач: ${supportedTaskTypes.join(', ')}`);

    // Устанавливаем интервал опроса из переменных окружения
    const pollInterval = parseInt(process.env.WORKER_POLL_INTERVAL) || 5000;
    workerService.setPollInterval(pollInterval);

    // Запускаем воркер
    const started = await workerService.start(supportedTaskTypes);

    if (!started) {
      console.error('❌ Не удалось запустить воркер');
      process.exit(1);
    }

    console.log('✅ Универсальный воркер запущен успешно');
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

    // Периодический вывод информации о системе
    setInterval(() => {
      const systemInfo = workerService.getSystemInfo();
      console.log(`💻 [${new Date().toISOString()}] Информация о системе:`);
      console.log(`   - Платформа: ${systemInfo.platform} ${systemInfo.arch}`);
      console.log(`   - CPU: ${systemInfo.cpu.count} ядер (${systemInfo.cpu.model})`);
      console.log(`   - Память: ${Math.floor(systemInfo.memory.used / 1024 / 1024)}MB / ${Math.floor(systemInfo.memory.total / 1024 / 1024)}MB`);
    }, 300000); // Каждые 5 минут

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
