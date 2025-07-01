// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Получаем токен из заголовка
      token = req.headers.authorization.split(' ')[1];

      // Верифицируем токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Находим пользователя по ID из токена и прикрепляем его к объекту запроса
      req.user = await User.findById(decoded.id).select('-password'); // Исключаем пароль
      req.userRole = decoded.role; // Добавляем роль пользователя

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Не авторизован, токен недействителен' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Не авторизован, нет токена' });
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: `Доступ запрещен. Роль ${req.userRole} не имеет разрешения.` });
    }
    next();
  };
};