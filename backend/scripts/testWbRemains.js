/**
 * Тестовый скрипт для проверки API остатков FBY WB
 * 
 * Использование:
 * node scripts/testWbRemains.js
 * 
 * Перед запуском убедитесь, что:
 * 1. Сервер запущен
 * 2. В БД есть пользователи с WB кабинетами
 * 3. У WB кабинетов есть валидные токены
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3900';

async function testWbRemainsApi() {
  try {
    console.log('🧪 Тестирование API остатков FBY WB...\n');

    // 1. Получаем список пользователей (для тестирования)
    console.log('1. Получаем список пользователей...');
    const usersResponse = await axios.get(`${API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.data && usersResponse.data.length > 0) {
      console.log(`✅ Найдено пользователей: ${usersResponse.data.length}`);
      const testUser = usersResponse.data[0];
      console.log(`   Тестовый пользователь: ${testUser.username} (${testUser._id})`);
    } else {
      console.log('❌ Пользователи не найдены');
      return;
    }

    // 2. Получаем WB кабинеты пользователя
    console.log('\n2. Получаем WB кабинеты...');
    const cabinetsResponse = await axios.get(`${API_BASE_URL}/api/wbcabinets`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (cabinetsResponse.data && cabinetsResponse.data.length > 0) {
      console.log(`✅ Найдено WB кабинетов: ${cabinetsResponse.data.length}`);
      cabinetsResponse.data.forEach((cabinet, index) => {
        console.log(`   ${index + 1}. ${cabinet.name} (${cabinet._id})`);
      });
    } else {
      console.log('❌ WB кабинеты не найдены');
      return;
    }

    // 3. Тестируем создание отчета остатков
    console.log('\n3. Тестируем создание отчета остатков...');
    const testCabinetId = cabinetsResponse.data[0]._id;
    
    try {
      const testResponse = await axios.get(`${API_BASE_URL}/api/wb-remains/test/${testCabinetId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (testResponse.data && testResponse.data.taskId) {
        console.log(`✅ Тест создания отчета прошел успешно`);
        console.log(`   TaskId: ${testResponse.data.taskId}`);
        console.log(`   Кабинет: ${testResponse.data.cabinetName}`);
      } else {
        console.log('❌ Неверный ответ от тестового API');
      }
    } catch (testError) {
      console.log(`❌ Ошибка при тестировании создания отчета:`);
      console.log(`   Статус: ${testError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${testError.response?.data?.message || testError.message}`);
    }

    // 4. Получаем статистику остатков
    console.log('\n4. Получаем статистику остатков...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/api/wb-remains/stats`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.data) {
        console.log(`✅ Статистика получена успешно`);
        console.log(`   Общее количество товаров: ${statsResponse.data.overall.totalProducts}`);
        console.log(`   Товаров с остатками: ${statsResponse.data.overall.totalWithStock}`);
        console.log(`   Общий остаток: ${statsResponse.data.overall.totalStockQuantity}`);
        console.log(`   Кабинетов: ${statsResponse.data.byCabinet.length}`);
      } else {
        console.log('❌ Неверный ответ от API статистики');
      }
    } catch (statsError) {
      console.log(`❌ Ошибка при получении статистики:`);
      console.log(`   Статус: ${statsError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${statsError.response?.data?.message || statsError.message}`);
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка при тестировании:', error.message);
    if (error.response) {
      console.error(`   Статус: ${error.response.status}`);
      console.error(`   Данные:`, error.response.data);
    }
  }
}

// Запускаем тест
if (require.main === module) {
  testWbRemainsApi();
}

module.exports = { testWbRemainsApi };
