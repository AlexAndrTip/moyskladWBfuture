// backend/src/models/Limit.js
const mongoose = require('mongoose');

const LimitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Гарантируем, что для каждого пользователя только одна запись лимитов
  },
  maxStorages: {
    type: Number,
    default: 3, // Лимит по умолчанию на склады
  },
  maxWbCabinets: {
    type: Number,
    default: 3, // Лимит по умолчанию на WB-кабинеты
  },
  // Максимальная глубина выгрузки отчётов (в неделях)
  maxReportDepthWeeks: {
    type: Number,
    default: 25, // По умолчанию разрешаем выгрузку отчётов за 25 недель
    min: 4,
    max: 52,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Обновляем updatedAt при каждом сохранении
LimitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Limit', LimitSchema);
