// backend/src/wbms.js
require('dotenv').config();; // Загружаем переменные окружения

const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors'); // <-- Добавляем импорт пакета 'cors'
const storageRoutes = require('./routes/storageRoutes'); // ипорт управления складами
const wbCabinetRoutes = require('./routes/wbCabinetRoutes'); // ЛК WB
const integrationLinkRoutes = require('./routes/integrationLinkRoutes'); // связки склад и вб
const productRoutes = require('./routes/productRoutes'); // товары ВБ


const app = express();

// --- Добавленные строки для отладки ---
// Проверяем, загрузились ли переменные окружения
console.log('--- Проверка переменных окружения ---');
console.log('process.env.PORT:', process.env.PORT);
console.log('process.env.MONGO_URI:', process.env.MONGO_URI);
console.log('process.env.JWT_SECRET:', process.env.JWT_SECRET ? '*****' : 'UNDEFINED'); // Скрываем реальный секрет

console.log('------------------------------------');
// --- Конец добавленных строк ---


const PORT = process.env.PORT || 3900;
const MONGO_URI = process.env.MONGO_URI;

// --- Добавляем CORS middleware сюда ---
app.use(cors({
  origin: 'http://localhost:5173', // <-- Разрешаем запросы только с вашего фронтенда
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // <-- Разрешаем необходимые HTTP-методы
  credentials: true // <-- Разрешаем передачу куки и заголовков авторизации
}));
// --- Конец CORS middleware ---

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
app.use('/api/users', userRoutes); // Маршруты для управления пользователями (защищенные)
app.use('/api/storages', storageRoutes);
app.use('/api/wbcabinets', wbCabinetRoutes);
app.use('/api/integration-links', integrationLinkRoutes);
app.use('/api/products', productRoutes);


// Простой корневой маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('WBMS Backend is running!');
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
