/**
 * Тестовый скрипт для проверки исправления проблемы с загрузкой цен
 * для двух пользователей, использующих один WB кабинет
 * 
 * Использование:
 * node scripts/testPriceFix.js
 * 
 * Перед запуском убедитесь, что:
 * 1. Сервер запущен
 * 2. В БД есть два пользователя с одним WB кабинетом
 * 3. У WB кабинета есть валидный токен
 * 4. У обоих пользователей есть товары с одинаковыми nmID
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3900';

async function testPriceFix() {
  try {
    console.log('🧪 Тестирование исправления проблемы с загрузкой цен...\n');

    // 1. Получаем список пользователей
    console.log('1. Получаем список пользователей...');
    const usersResponse = await axios.get(`${API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.data && usersResponse.data.length >= 2) {
      console.log(`✅ Найдено пользователей: ${usersResponse.data.length}`);
      const user1 = usersResponse.data[0];
      const user2 = usersResponse.data[1];
      console.log(`   Пользователь 1: ${user1.username} (${user1._id})`);
      console.log(`   Пользователь 2: ${user2.username} (${user2._id})`);
    } else {
      console.log('❌ Недостаточно пользователей для тестирования (нужно минимум 2)');
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

    // 3. Получаем товары пользователей
    console.log('\n3. Получаем товары пользователей...');
    const user1 = usersResponse.data[0];
    const user2 = usersResponse.data[1];
    
    // Получаем товары первого пользователя
    const user1ProductsResponse = await axios.get(`${API_BASE_URL}/api/products?userId=${user1._id}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    // Получаем товары второго пользователя
    const user2ProductsResponse = await axios.get(`${API_BASE_URL}/api/products?userId=${user2._id}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (user1ProductsResponse.data && user1ProductsResponse.data.products && user1ProductsResponse.data.products.length > 0) {
      console.log(`✅ Найдено товаров у пользователя 1: ${user1ProductsResponse.data.products.length}`);
    } else {
      console.log('❌ У пользователя 1 нет товаров');
      return;
    }

    if (user2ProductsResponse.data && user2ProductsResponse.data.products && user2ProductsResponse.data.products.length > 0) {
      console.log(`✅ Найдено товаров у пользователя 2: ${user2ProductsResponse.data.products.length}`);
    } else {
      console.log('❌ У пользователя 2 нет товаров');
      return;
    }

    // 4. Проверяем, есть ли товары с одинаковыми nmID
    const user1Products = user1ProductsResponse.data.products;
    const user2Products = user2ProductsResponse.data.products;
    
    const user1NmIDs = user1Products.map(p => p.nmID).filter(Boolean);
    const user2NmIDs = user2Products.map(p => p.nmID).filter(Boolean);
    
    const commonNmIDs = user1NmIDs.filter(nmID => user2NmIDs.includes(nmID));
    
    if (commonNmIDs.length > 0) {
      console.log(`✅ Найдено товаров с одинаковыми nmID: ${commonNmIDs.length}`);
      console.log(`   Общие nmID: ${commonNmIDs.slice(0, 5).join(', ')}${commonNmIDs.length > 5 ? '...' : ''}`);
    } else {
      console.log('⚠️ Товары с одинаковыми nmID не найдены - тест может быть неполным');
    }

    // 5. Тестируем обновление цен для первого пользователя
    console.log('\n5. Тестируем обновление цен для первого пользователя...');
    try {
      const user1PriceResponse = await axios.get(`${API_BASE_URL}/api/wb-prices/update?limit=10`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (user1PriceResponse.data && user1PriceResponse.data.success) {
        console.log(`✅ Обновление цен для пользователя 1 завершено успешно`);
        console.log(`   Обновлено товаров: ${user1PriceResponse.data.data?.totalUpdated || 'N/A'}`);
      } else {
        console.log('❌ Ошибка при обновлении цен для пользователя 1');
      }
    } catch (priceError) {
      console.log(`❌ Ошибка при обновлении цен для пользователя 1:`);
      console.log(`   Статус: ${priceError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${priceError.response?.data?.message || priceError.message}`);
    }

    // 6. Тестируем обновление цен для второго пользователя
    console.log('\n6. Тестируем обновление цен для второго пользователя...');
    try {
      const user2PriceResponse = await axios.get(`${API_BASE_URL}/api/wb-prices/update?limit=10`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
          'Content-Type': 'application/json'
        }
      });

      if (user2PriceResponse.data && user2PriceResponse.data.success) {
        console.log(`✅ Обновление цен для пользователя 2 завершено успешно`);
        console.log(`   Обновлено товаров: ${user2PriceResponse.data.data?.totalUpdated || 'N/A'}`);
      } else {
        console.log('❌ Ошибка при обновлении цен для пользователя 2');
      }
    } catch (priceError) {
      console.log(`❌ Ошибка при обновлении цен для пользователя 2:`);
      console.log(`   Статус: ${priceError.response?.status || 'N/A'}`);
      console.log(`   Сообщение: ${priceError.response?.data?.message || priceError.message}`);
    }

    // 7. Проверяем, что цены обновились для обоих пользователей
    console.log('\n7. Проверяем обновленные цены...');
    
    // Получаем обновленные товары первого пользователя
    const updatedUser1ProductsResponse = await axios.get(`${API_BASE_URL}/api/products?userId=${user1._id}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    // Получаем обновленные товары второго пользователя
    const updatedUser2ProductsResponse = await axios.get(`${API_BASE_URL}/api/products?userId=${user2._id}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`,
        'Content-Type': 'application/json'
      }
    });

    if (updatedUser1ProductsResponse.data && updatedUser1ProductsResponse.data.products) {
      const user1ProductsWithPrices = updatedUser1ProductsResponse.data.products.filter(p => 
        p.sizes && p.sizes.some(s => s.priceWB > 0)
      );
      console.log(`✅ У пользователя 1 товаров с ценами WB: ${user1ProductsWithPrices.length}`);
    }

    if (updatedUser2ProductsResponse.data && updatedUser2ProductsResponse.data.products) {
      const user2ProductsWithPrices = updatedUser2ProductsResponse.data.products.filter(p => 
        p.sizes && p.sizes.some(s => s.priceWB > 0)
      );
      console.log(`✅ У пользователя 2 товаров с ценами WB: ${user2ProductsWithPrices.length}`);
    }

    console.log('\n🎉 Тестирование завершено!');
    console.log('\n📋 Резюме:');
    console.log('   - Исправление должно обеспечить, что каждый пользователь получает цены только для своих товаров');
    console.log('   - Товары с одинаковыми nmID у разных пользователей должны обновляться независимо');
    console.log('   - Проверьте логи сервера для детальной информации о процессе обновления');

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
  testPriceFix();
}

module.exports = { testPriceFix };
