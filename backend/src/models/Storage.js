// backend/src/models/Storage.js
const mongoose = require('mongoose');

const StorageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  token: {
    type: String, // Или другой тип, если токен имеет специфичный формат
    required: true,
    select: false, // Не выбираем токен по умолчанию при запросах
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, // Связываем склад с конкретным пользователем
    ref: 'User', // Ссылка на модель User
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Storage', StorageSchema);
