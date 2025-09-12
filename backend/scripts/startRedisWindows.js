#!/usr/bin/env node

/**
 * Скрипт для запуска Redis на Windows
 * 
 * Использование:
 * node scripts/startRedisWindows.js
 */

const { spawn, exec } = require('child_process');
const os = require('os');

function checkWindows() {
  if (os.platform() !== 'win32') {
    console.log('❌ Этот скрипт предназначен только для Windows');
    process.exit(1);
  }
}

function checkRedisInstalled() {
  return new Promise((resolve) => {
    exec('redis-server --version', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Redis не установлен');
        resolve(false);
      } else {
        console.log(`✅ Redis найден: ${stdout.trim()}`);
        resolve(true);
      }
    });
  });
}

function startRedisService() {
  console.log('🚀 Запуск Redis как службы Windows...');
  
  const startService = spawn('redis-server', ['--service-start'], { 
    stdio: 'inherit',
    shell: true 
  });

  startService.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Служба Redis запущена');
      console.log('🧪 Тестирование подключения...');
      
      setTimeout(() => {
        const testRedis = require('./testRedisConnection');
        testRedis.testRedisConnection();
      }, 3000);
    } else {
      console.log('❌ Ошибка запуска службы Redis');
      console.log('💡 Попробуйте:');
      console.log('   1. Установить Redis: node scripts/installRedisWindows.js');
      console.log('   2. Запустить вручную: redis-server --service-start');
    }
  });
}

function startRedisManual() {
  console.log('🚀 Запуск Redis вручную...');
  console.log('⚠️ Redis будет работать в текущем окне. Закройте окно для остановки.');
  
  const redisServer = spawn('redis-server', [], { 
    stdio: 'inherit',
    shell: true 
  });

  redisServer.on('error', (error) => {
    console.error('❌ Ошибка запуска Redis:', error.message);
    console.log('💡 Установите Redis: node scripts/installRedisWindows.js');
  });

  redisServer.on('close', (code) => {
    console.log(`🛑 Redis остановлен с кодом: ${code}`);
  });

  // Обработка сигналов завершения
  process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал завершения, останавливаем Redis...');
    redisServer.kill('SIGTERM');
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM, останавливаем Redis...');
    redisServer.kill('SIGTERM');
  });
}

function showRedisStatus() {
  console.log('📊 Проверка статуса Redis...');
  
  exec('sc query Redis', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ Служба Redis не найдена');
      console.log('💡 Установите Redis: node scripts/installRedisWindows.js');
    } else {
      console.log('📋 Статус службы Redis:');
      console.log(stdout);
    }
  });
}

function stopRedisService() {
  console.log('🛑 Остановка службы Redis...');
  
  const stopService = spawn('redis-server', ['--service-stop'], { 
    stdio: 'inherit',
    shell: true 
  });

  stopService.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Служба Redis остановлена');
    } else {
      console.log('❌ Ошибка остановки службы Redis');
    }
  });
}

async function main() {
  checkWindows();
  
  const command = process.argv[2];

  switch (command) {
    case 'service':
      const isInstalled = await checkRedisInstalled();
      if (isInstalled) {
        startRedisService();
      } else {
        console.log('💡 Установите Redis: node scripts/installRedisWindows.js');
      }
      break;
      
    case 'manual':
      const isInstalledManual = await checkRedisInstalled();
      if (isInstalledManual) {
        startRedisManual();
      } else {
        console.log('💡 Установите Redis: node scripts/installRedisWindows.js');
      }
      break;
      
    case 'stop':
      stopRedisService();
      break;
      
    case 'status':
      showRedisStatus();
      break;
      
    default:
      console.log('🪟 Запуск Redis на Windows\n');
      console.log('Использование:');
      console.log('  node scripts/startRedisWindows.js service  - Запустить как службу');
      console.log('  node scripts/startRedisWindows.js manual   - Запустить вручную');
      console.log('  node scripts/startRedisWindows.js stop     - Остановить службу');
      console.log('  node scripts/startRedisWindows.js status   - Показать статус');
      console.log('\nПо умолчанию запускается как служба...\n');
      
      const isInstalled = await checkRedisInstalled();
      if (isInstalled) {
        startRedisService();
      } else {
        console.log('💡 Установите Redis: node scripts/installRedisWindows.js');
      }
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

module.exports = { 
  startRedisService, 
  startRedisManual, 
  stopRedisService, 
  showRedisStatus 
};
