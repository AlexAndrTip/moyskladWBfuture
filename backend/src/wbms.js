// backend/src/wbms.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Загружаем переменные окружения

// Проверяем загрузку переменных сразу после dotenv
console.log('=== Проверка после загрузки dotenv ===');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '*****' : 'UNDEFINED');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('=====================================');

const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const cors = require('cors'); // <-- Добавляем импорт пакета 'cors'
const storageRoutes = require('./routes/storageRoutes'); // ипорт управления складами
const wbCabinetRoutes = require('./routes/wbCabinetRoutes'); // ЛК WB
const integrationLinkRoutes = require('./routes/integrationLinkRoutes'); // связки склад и вб
const productRoutes = require('./routes/productRoutes'); // товары ВБ
const organizationRoutes = require('./routes/organizationRoutes'); // <-- ДОБАВЛЕНО: Импорт роутов организаций
const uslugiRoutes = require('./routes/UslugiRouters'); // <-- ДОБАВЛЕНО: Импорт роутов услуг
const settingsRoutes = require('./routes/settingsRoutes'); // <-- ДОБАВЛЕНО: Импорт роутов настроек
const cron = require('node-cron');
const postavkiRoutes = require('./routes/postavkiRoutes');
const reportRoutes = require('./routes/reportRoutes'); // <-- Импорт роутов отчетов
// const queueRoutes = require('./routes/queueRoutes'); // <-- Временно отключаем очереди
const reportCleanup = require('./services/reportsCleanupService');
const limitRoutes = require('./routes/limitRoutes'); // <-- ДОБАВЛЕНО: Импорт роутов лимитов


const app = express();

// --- Добавленные строки для отладки ---
// Проверяем, загрузились ли переменные окружения
console.log('--- Проверка переменных окружения ---');
console.log('process.env.PORT:', process.env.PORT);
console.log('process.env.MONGO_URI:', process.env.MONGO_URI);
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET ? '*****' : 'UNDEFINED'); // Скрываем реальный секрет
console.log('process.env.SMTP_HOST:', process.env.SMTP_HOST);
console.log('process.env.SMTP_USER:', process.env.SMTP_USER);
console.log('process.env.SMTP_PASS:', process.env.SMTP_PASS ? '*****' : 'UNDEFINED');
console.log('process.env.FRONTEND_URL:', process.env.FRONTEND_URL);

console.log('------------------------------------');
// --- Конец добавленных строк ---


const PORT = process.env.PORT || 3900;
const MONGO_URI = process.env.MONGO_URI;

// --- Обновлённый CORS middleware ---
app.use(cors({
  origin: ['http://localhost:5173', 'http://217.15.53.224:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));
// --- Конец обновлённого CORS middleware ---

// Middleware для парсинга JSON-тела запросов
app.use(express.json());

// Middleware для парсинга JSON-тела запросов
app.use(express.json());

// Подключение к MongoDB
if (!MONGO_URI) {
  console.error('Ошибка: MONGO_URI не определен в файле .env или не загружен.');
  console.error('Пожалуйста, убедитесь, что файл .env находится в папке backend/ и содержит MONGO_URI.');
  process.exit(1); // Завершаем процесс, если нет URI для подключения к БД
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message); // Выводим только сообщение об ошибке
    console.error('Возможные причины:');
    console.error('1. MongoDB сервер не запущен.');
    console.error('2. Неверная строка подключения MONGO_URI в .env.');
    console.error('3. Проблемы с сетевым подключением к MongoDB.');
    process.exit(1); // Завершаем процесс при ошибке подключения к БД
  });

// Маршруты
app.use('/api/auth', authRoutes); // Маршруты для аутентификации
app.use('/api/subscription', subscriptionRoutes); // Маршруты для подписок
app.use('/api/users', userRoutes); // Маршруты для управления пользователями (защищенные)
app.use('/api/storages', storageRoutes);
app.use('/api/wbcabinets', wbCabinetRoutes);
app.use('/api/integration-links', integrationLinkRoutes);
app.use('/api/products', productRoutes);
app.use('/api/organizations', organizationRoutes); // <-- ДОБАВЛЕНО: Подключение роутов организаций
app.use('/api/uslugi', uslugiRoutes); // <-- ДОБАВЛЕНО: Подключение роутов услуг
app.use('/api/settings', settingsRoutes); // <-- ДОБАВЛЕНО: Подключение роутов настроек
app.use('/api/postavki', postavkiRoutes);
app.use('/api/reports', reportRoutes); // <-- Подключение роутов отчетов
app.use('/api/limits', limitRoutes); // <-- Подключение роутов лимитов
// app.use('/api/queue', queueRoutes); // <-- Подключение роутов очередей
require('./models/OrganizationLink'); // <-- ДОБАВЛЕНО: Убедитесь, что модель загружается
require('./models/Organization'); // <-- Убедитесь, что эта модель тоже загружается, если она используется
require('./models/Uslugi'); // <-- ДОБАВЛЕНО: Загружаем модель услуг
require('./models/StatRashodov'); // <-- ДОБАВЛЕНО: Загружаем модель статей расходов
require('./models/Settings'); // <-- ДОБАВЛЕНО: Загружаем модель настроек
require('./models/Report'); // <-- ДОБАВЛЕНО: Загружаем модель отчетов
// ... (другие require('./models/')) ...


// Простой корневой маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('WBMS Backend is running!');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Запускаем ежедневную очистку старых отчётов
  reportCleanup.scheduleDailyCleanup();
});
