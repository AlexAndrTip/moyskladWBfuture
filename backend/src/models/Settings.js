const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  integrationLink: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntegrationLink',
    required: true,
  },
  // Автоматическая выгрузка товаров
  autoExportProducts: {
    type: Boolean,
    default: false,
  },
  // Автоматическая выгрузка поставок
  autoExportSupplies: {
    type: Boolean,
    default: false,
  },
  // Автоматическая выгрузка отчетов
  autoExportReports: {
    type: Boolean,
    default: false,
  },
  // Создавать приемки услуг
  createServiceReceipts: {
    type: Boolean,
    default: true,
  },
  // Создавать расходные ордера по услугам
  createServiceExpenseOrders: {
    type: Boolean,
    default: true,
  },
  // Выгружать заказы FBS в МС
  exportFBSOrders: {
    type: Boolean,
    default: false,
  },
  // Глубина выгрузки отчетов (в неделях)
  reportDepthWeeks: {
    type: Number,
    default: 12, // 12 недель по умолчанию
    min: 4,
    max: 25,
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

// Обновляем поле updatedAt при каждом сохранении
SettingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Индекс для быстрого поиска по пользователю и интеграции
SettingsSchema.index({ user: 1, integrationLink: 1 }, { unique: true });

module.exports = mongoose.model('Settings', SettingsSchema); 