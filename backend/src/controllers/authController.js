// backend/src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Limit = require('../models/Limit');
const bcrypt = require('bcryptjs');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

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
      // Проверяем, верифицирован ли email
      if (!user.isVerified) {
        return res.status(401).json({ 
          message: 'Пожалуйста, подтвердите ваш email адрес перед входом в систему' 
        });
      }

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription: user.getSubscriptionStatus(),
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// @desc    Регистрация нового пользователя с подтверждением email
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  try {
    // Проверяем, что пароли совпадают
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Пароли не совпадают' });
    }

    // Проверяем, что пользователь с таким именем не существует
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Пользователь с таким именем уже существует' });
    }

    // Проверяем, что email не занят
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Создаем пользователя
    const user = await User.create({
      username,
      email,
      password,
      role: 'user', // Все новые пользователи получают роль user
      subscription: {
        type: 'demo',
        isActive: true,
        expiresAt: null
      }
    });

    if (user) {
      // Генерируем токен верификации
      const verificationToken = user.generateVerificationToken();
      await user.save();

      // Отправляем email для подтверждения
      const emailSent = await sendVerificationEmail(email, username, verificationToken);
      
      if (!emailSent) {
        // Если email не отправлен, удаляем пользователя
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({ 
          message: 'Ошибка отправки email подтверждения. Попробуйте позже.' 
        });
      }

      // --- Инициализируем лимиты для нового пользователя ---
      await Limit.create({
        user: user._id,
        maxStorages: 3, // Лимит по умолчанию
        maxWbCabinets: 3, // Лимит по умолчанию
        maxReportDepthWeeks: 25, // Максимальная глубина отчётов по умолчанию
      });
      console.log(`Лимиты по умолчанию созданы для пользователя ${user.username}`);
      // --- Конец инициализации лимитов ---

      res.status(201).json({
        message: 'Регистрация успешна! Проверьте ваш email для подтверждения аккаунта.',
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      });
    } else {
      res.status(400).json({ message: 'Неверные данные пользователя' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера при регистрации', error: error.message });
  }
};

// @desc    Подтверждение email
// @route   GET /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Недействительный или истекший токен подтверждения' 
      });
    }

    // Подтверждаем email
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ 
      message: 'Email успешно подтвержден! Теперь вы можете войти в систему.' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при подтверждении email', 
      error: error.message 
    });
  }
};

// @desc    Повторная отправка email подтверждения
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь с таким email не найден' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email уже подтвержден' });
    }

    // Генерируем новый токен верификации
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Отправляем email для подтверждения
    const emailSent = await sendVerificationEmail(email, user.username, verificationToken);
    
    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Ошибка отправки email подтверждения. Попробуйте позже.' 
      });
    }

    res.json({ 
      message: 'Email подтверждения отправлен повторно. Проверьте вашу почту.' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при повторной отправке email', 
      error: error.message 
    });
  }
};

// @desc    Запрос на сброс пароля
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Для безопасности не раскрываем, существует ли пользователь с таким email
      return res.status(200).json({ 
        message: 'Если пользователь с таким email существует, на него будет отправлено письмо для сброса пароля' 
      });
    }

    // Генерируем токен для сброса пароля
    const resetToken = user.generateResetPasswordToken();
    await user.save();

    // Отправляем email
    const emailSent = await sendPasswordResetEmail(email, user.username, resetToken);
    
    if (!emailSent) {
      return res.status(500).json({ 
        message: 'Ошибка отправки email для сброса пароля. Попробуйте позже.' 
      });
    }

    res.json({ 
      message: 'Если пользователь с таким email существует, на него будет отправлено письмо для сброса пароля' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при запросе сброса пароля', 
      error: error.message 
    });
  }
};

// @desc    Сброс пароля
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Недействительный или истекший токен для сброса пароля' 
      });
    }

    // Устанавливаем новый пароль
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      message: 'Пароль успешно изменен! Теперь вы можете войти в систему с новым паролем.' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Ошибка сервера при сбросе пароля', 
      error: error.message 
    });
  }
};
