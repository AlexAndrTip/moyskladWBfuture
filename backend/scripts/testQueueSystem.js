/**
 * Тестовый скрипт для проверки системы очередей
 * 
 * Использование:
 * node scripts/testQueueSystem.js
 * 
 * Перед запуском убедитесь, что:
 * 1. Сервер запущен
 * 2. Redis запущен и доступен
 * 3. В БД есть пользователи с WB кабинетами
 * 4. У WB кабинетов есть валидные токены
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3900';

async function testQueueSystem() {
  try {
    console.log('🧪 Тестирование системы очередей...\n');

    // 1. Получаем список пользователей
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

    // 2. Получаем WB кабинеты
    console.log('\n2. Получаем WB кабинеты...');
    const cabinetsResponse = await axios.get(`${API_BASE_URL}/api/wbcabinets`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (cabinetsResponse.data && cabinetsResponse.data.length > 0) {
      console.log(`✅ Найдено WB кабинетов: ${cabinetsResponse.data.length}`);
      const testCabinet = cabinetsResponse.data[0];
      console.log(`   Тестовый кабинет: ${testCabinet.name} (${testCabinet._id})`);
    } else {
      console.log('❌ WB кабинеты не найдены');
      return;
    }

    // 3. Тестируем добавление задачи обновления цен WB
    console.log('\n3. Тестируем добавление задачи обновления цен WB...');
    try {
      const priceTaskResponse = await axios.post(`${API_BASE_URL}/api/queue/tasks`, {
        type: 'WB_PRICE_UPDATE',
        data: {
          cabinetId: cabinetsResponse.data[0]._id,
          userId: usersResponse.data[0]._id,
          limit: 10,
          offset: 0
        },
        options: {
          priority: 7,
          cabinetName: cabinetsResponse.data[0].name,
          maxAttempts: 3
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (priceTaskResponse.data && priceTaskResponse.data.success) {
        console.log(`✅ Задача обновления цен WB добавлена успешно`);
        console.log(`   Task ID: ${priceTaskResponse.data.data.taskId}`);
      } else {
        console.log('❌ Ошибка добавления задачи обновления цен WB');
      }
    } catch (priceTaskError) {
      console.log(`❌ Ошибка при добавлении задачи обновления цен WB:`);
      console.log(`   Статус: ${priceTaskError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${priceTaskError.response?.data?.message || priceTaskError.message}`);
    }

    // 4. Тестируем добавление задачи обновления остатков WB
    console.log('\n4. Тестируем добавление задачи обновления остатков WB...');
    try {
      const remainsTaskResponse = await axios.post(`${API_BASE_URL}/api/queue/tasks`, {
        type: 'WB_REMAINS_UPDATE',
        data: {
          cabinetId: cabinetsResponse.data[0]._id,
          userId: usersResponse.data[0]._id
        },
        options: {
          priority: 6,
          cabinetName: cabinetsResponse.data[0].name,
          maxAttempts: 3
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (remainsTaskResponse.data && remainsTaskResponse.data.success) {
        console.log(`✅ Задача обновления остатков WB добавлена успешно`);
        console.log(`   Task ID: ${remainsTaskResponse.data.data.taskId}`);
      } else {
        console.log('❌ Ошибка добавления задачи обновления остатков WB');
      }
    } catch (remainsTaskError) {
      console.log(`❌ Ошибка при добавлении задачи обновления остатков WB:`);
      console.log(`   Статус: ${remainsTaskError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${remainsTaskError.response?.data?.message || remainsTaskError.message}`);
    }

    // 5. Получаем задачи пользователя
    console.log('\n5. Получаем задачи пользователя...');
    try {
      const userTasksResponse = await axios.get(`${API_BASE_URL}/api/queue/tasks?limit=10`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (userTasksResponse.data && userTasksResponse.data.success) {
        console.log(`✅ Задачи пользователя получены успешно`);
        console.log(`   Всего задач: ${userTasksResponse.data.data.pagination.total}`);
        console.log(`   Задач на странице: ${userTasksResponse.data.data.tasks.length}`);
        
        userTasksResponse.data.data.tasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.type} - ${task.status} (${task.createdAt})`);
        });
      } else {
        console.log('❌ Ошибка получения задач пользователя');
      }
    } catch (userTasksError) {
      console.log(`❌ Ошибка при получении задач пользователя:`);
      console.log(`   Статус: ${userTasksError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${userTasksError.response?.data?.message || userTasksError.message}`);
    }

    // 6. Получаем статистику очередей
    console.log('\n6. Получаем статистику очередей...');
    try {
      const statsResponse = await axios.get(`${API_BASE_URL}/api/queue/stats`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.data && statsResponse.data.success) {
        console.log(`✅ Статистика очередей получена успешно`);
        
        Object.entries(statsResponse.data.data).forEach(([queueType, stats]) => {
          console.log(`   ${queueType}:`);
          console.log(`     - Длина очереди: ${stats.queueLength}`);
          console.log(`     - Статистика задач:`, stats.taskStats);
        });
      } else {
        console.log('❌ Ошибка получения статистики очередей');
      }
    } catch (statsError) {
      console.log(`❌ Ошибка при получении статистики очередей:`);
      console.log(`   Статус: ${statsError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${statsError.response?.data?.message || statsError.message}`);
    }

    // 7. Тестируем добавление задачи с неверным типом
    console.log('\n7. Тестируем добавление задачи с неверным типом...');
    try {
      const invalidTaskResponse = await axios.post(`${API_BASE_URL}/api/queue/tasks`, {
        type: 'INVALID_TASK_TYPE',
        data: {
          cabinetId: cabinetsResponse.data[0]._id,
          userId: usersResponse.data[0]._id
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('❌ Задача с неверным типом была добавлена (это не должно было произойти)');
    } catch (invalidTaskError) {
      if (invalidTaskError.response?.status === 400) {
        console.log(`✅ Задача с неверным типом правильно отклонена`);
        console.log(`   Сообщение: ${invalidTaskError.response.data.message}`);
      } else {
        console.log(`❌ Неожиданная ошибка при тестировании неверного типа задачи:`);
        console.log(`   Статус: ${invalidTaskError.response?.status || 'N/A'}`);
        console.log(`   Сообщение: ${invalidTaskError.response?.data?.message || invalidTaskError.message}`);
      }
    }

    console.log('\n🎉 Тестирование системы очередей завершено!');
    console.log('\n📋 Резюме:');
    console.log('   - Система очередей должна корректно добавлять задачи');
    console.log('   - Воркеры должны обрабатывать задачи из очереди');
    console.log('   - API должен возвращать корректную статистику');
    console.log('   - Проверьте логи сервера и воркеров для детальной информации');

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
  testQueueSystem();
}

module.exports = { testQueueSystem };
