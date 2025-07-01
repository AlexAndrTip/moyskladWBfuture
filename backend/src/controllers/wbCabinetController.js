// backend/src/controllers/wbCabinetController.js
const WbCabinet = require('../models/WbCabinet');
const Limit = require('../models/Limit');
const axios = require('axios');
const IntegrationLink = require('../models/IntegrationLink');

// URL для проверки токена Wildberries
const WB_PING_API_URL = 'https://common-api.wildberries.ru/ping';

// @desc    Получить все WB Кабинеты для текущего пользователя
// @route   GET /api/wbcabinets
// @access  Private
exports.getWbCabinets = async (req, res) => {
  try {
    const wbCabinets = await WbCabinet.find({ user: req.user._id }).select('-token');
    res.json(wbCabinets);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении WB Кабинетов', error: error.message });
  }
};

// @desc    Добавить новый WB Кабинет
// @route   POST /api/wbcabinets
// @access  Private
exports.createWbCabinet = async (req, res) => {
  const { name, token } = req.body;
  const userId = req.user._id;

  if (!name || !token) {
    return res.status(400).json({ message: 'Пожалуйста, введите название WB Кабинета и токен.' });
  }

  try {
    // --- 1. Проверка уникальности имени WB Кабинета для текущего пользователя ---
    const existingWbCabinetByName = await WbCabinet.findOne({ name, user: userId });
    if (existingWbCabinetByName) {
      return res.status(400).json({ message: `WB Кабинет с названием "${name}" уже существует.` });
    }

    // --- 2. Проверка уникальности токена для текущего пользователя ---
    const existingWbCabinetByToken = await WbCabinet.findOne({ token, user: userId }).select('+token');
    if (existingWbCabinetByToken) {
      return res.status(400).json({ message: 'WB Кабинет с таким токеном уже существует.' });
    }

    // --- 3. Проверка лимита на WB Кабинеты ---
    let userLimits = await Limit.findOne({ user: userId });
    const currentWbCabinetsCount = await WbCabinet.countDocuments({ user: userId });

    if (!userLimits) {
      userLimits = await Limit.create({ user: userId }); // Создадим, если нет
      console.log(`Лимиты по умолчанию созданы для пользователя ${req.user.username} во время проверки WB Кабинета.`);
    }

    if (currentWbCabinetsCount >= userLimits.maxWbCabinets) {
      return res.status(403).json({ message: `Вы достигли максимального лимита (${userLimits.maxWbCabinets}) на создание WB Кабинетов.` });
    }
    // --- Конец проверки лимита ---

    // --- 4. Шаг проверки токена Wildberries (WB Ping API) ---
    try {
      // Для common-api.wildberries.ru/ping, токен обычно передается в Authorization: Bearer
      // или X-Auth-Token, в зависимости от конкретного API.
      // Если просто 'ping', возможно, без токена или особые заголовки.
      // Предполагаем, что токен все же нужен и в формате Bearer.
      await axios.get(WB_PING_API_URL, {
        headers: {
          'Authorization': `Bearer ${token}` // Или другой заголовок, если требуется
          // 'X-Auth-Token': token, // Возможно, потребуется такой заголовок, уточнить по документации WB
        }
      });
      // Если запрос успешен (статус 200), токен считается действительным
      console.log('WB API Token validated successfully via common-api/ping.');
    } catch (validationError) {
      console.error('WB API Token validation failed:', validationError.response?.status, validationError.message);
      let errorMessage = 'Недействительный WB токен или ошибка подключения к API Wildberries.';
      if (validationError.response && validationError.response.status === 401) {
        errorMessage = 'Предоставленный WB токен недействителен (ошибка авторизации).';
      } else if (validationError.response && validationError.response.status === 403) {
        errorMessage = 'Предоставленный WB токен не имеет достаточных прав.';
      } else if (validationError.code === 'ERR_BAD_REQUEST' && validationError.response?.status === 400) {
        errorMessage = 'Неверный формат токена или API-запрос.'
      }
      return res.status(400).json({ message: errorMessage });
    }
    // --- Конец шага проверки токена ---

    const wbCabinet = await WbCabinet.create({
      name,
      token,
      user: userId,
    });

    res.status(201).json({ _id: wbCabinet._id, name: wbCabinet.name, user: wbCabinet.user, createdAt: wbCabinet.createdAt });
  } catch (error) {
    console.error("Error creating WB Cabinet:", error);
    res.status(500).json({ message: 'Ошибка сервера при создании WB Кабинета', error: error.message });
  }
};

