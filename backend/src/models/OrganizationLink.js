// backend/src/models/OrganizationLink.js

const mongoose = require('mongoose');

const OrganizationLinkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  integrationLink: {
    type: mongoose.Schema.ObjectId,
    ref: 'IntegrationLink',
    required: true,
    unique: true, // Одна запись связки сущностей МойСклад на одну интеграционную связку
  },
  moyskladOrganizationName: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladOrganizationHref: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladCounterpartyName: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladCounterpartyHref: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladContractName: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladContractHref: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladStoreName: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladStoreHref: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladStoreExpensesName: {
    type: String,
    trim: true,
    default: null,
  },
  moyskladStoreExpensesHref: {
    type: String,
    trim: true,
    default: null,
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
OrganizationLinkSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('OrganizationLink', OrganizationLinkSchema);
