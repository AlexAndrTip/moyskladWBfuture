#!/usr/bin/env node

/**
 * Скрипт для запуска воркеров очередей
 * 
 * Использование:
 * node scripts/startWorkers.js [тип_воркера]
 * 
 * Типы воркеров:
 * - price - воркер обновления цен
 * - remains - воркер обновления остатков
 * - universal - универсальный воркер
 * - all - все воркеры (по умолчанию)
 */

const { spawn } = require('child_process');
const path = require('path');

const WORKERS = {
  price: 'src/queue/workers/priceUpdateWorker.js',
  remains: 'src/queue/workers/remainsUpdateWorker.js',
  universal: 'src/queue/workers/universalWorker.js'
};

function startWorker(workerType) {
  const workerPath = WORKERS[workerType];
  if (!workerPath) {
    console.error(`❌ Неизвестный тип воркера: ${workerType}`);
    console.log(`Доступные типы: ${Object.keys(WORKERS).join(', ')}`);
    process.exit(1);
  }

  const fullPath = path.join(__dirname, '..', workerPath);
  
  console.log(`🚀 Запуск воркера ${workerType}...`);
  
  const worker = spawn('node', [fullPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  worker.on('error', (error) => {
    console.error(`❌ Ошибка запуска воркера ${workerType}:`, error.message);
  });

  worker.on('exit', (code, signal) => {
    if (signal) {
      console.log(`🛑 Воркер ${workerType} остановлен сигналом: ${signal}`);
    } else {
      console.log(`🛑 Воркер ${workerType} завершился с кодом: ${code}`);
    }
  });

  return worker;
}

function startAllWorkers() {
  console.log('🚀 Запуск всех воркеров...');
  
  const workers = [];
  
  for (const [type, path] of Object.entries(WORKERS)) {
    const worker = startWorker(type);
    workers.push({ type, process: worker });
  }

  // Обработка сигналов завершения
  process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал завершения, останавливаем все воркеры...');
    
    workers.forEach(({ type, process: workerProcess }) => {
      console.log(`🛑 Остановка воркера ${type}...`);
      workerProcess.kill('SIGTERM');
    });

    // Ждем завершения всех воркеров
    setTimeout(() => {
      console.log('✅ Все воркеры остановлены');
      process.exit(0);
    }, 5000);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM, останавливаем все воркеры...');
    
    workers.forEach(({ type, process: workerProcess }) => {
      console.log(`🛑 Остановка воркера ${type}...`);
      workerProcess.kill('SIGTERM');
    });

    setTimeout(() => {
      console.log('✅ Все воркеры остановлены');
      process.exit(0);
    }, 5000);
  });

  console.log('✅ Все воркеры запущены');
  console.log('⏱️ Нажмите Ctrl+C для остановки всех воркеров');
}

function main() {
  const workerType = process.argv[2] || 'all';

  if (workerType === 'all') {
    startAllWorkers();
  } else {
    startWorker(workerType);
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

// Запускаем
if (require.main === module) {
  main();
}

module.exports = { startWorker, startAllWorkers };
