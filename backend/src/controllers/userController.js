// backend/src/controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Получить всех пользователей
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password'); // Исключаем пароли
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// @desc    Добавить нового пользователя
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }

    const user = await User.create({ username, password, role: role || 'user' });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: 'Неверные данные пользователя' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// @desc    Удалить пользователя
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Запрещаем удаление самого себя или последнего админа (опционально)
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Вы не можете удалить самого себя.' });
      }
      // Опционально: предотвратить удаление единственного админа
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (user.role === 'admin' && adminCount === 1) {
        return res.status(400).json({ message: 'Невозможно удалить последнего администратора.' });
      }

      await User.deleteOne({ _id: req.params.id });
      res.json({ message: 'Пользователь удален' });
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};