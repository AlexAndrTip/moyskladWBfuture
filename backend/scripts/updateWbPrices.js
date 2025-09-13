// backend/scripts/updateWbPrices.js
const axios = require('axios');

// Конфигурация
const BASE_URL = process.env.BASE_URL || 'http://localhost:3900';
const API_TOKEN = process.env.API_TOKEN;
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || 3600000; // 1 час по умолчанию

if (!API_TOKEN) {
  console.error('❌ Ошибка: API_TOKEN не установлен');
  console.error('Установите переменную окружения API_TOKEN');
  console.error('Пример: export API_TOKEN="your_jwt_token"');
  process.exit(1);
}

// Функция для обновления цен
async function updateWbPrices() {
  try {
    console.log(`🕐 [${new Date().toISOString()}] Запуск обновления цен...`);
    
    const response = await axios.get(`${BASE_URL}/api/wb-prices/update`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 минут таймаут
    });

    if (response.data.success) {
      const { totalProducts, totalUpdated, totalErrors, batchesProcessed } = response.data.data;
      console.log(`✅ Обновление завершено успешно!`);
      console.log(`   📦 Всего товаров: ${totalProducts}`);
      console.log(`   ✅ Обновлено: ${totalUpdated}`);
      console.log(`   ❌ Ошибок: ${totalErrors}`);
      console.log(`   🔄 Обработано батчей: ${batchesProcessed}`);
    } else {
      console.error(`❌ Ошибка обновления: ${response.data.message}`);
    }

  } catch (error) {
    console.error(`❌ Ошибка при обновлении цен: ${error.message}`);
    if (error.response) {
      console.error(`   Статус: ${error.response.status}`);
      console.error(`   Ответ: ${JSON.stringify(error.response.data)}`);
    }
  }
}



// Основная функция
async function main() {
  console.log('🚀 Запуск скрипта обновления цен WB');
  console.log('=====================================');
  console.log(`🌐 Базовый URL: ${BASE_URL}`);
  console.log(`⏰ Интервал обновления: ${UPDATE_INTERVAL / 60000} минут`);
  console.log(`🔑 API токен: ${API_TOKEN ? 'Установлен' : 'Не установлен'}`);
  
  // Первое обновление
  await updateWbPrices();
  
  // Установка периодического обновления
  setInterval(async () => {
    await updateWbPrices();
  }, UPDATE_INTERVAL);
  
  console.log(`\n🔄 Автоматическое обновление настроено каждые ${UPDATE_INTERVAL / 60000} минут`);
  console.log('💡 Для остановки нажмите Ctrl+C');
  
  // Обработка сигнала завершения
  process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал завершения, скрипт остановлен');
    process.exit(0);
  });
}

// Запуск скрипта
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { updateWbPrices, main }; 