// @desc    Обновить WB Кабинет
// @route   PUT /api/wbcabinets/:id
// @access  Private
exports.updateWbCabinet = async (req, res) => {
  const { name, token } = req.body;
  const userId = req.user._id;
  const wbCabinetId = req.params.id;

  try {
    const wbCabinet = await WbCabinet.findOne({ _id: wbCabinetId, user: userId });

    if (!wbCabinet) {
      return res.status(404).json({ message: 'WB Кабинет не найден или у вас нет прав на его редактирование.' });
    }

    // --- 1. Проверка уникальности нового имени WB Кабинета ---
    if (name && name !== wbCabinet.name) {
      const existingWbCabinetByName = await WbCabinet.findOne({ name, user: userId });
      if (existingWbCabinetByName && existingWbCabinetByName._id.toString() !== wbCabinetId) {
        return res.status(400).json({ message: `WB Кабинет с названием "${name}" уже существует.` });
      }
    }

    // --- 2. Проверка уникальности нового токена ---
    if (token && token !== wbCabinet.token) {
      const existingWbCabinetByToken = await WbCabinet.findOne({ token, user: userId }).select('+token');
      if (existingWbCabinetByToken && existingWbCabinetByToken._id.toString() !== wbCabinetId) {
        return res.status(400).json({ message: 'WB Кабинет с таким токеном уже существует.' });
      }

      // Если токен изменен, нужно заново его валидировать через WB Ping API
      try {
        await axios.get(WB_PING_API_URL, {
          headers: {
            'Authorization': `Bearer ${token}` // Или другой заголовок
          }
        });
        console.log('WB API Token validated successfully during update.');
      } catch (validationError) {
        console.error('WB API Token validation failed during update:', validationError.response?.status, validationError.message);
        let errorMessage = 'Недействительный WB токен или ошибка подключения к API Wildberries при обновлении.';
        if (validationError.response && validationError.response.status === 401) {
          errorMessage = 'Предоставленный WB токен недействителен (ошибка авторизации) при обновлении.';
        } else if (validationError.response && validationError.response.status === 403) {
          errorMessage = 'Предоставленный WB токен не имеет достаточных прав при обновлении.';
        } else if (validationError.code === 'ERR_BAD_REQUEST' && validationError.response?.status === 400) {
        errorMessage = 'Неверный формат токена или API-запрос при обновлении.'
      }
        return res.status(400).json({ message: errorMessage });
      }
    }

    // --- Обновляем данные WB Кабинета ---
    wbCabinet.name = name || wbCabinet.name;
    if (token) {
      wbCabinet.token = token;
    }

    const updatedWbCabinet = await wbCabinet.save();
    res.json({ _id: updatedWbCabinet._id, name: updatedWbCabinet.name, user: updatedWbCabinet.user, createdAt: updatedWbCabinet.createdAt });

  } catch (error) {
    console.error("Error updating WB Cabinet:", error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении WB Кабинета', error: error.message });
  }
};

// @desc    Удалить WB Кабинет
// @route   DELETE /api/wbcabinets/:id
// @access  Private
exports.deleteWbCabinet = async (req, res) => {
  const wbCabinetId = req.params.id; // Получаем ID кабинета из параметров запроса
  const userId = req.user._id; // ID текущего пользователя

  try {
    const wbCabinet = await WbCabinet.findOne({ _id: wbCabinetId, user: userId });

    if (!wbCabinet) {
      return res.status(404).json({ message: 'WB Кабинет не найден или у вас нет прав на его удаление.' });
    }

    // --- Проверка: есть ли этот WB Кабинет в каких-либо связках ---
    const isLinked = await IntegrationLink.exists({ wbCabinet: wbCabinetId, user: userId });
    if (isLinked) {
      return res.status(400).json({ message: 'Невозможно удалить WB Кабинет. Он используется в одной или нескольких интеграционных связках. Сначала разорвите все связанные интеграции.' });
    }
    // --- Конец проверки ---

    await wbCabinet.deleteOne();
    res.json({ message: 'WB Кабинет успешно удален' });
  } catch (error) {
    console.error("Error deleting WB Cabinet:", error);
    res.status(500).json({ message: 'Ошибка сервера при удалении WB Кабинета', error: error.message });
  }
};
