const mongoose = require('mongoose');

const WbIncomeSchema = new mongoose.Schema({
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
  incomeId: {
    type: Number,
    required: true,
  },
  date: String,
  supplierArticle: String,
  barcode: String,
  quantity: Number,
  warehouseName: String,
  status: String,
  ms_href: {
    type: String,
    default: null,
  },
  // Можно добавить другие поля из WB при необходимости
}, { timestamps: true });

WbIncomeSchema.index({ user: 1, integrationLink: 1, incomeId: 1, warehouseName: 1, barcode: 1, supplierArticle: 1 }, { unique: true });

module.exports = mongoose.model('WbIncome', WbIncomeSchema); 