// backend/src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Limit = require('../models/Limit');
const bcrypt = require('bcryptjs');

// Генерация JWT токена
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Токен действителен 1 час
  });
};

// @desc    Аутентификация пользователя и получение токена
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// @desc    Регистрация нового пользователя (для начального создания админа, если его нет)
// @route   POST /api/auth/register
// @access  Public (обычно защищен, но для первого админа можно сделать публичным)
exports.register = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }

    const user = await User.create({
      username,
      password,
      role: role || 'user',
    });

    if (user) {
      // --- Инициализируем лимиты для нового пользователя ---
      await Limit.create({
        user: user._id,
        maxStorages: 3, // Лимит по умолчанию
        maxWbCabinets: 3, // Лимит по умолчанию
      });
      console.log(`Лимиты по умолчанию созданы для пользователя ${user.username}`);
      // --- Конец инициализации лимитов ---

      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Неверные данные пользователя' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при регистрации', error: error.message });
  }
};
