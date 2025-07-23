const mongoose = require('mongoose');

const UslugiSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
  },
  ms_href: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    required: true,
    default: 'service',
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

// Индекс для быстрого поиска по пользователю и интеграции
UslugiSchema.index({ user: 1, integrationLink: 1 });

module.exports = mongoose.model('Uslugi', UslugiSchema); 