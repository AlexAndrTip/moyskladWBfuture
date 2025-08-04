const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  qrcId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  amount: { type: Number, required: true }, // сумма в копейках
  status: { type: String, default: 'Received' }, // Received / InProgress / Accepted / Rejected / TimedOut / NotStarted
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema); 