/**
 * Тестовый скрипт для проверки WB Statistics API
 * 
 * Использование:
 * node scripts/testWbStatistics.js
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Конфигурация
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3900';
const TEST_TOKEN = process.env.TEST_JWT_TOKEN; // Токен для тестирования

if (!TEST_TOKEN) {
  console.error('❌ Ошибка: Не указан TEST_JWT_TOKEN в .env файле');
  console.log('Для тестирования создайте JWT токен и добавьте его в .env как TEST_JWT_TOKEN');
  process.exit(1);
}

// Функция для выполнения HTTP запросов
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Ошибка запроса: ${error.message}`);
    }
  }
}

// Тестовые функции
async function testGetStats() {
  console.log('\n📊 Тестируем получение статистики остатков FBY...');
  
  try {
    const result = await makeRequest('GET', '/api/wb-statistics/stats');
    console.log('✅ Статистика получена успешно:');
    console.log(`   - Всего товаров: ${result.overall.totalProducts}`);
    console.log(`   - Товаров с остатками: ${result.overall.totalWithStock}`);
    console.log(`   - Общий остаток: ${result.overall.totalStockQuantity}`);
    console.log(`   - Кабинетов: ${result.byCabinet.length}`);
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка при получении статистики:', error.message);
    return null;
  }
}

async function testGetFilteredStocks(cabinetId) {
  console.log('\n🔍 Тестируем получение отфильтрованных остатков...');
  
  try {
    const result = await makeRequest('GET', `/api/wb-statistics/stocks/${cabinetId}?dateFrom=2019-06-20`);
    console.log('✅ Отфильтрованные остатки получены успешно:');
    console.log(`   - Найдено записей: ${result.totalRecords}`);
    console.log(`   - Кабинет: ${result.cabinetName}`);
    console.log(`   - Дата: ${result.dateFrom}`);
    
    if (result.data && result.data.length > 0) {
      console.log('   - Пример записи:');
      const sample = result.data[0];
      console.log(`     * Баркод: ${sample.barcode}`);
      console.log(`     * Количество: ${sample.quantity}`);
      console.log(`     * Склад: ${sample.warehouseName}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка при получении отфильтрованных остатков:', error.message);
    return null;
  }
}

async function testUpdateStocks(cabinetId) {
  console.log('\n🔄 Тестируем обновление остатков FBY...');
  
  try {
    const result = await makeRequest('POST', `/api/wb-statistics/update-stocks/${cabinetId}`, {
      dateFrom: '2019-06-20',
      filters: {
        // Можно добавить фильтры для тестирования
      }
    });
    
    console.log('✅ Обновление остатков завершено:');
    console.log(`   - Кабинет: ${result.cabinetName}`);
    console.log(`   - Успешно: ${result.success}`);
    console.log(`   - Всего записей: ${result.total}`);
    console.log(`   - Уникальных баркодов: ${result.uniqueBarcodes}`);
    console.log(`   - Обновлено товаров: ${result.updated}`);
    console.log(`   - Не найдено: ${result.notFound}`);
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка при обновлении остатков:', error.message);
    return null;
  }
}

async function testStatisticsApi(cabinetId) {
  console.log('\n🧪 Тестируем Statistics API...');
  
  try {
    const result = await makeRequest('GET', `/api/wb-statistics/test/${cabinetId}?dateFrom=2019-06-20`);
    console.log('✅ Тест Statistics API прошел успешно:');
    console.log(`   - Кабинет: ${result.cabinetName}`);
    console.log(`   - Дата: ${result.dateFrom}`);
    console.log(`   - Найдено записей: ${result.totalRecords}`);
    console.log(`   - Примеры данных: ${result.sampleData.length} записей`);
    
    if (result.sampleData && result.sampleData.length > 0) {
      console.log('   - Первая запись:');
      const sample = result.sampleData[0];
      console.log(`     * Баркод: ${sample.barcode}`);
      console.log(`     * Количество: ${sample.quantity}`);
      console.log(`     * Артикул WB: ${sample.nmId}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка при тестировании Statistics API:', error.message);
    return null;
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Запуск тестов WB Statistics API');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  console.log(`🔑 Используется токен: ${TEST_TOKEN.substring(0, 20)}...`);
  
  try {
    // 1. Получаем статистику
    const stats = await testGetStats();
    
    if (!stats || stats.byCabinet.length === 0) {
      console.log('\n⚠️ Нет доступных кабинетов для тестирования');
      console.log('Убедитесь, что у пользователя есть настроенные WB кабинеты');
      return;
    }
    
    // Берем первый кабинет для тестирования
    const testCabinetId = stats.byCabinet[0].cabinetId;
    console.log(`\n🎯 Используем кабинет для тестирования: ${stats.byCabinet[0].cabinetName} (${testCabinetId})`);
    
    // 2. Тестируем Statistics API
    await testStatisticsApi(testCabinetId);
    
    // 3. Получаем отфильтрованные остатки
    await testGetFilteredStocks(testCabinetId);
    
    // 4. Обновляем остатки (осторожно - это может занять время)
    console.log('\n⚠️ Внимание: Следующий тест обновит остатки в базе данных');
    console.log('Нажмите Ctrl+C для отмены или подождите 5 секунд...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await testUpdateStocks(testCabinetId);
    
    console.log('\n✅ Все тесты завершены успешно!');
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка при выполнении тестов:', error.message);
  }
}

// Запуск тестов
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testGetStats,
  testGetFilteredStocks,
  testUpdateStocks,
  testStatisticsApi,
  runTests
};
