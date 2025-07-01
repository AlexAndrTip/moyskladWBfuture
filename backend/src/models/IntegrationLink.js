
// backend/src/models/IntegrationLink.js
const mongoose = require('mongoose');

const IntegrationLinkSchema = new mongoose.Schema({
  wbCabinet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WbCabinet',
    required: true,
  },
  storage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Storage',
    required: true,
  },
  user: { // Связь всегда принадлежит конкретному пользователю
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Добавим уникальный индекс для предотвращения дублирования связок для одного пользователя
IntegrationLinkSchema.index({ wbCabinet: 1, storage: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('IntegrationLink', IntegrationLinkSchema);
