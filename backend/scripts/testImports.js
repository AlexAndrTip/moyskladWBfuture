/**
 * Тестовый скрипт для проверки корректности импортов
 */

console.log('🧪 Тестирование импортов...\n');

try {
  console.log('1. Тестируем импорт сервиса остатков...');
  const wbRemainsService = require('../src/services/wbRemainsService');
  console.log('✅ Сервис остатков импортирован успешно');

  console.log('\n2. Тестируем импорт контроллера остатков...');
  const wbRemainsController = require('../src/controllers/wbRemainsController');
  console.log('✅ Контроллер остатков импортирован успешно');

  console.log('\n3. Тестируем импорт маршрутов остатков...');
  const wbRemainsRoutes = require('../src/routes/wbRemainsRoutes');
  console.log('✅ Маршруты остатков импортированы успешно');

  console.log('\n4. Тестируем импорт middleware...');
  const { protect } = require('../src/middleware/authMiddleware');
  console.log('✅ Middleware аутентификации импортирован успешно');

  console.log('\n5. Тестируем импорт модели WbCabinet...');
  const WbCabinet = require('../src/models/WbCabinet');
  console.log('✅ Модель WbCabinet импортирована успешно');

  console.log('\n6. Тестируем импорт модели Product...');
  const Product = require('../src/models/Product');
  console.log('✅ Модель Product импортирована успешно');

  console.log('\n🎉 Все импорты работают корректно!');
  console.log('\n📋 Проверенные компоненты:');
  console.log('   - Сервис остатков FBY');
  console.log('   - Контроллер остатков FBY');
  console.log('   - Маршруты остатков FBY');
  console.log('   - Middleware аутентификации');
  console.log('   - Модели БД');

} catch (error) {
  console.error('❌ Ошибка при импорте:', error.message);
  console.error('   Стек ошибки:', error.stack);
  process.exit(1);
}
