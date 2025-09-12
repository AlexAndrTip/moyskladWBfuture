#!/usr/bin/env node

/**
 * Скрипт для установки Redis на Windows
 * 
 * Использование:
 * node scripts/installRedisWindows.js
 */

const { spawn, exec } = require('child_process');
const os = require('os');

function checkWindows() {
  if (os.platform() !== 'win32') {
    console.log('❌ Этот скрипт предназначен только для Windows');
    process.exit(1);
  }
}

function checkChocolatey() {
  return new Promise((resolve) => {
    exec('choco --version', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Chocolatey не установлен');
        resolve(false);
      } else {
        console.log(`✅ Chocolatey найден: ${stdout.trim()}`);
        resolve(true);
      }
    });
  });
}

function installChocolatey() {
  console.log('🍫 Установка Chocolatey...');
  console.log('⚠️ Запустите PowerShell от имени администратора и выполните:');
  console.log('');
  console.log('Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))');
  console.log('');
  console.log('После установки Chocolatey запустите этот скрипт снова.');
  process.exit(0);
}

function installRedis() {
  console.log('📦 Установка Redis через Chocolatey...');
  
  const choco = spawn('choco', ['install', 'redis-64', '-y'], { 
    stdio: 'inherit',
    shell: true 
  });

  choco.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis установлен успешно!');
      console.log('🚀 Запуск Redis как службы...');
      startRedisService();
    } else {
      console.log('❌ Ошибка установки Redis');
      process.exit(1);
    }
  });
}

function startRedisService() {
  console.log('🔧 Настройка Redis как службы Windows...');
  
  const installService = spawn('redis-server', ['--service-install'], { 
    stdio: 'inherit',
    shell: true 
  });

  installService.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Служба Redis установлена');
      
      const startService = spawn('redis-server', ['--service-start'], { 
        stdio: 'inherit',
        shell: true 
      });

      startService.on('close', (startCode) => {
        if (startCode === 0) {
          console.log('✅ Служба Redis запущена');
          console.log('🧪 Тестирование подключения...');
          
          setTimeout(() => {
            const testRedis = require('./testRedisConnection');
            testRedis.testRedisConnection();
          }, 3000);
        } else {
          console.log('❌ Ошибка запуска службы Redis');
          console.log('💡 Попробуйте запустить вручную:');
          console.log('   redis-server --service-start');
        }
      });
    } else {
      console.log('❌ Ошибка установки службы Redis');
      console.log('💡 Попробуйте запустить вручную:');
      console.log('   redis-server --service-install');
      console.log('   redis-server --service-start');
    }
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

function uninstallRedisService() {
  console.log('🗑️ Удаление службы Redis...');
  
  const uninstallService = spawn('redis-server', ['--service-uninstall'], { 
    stdio: 'inherit',
    shell: true 
  });

  uninstallService.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Служба Redis удалена');
    } else {
      console.log('❌ Ошибка удаления службы Redis');
    }
  });
}

async function main() {
  checkWindows();
  
  const command = process.argv[2];

  switch (command) {
    case 'install':
      const hasChoco = await checkChocolatey();
      if (!hasChoco) {
        installChocolatey();
      } else {
        installRedis();
      }
      break;
      
    case 'start':
      startRedisService();
      break;
      
    case 'stop':
      stopRedisService();
      break;
      
    case 'status':
      showRedisStatus();
      break;
      
    case 'uninstall':
      uninstallRedisService();
      break;
      
    default:
      console.log('🪟 Установка Redis на Windows\n');
      console.log('Использование:');
      console.log('  node scripts/installRedisWindows.js install   - Установить Redis');
      console.log('  node scripts/installRedisWindows.js start     - Запустить службу');
      console.log('  node scripts/installRedisWindows.js stop      - Остановить службу');
      console.log('  node scripts/installRedisWindows.js status    - Показать статус');
      console.log('  node scripts/installRedisWindows.js uninstall - Удалить службу');
      console.log('\nПо умолчанию начинается установка...\n');
      
      const hasChoco = await checkChocolatey();
      if (!hasChoco) {
        installChocolatey();
      } else {
        installRedis();
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
  installRedis, 
  startRedisService, 
  stopRedisService, 
  showRedisStatus 
};
