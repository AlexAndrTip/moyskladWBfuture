// backend/src/models/Product.js
const mongoose = require('mongoose');

// Определение схемы для каждого объекта размера (элемента в массиве 'sizes')
const SizeSchema = new mongoose.Schema({
  chrtID: Number,
  techSize: String,
  wbSize: String, // Это поле, возможно, приходит с WB. Добавляем его.
  skus: [String], // Массив строк SKU, как определено WB API
  ms_href: { // <-- НОВОЕ ПОЛЕ: URL товара в МойСклад для данного размера
    type: String,
    required: false, // Не обязательно, пока товар не создан в МС
  }
});

const ProductSchema = new mongoose.Schema({
  nmID: { // Артикул Wildberries
    type: Number,
    required: true,
  },
  imtID: Number, // ID карточки товара
  nmUUID: String, // UUID номенклатуры
  subjectID: Number, // ID предмета
  subjectName: String, // Название предмета
  vendorCode: String, // Артикул продавца
  brand: String, // Бренд
  title: String, // Название товара
  description: String, // Описание
  needKiz: Boolean, // Нужен ли КИЗ
  // photos: [String], // Исключено
  // video: String, // Исключено
  // dimensions: mongoose.Schema.Types.Mixed, // Исключено
  characteristics: mongoose.Schema.Types.Mixed, // Массив характеристик
  // sizes: mongoose.Schema.Types.Mixed, // <-- БЫЛО ТАК
  sizes: [SizeSchema], // <-- МЕНЯЕМ НА МАССИВ СВОЕЙ СХЕМЫ
  tags: [mongoose.Schema.Types.Mixed], // Массив тегов
  createdAt: Date,
  updatedAt: Date,

  // --- Связь с интеграцией и пользователем ---
  integrationLink: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntegrationLink',
    required: true,
  },
  user: { // Владелец товара
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wbCabinet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WbCabinet',
    required: true,
  },
  storage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Storage',
    required: true,
  }
});

// Добавим индекс для быстрого поиска товаров по nmID внутри интеграции
ProductSchema.index({ nmID: 1, integrationLink: 1, user: 1 }, { unique: true });
// Также индекс для фильтрации по интеграции
ProductSchema.index({ integrationLink: 1, user: 1 });


module.exports = mongoose.model('Product', ProductSchema);
