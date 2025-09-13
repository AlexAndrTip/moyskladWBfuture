#!/usr/bin/env node

/**
 * Скрипт для проверки подключения к Redis
 * 
 * Использование:
 * node scripts/testRedisConnection.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('🧪 Тестирование подключения к Redis...\n');

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  };

  console.log('📋 Конфигурация Redis:');
  console.log(`   Host: ${redisConfig.host}`);
  console.log(`   Port: ${redisConfig.port}`);
  console.log(`   Password: ${redisConfig.password ? '*****' : 'не установлен'}`);
  console.log(`   Database: ${redisConfig.db}`);

  const redis = new Redis(redisConfig);

  try {
    console.log('\n🔄 Попытка подключения к Redis...');
    
    redis.on('connect', () => {
      console.log('✅ Подключение к Redis установлено');
    });

    redis.on('error', (error) => {
      console.error('❌ Ошибка Redis:', error.message);
    });

    redis.on('close', () => {
      console.log('⚠️ Подключение к Redis закрыто');
    });

    // Подключаемся
    await redis.connect();
    console.log('✅ Успешное подключение к Redis!');

    // Тестируем базовые операции
    console.log('\n🧪 Тестирование базовых операций...');
    
    // SET/GET
    await redis.set('test:key', 'test:value');
    const value = await redis.get('test:key');
    console.log(`✅ SET/GET: ${value}`);

    // Sorted Set (для очередей)
    await redis.zadd('test:queue', 5, JSON.stringify({ id: 'test1', priority: 5 }));
    await redis.zadd('test:queue', 10, JSON.stringify({ id: 'test2', priority: 10 }));
    
    const queueLength = await redis.zcard('test:queue');
    console.log(`✅ Sorted Set: длина очереди = ${queueLength}`);
    
    const highestPriority = await redis.zpopmax('test:queue');
    console.log(`✅ ZPOPMAX: ${highestPriority[0]}`);

    // Очистка тестовых данных
    await redis.del('test:key');
    await redis.del('test:queue');
    console.log('✅ Тестовые данные очищены');

    // Получаем информацию о Redis
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'неизвестно';
    console.log(`📊 Версия Redis: ${version}`);

    console.log('\n🎉 Все тесты Redis прошли успешно!');
    console.log('✅ Redis готов к работе с системой очередей');

  } catch (error) {
    console.error('\n❌ Ошибка подключения к Redis:');
    console.error(`   Сообщение: ${error.message}`);
    console.error(`   Код: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Возможные решения:');
      console.log('   1. Убедитесь, что Redis сервер запущен');
      console.log('   2. Проверьте настройки подключения в .env файле');
      console.log('   3. Установите Redis:');
      console.log('      - Windows: choco install redis-64');
      console.log('      - WSL: sudo apt install redis-server');
      console.log('      - Docker: docker run -d -p 6379:6379 redis:latest');
    }
    
    process.exit(1);
  } finally {
    await redis.quit();
    console.log('\n🔌 Соединение с Redis закрыто');
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

// Запускаем тест
if (require.main === module) {
  testRedisConnection();
}

module.exports = { testRedisConnection };
