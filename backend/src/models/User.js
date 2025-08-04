// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verificationExpires: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  subscription: {
    type: {
      type: String,
      enum: ['demo', 'basic', 'premium'],
      default: 'demo'
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Хеширование пароля перед сохранением
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Метод для сравнения паролей
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Метод для генерации токена верификации
UserSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 часа
  return token;
};

// Метод для генерации токена сброса пароля
UserSchema.methods.generateResetPasswordToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 час
  return token;
};

// Метод для проверки активности подписки
UserSchema.methods.isSubscriptionActive = function() {
  // Если подписка истекла, переводим в демо режим
  if (this.subscription.expiresAt && this.subscription.expiresAt < new Date()) {
    this.subscription.type = 'demo';
    this.subscription.isActive = true;
    this.subscription.expiresAt = null;
    return true; // Демо всегда активно
  }
  
  if (this.subscription.type === 'demo') {
    return true; // Демо всегда активно, но с ограничениями
  }
  
  if (!this.subscription.isActive) {
    return false;
  }
  
  return true;
};

// Метод для получения статуса подписки
UserSchema.methods.getSubscriptionStatus = function() {
  // Проверяем, не истекла ли подписка
  this.isSubscriptionActive();
  
  if (this.subscription.type === 'demo') {
    return {
      type: 'demo',
      status: 'active',
      expiresAt: null,
      message: 'Демо версия'
    };
  }
  
  return {
    type: this.subscription.type,
    status: 'active',
    expiresAt: this.subscription.expiresAt,
    message: `Подписка активна до ${this.subscription.expiresAt ? new Date(this.subscription.expiresAt).toLocaleDateString('ru-RU') : 'бессрочно'}`
  };
};

// Метод для обновления подписки
UserSchema.methods.updateSubscription = function(months) {
  const now = new Date();
  let newExpiresAt;
  
  if (this.subscription.expiresAt && this.subscription.expiresAt > now) {
    // Если подписка еще активна, добавляем месяцы к текущей дате окончания
    newExpiresAt = new Date(this.subscription.expiresAt);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + months);
  } else {
    // Если подписка истекла или демо, начинаем с текущей даты
    newExpiresAt = new Date();
    newExpiresAt.setMonth(newExpiresAt.getMonth() + months);
  }
  
  this.subscription.type = 'basic';
  this.subscription.isActive = true;
  this.subscription.expiresAt = newExpiresAt;
  
  return this;
};

module.exports = mongoose.model('User', UserSchema);