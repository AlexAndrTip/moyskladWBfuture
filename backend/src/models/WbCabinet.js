// backend/src/models/WbCabinet.js
const mongoose = require('mongoose');

const WbCabinetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    select: false, // Не выбираем токен по умолчанию
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WbCabinet', WbCabinetSchema);
