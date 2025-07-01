// backend/src/controllers/storageController.js
const Storage = require('../models/Storage');
const axios = require('axios'); // <-- Импортируем axios
const Limit = require('../models/Limit');
const IntegrationLink = require('../models/IntegrationLink');

const MOYSKLAD_API_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/assortment'; // <-- URL для проверки токена

// @desc    Получить все склады для текущего пользователя
// @route   GET /api/storages
// @access  Private
exports.getStorages = async (req, res) => {
  try {
    const storages = await Storage.find({ user: req.user._id }).select('-token');
    res.json(storages);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при получении складов', error: error.message });
  }
};

// @desc    Добавить новый склад
// @route   POST /api/storages
// @access  Private
exports.createStorage = async (req, res) => {
  const { name, token } = req.body;
  const userId = req.user._id; // ID текущего пользователя

  if (!name || !token) {
    return res.status(400).json({ message: 'Пожалуйста, введите название склада и токен.' });
  }

  try {
    // --- 1. Проверка уникальности имени склада для текущего пользователя ---
    const existingStorageByName = await Storage.findOne({ name, user: userId });
    if (existingStorageByName) {
      return res.status(400).json({ message: `Склад с названием "${name}" уже существует.` });
    }

    // --- 2. Проверка уникальности токена для текущего пользователя ---
    // Для токена нам нужно выбрать поле 'token', которое по умолчанию select: false
    const existingStorageByToken = await Storage.findOne({ token, user: userId }).select('+token');
    if (existingStorageByToken) {
      return res.status(400).json({ message: 'Склад с таким токеном уже существует.' });
    }

    // --- 3. Проверка лимита на склады (остается без изменений) ---
    const userLimits = await Limit.findOne({ user: userId });
    const currentStoragesCount = await Storage.countDocuments({ user: userId });

    if (!userLimits) {
      // Если лимиты не найдены, создаем их с дефолтными значениями
      // Важно: если userLimits создается здесь, это должна быть переменная,
      // чтобы к ней можно было обратиться. Или можно жестко задать 3.
      // Давайте просто создадим для пользователя с дефолтными значениями
      // и продолжим, если его раньше не было.
      await Limit.create({ user: userId }); // Создаст с default: 3
      // Перезапросим лимиты, чтобы быть уверенными, что они загружены
      // Или просто используем 3 как fallback, если userLimits был null
      if (currentStoragesCount >= 3) { // Заменить userLimits.maxStorages на 3, если лимиты только что созданы
         return res.status(403).json({ message: `Вы достигли максимального лимита (3) на создание складов.` });
      }
    } else {
        if (currentStoragesCount >= userLimits.maxStorages) {
            return res.status(403).json({ message: `Вы достигли максимального лимита (${userLimits.maxStorages}) на создание складов.` });
        }
    }

    // --- 4. Шаг проверки токена WB (остается без изменений) ---
    try {
      await axios.get(MOYSKLAD_API_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('WB Token validated successfully.');
    } catch (validationError) {
      console.error('WB Token validation failed:', validationError.response?.status, validationError.message);
      let errorMessage = 'Недействительный WB токен или ошибка подключения к API МойСклад.';
      if (validationError.response && validationError.response.status === 401) {
        errorMessage = 'Предоставленный WB токен недействителен (ошибка авторизации).';
      } else if (validationError.response && validationError.response.status === 403) {
        errorMessage = 'Предоставленный WB токен не имеет достаточных прав.';
      }
      return res.status(400).json({ message: errorMessage });
    }

    // --- Если все проверки пройдены, создаем склад ---
    const storage = await Storage.create({
      name,
      token,
      user: userId,
    });

    res.status(201).json({ _id: storage._id, name: storage.name, user: storage.user, createdAt: storage.createdAt });
  } catch (error) {
    console.error("Error creating storage:", error); // Логируем полную ошибку
    res.status(500).json({ message: 'Ошибка сервера при создании склада', error: error.message });
  }
};

// @desc    Обновить склад
// @route   PUT /api/storages/:id
// @access  Private
// @desc    Обновить склад
// @route   PUT /api/storages/:id
// @access  Private
exports.updateStorage = async (req, res) => {
  const { name, token } = req.body;
  const userId = req.user._id; // ID текущего пользователя
  const storageId = req.params.id; // ID редактируемого склада

  try {
    const storage = await Storage.findOne({ _id: storageId, user: userId });

    if (!storage) {
      return res.status(404).json({ message: 'Склад не найден или у вас нет прав на его редактирование.' });
    }

    // --- 1. Проверка уникальности нового имени склада (если оно изменено) ---
    if (name && name !== storage.name) { // Если имя изменено
      const existingStorageByName = await Storage.findOne({ name, user: userId });
      if (existingStorageByName && existingStorageByName._id.toString() !== storageId) { // И это не текущий склад
        return res.status(400).json({ message: `Склад с названием "${name}" уже существует.` });
      }
    }

    // --- 2. Проверка уникальности нового токена (если он изменен) ---
    if (token && token !== storage.token) { // Если токен изменен
      const existingStorageByToken = await Storage.findOne({ token, user: userId }).select('+token');
      if (existingStorageByToken && existingStorageByToken._id.toString() !== storageId) { // И это не текущий склад
        return res.status(400).json({ message: 'Склад с таким токеном уже существует.' });
      }

      // Если токен изменен, нужно заново его валидировать через MoySklad API
      try {
        await axios.get(MOYSKLAD_API_URL, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('WB Token validated successfully during update.');
      } catch (validationError) {
        console.error('WB Token validation failed during update:', validationError.response?.status, validationError.message);
        let errorMessage = 'Недействительный WB токен или ошибка подключения к API МойСклад при обновлении.';
        if (validationError.response && validationError.response.status === 401) {
          errorMessage = 'Предоставленный WB токен недействителен (ошибка авторизации) при обновлении.';
        } else if (validationError.response && validationError.response.status === 403) {
          errorMessage = 'Предоставленный WB токен не имеет достаточных прав при обновлении.';
        }
        return res.status(400).json({ message: errorMessage });
      }
    }

    // --- Обновляем данные склада ---
    storage.name = name || storage.name; // Обновляем имя, если оно предоставлено
    if (token) { // Обновляем токен, только если он предоставлен и прошел валидацию
      storage.token = token;
    }

    const updatedStorage = await storage.save();
    res.json({ _id: updatedStorage._id, name: updatedStorage.name, user: updatedStorage.user, createdAt: updatedStorage.createdAt });

  } catch (error) {
    console.error("Error updating storage:", error); // Логируем полную ошибку
    res.status(500).json({ message: 'Ошибка сервера при обновлении склада', error: error.message });
  }
};

// ... (exports.deleteStorage остается без изменений) ...
// @desc    Удалить склад
// @route   DELETE /api/storages/:id
// @access  Private
exports.deleteStorage = async (req, res) => {
  const storageId = req.params.id; // Получаем ID склада из параметров запроса
  const userId = req.user._id; // ID текущего пользователя

  try {
    const storage = await Storage.findOne({ _id: storageId, user: userId });

    if (!storage) {
      return res.status(404).json({ message: 'Склад не найден или у вас нет прав на его удаление.' });
    }

    // --- Проверка: есть ли этот склад в каких-либо связках ---
    const isLinked = await IntegrationLink.exists({ storage: storageId, user: userId });
    if (isLinked) {
      return res.status(400).json({ message: 'Невозможно удалить склад. Он используется в одной или нескольких интеграционных связках. Сначала разорвите все связанные интеграции.' });
    }
    // --- Конец проверки ---

    await storage.deleteOne();
    res.json({ message: 'Склад успешно удален' });
  } catch (error) {
    console.error("Error deleting storage:", error);
    res.status(500).json({ message: 'Ошибка сервера при удалении склада', error: error.message });
  }
};
