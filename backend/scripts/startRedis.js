#!/usr/bin/env node

/**
 * Скрипт для запуска Redis через Docker
 * 
 * Использование:
 * node scripts/startRedis.js
 */

const { spawn } = require('child_process');
const path = require('path');

function startRedisWithDocker() {
  console.log('🐳 Запуск Redis через Docker...');
  
  // Проверяем, установлен ли Docker
  const dockerCheck = spawn('docker', ['--version'], { stdio: 'pipe' });
  
  dockerCheck.on('error', (error) => {
    console.error('❌ Docker не найден. Установите Docker Desktop для Windows');
    console.log('💡 Скачайте с: https://www.docker.com/products/docker-desktop');
    process.exit(1);
  });

  dockerCheck.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Docker найден');
      startRedisContainer();
    } else {
      console.error('❌ Docker не работает');
      process.exit(1);
    }
  });
}

function startRedisContainer() {
  console.log('🚀 Запуск контейнера Redis...');
  
  const dockerRun = spawn('docker', [
    'run',
    '-d',
    '--name', 'redis-queue',
    '-p', '6379:6379',
    'redis:latest'
  ], { stdio: 'inherit' });

  dockerRun.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis контейнер запущен успешно!');
      console.log('📋 Информация:');
      console.log('   - Host: localhost');
      console.log('   - Port: 6379');
      console.log('   - Container: redis-queue');
      console.log('\n🧪 Тестирование подключения...');
      
      // Ждем немного и тестируем подключение
      setTimeout(() => {
        const testRedis = require('./testRedisConnection');
        testRedis.testRedisConnection();
      }, 3000);
      
    } else {
      console.log('⚠️ Контейнер Redis уже существует или произошла ошибка');
      console.log('💡 Попробуйте:');
      console.log('   docker stop redis-queue');
      console.log('   docker rm redis-queue');
      console.log('   node scripts/startRedis.js');
    }
  });
}

function stopRedisContainer() {
  console.log('🛑 Остановка Redis контейнера...');
  
  const dockerStop = spawn('docker', ['stop', 'redis-queue'], { stdio: 'inherit' });
  
  dockerStop.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis контейнер остановлен');
      
      const dockerRm = spawn('docker', ['rm', 'redis-queue'], { stdio: 'inherit' });
      dockerRm.on('close', (rmCode) => {
        if (rmCode === 0) {
          console.log('✅ Redis контейнер удален');
        }
      });
    }
  });
}

function showRedisStatus() {
  console.log('📊 Статус Redis контейнеров:');
  
  const dockerPs = spawn('docker', ['ps', '-a', '--filter', 'name=redis-queue'], { stdio: 'inherit' });
  
  dockerPs.on('close', (code) => {
    console.log('\n💡 Команды для управления Redis:');
    console.log('   Запуск:   node scripts/startRedis.js');
    console.log('   Остановка: docker stop redis-queue');
    console.log('   Удаление:  docker rm redis-queue');
    console.log('   Логи:     docker logs redis-queue');
  });
}

// Обработка аргументов командной строки
const command = process.argv[2];

switch (command) {
  case 'start':
    startRedisWithDocker();
    break;
  case 'stop':
    stopRedisContainer();
    break;
  case 'status':
    showRedisStatus();
    break;
  default:
    console.log('🐳 Управление Redis через Docker\n');
    console.log('Использование:');
    console.log('  node scripts/startRedis.js start   - Запустить Redis');
    console.log('  node scripts/startRedis.js stop    - Остановить Redis');
    console.log('  node scripts/startRedis.js status  - Показать статус');
    console.log('\nПо умолчанию запускается Redis...\n');
    startRedisWithDocker();
}

module.exports = { startRedisWithDocker, stopRedisContainer, showRedisStatus };
