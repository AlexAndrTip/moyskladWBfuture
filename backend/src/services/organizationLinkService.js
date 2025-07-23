// backend/src/services/organizationLinkService.js

const OrganizationLink = require('../models/OrganizationLink'); // ИЗМЕНЕНО: Обновленный импорт
const IntegrationLink = require('../models/IntegrationLink'); // Для проверки существования интеграционной связки
const axios = require('axios'); // Для будущих запросов к МойСклад API, если потребуется

// Вспомогательная функция для получения токена МойСклад
async function getMoyskladToken(integrationLinkId, userId) {
  const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
    .populate('storage'); // Популируем связанный Storage

  if (!integrationLink) {
    throw new Error('Интеграционная связка не найдена.');
  }
  if (!integrationLink.storage || !integrationLink.storage.token) {
    throw new Error('Склад в интеграционной связке не имеет токена МойСклад.');
  }
  return integrationLink.storage.token;
}


// @desc    Получить связку МойСклад сущностей для конкретной интеграции
async function getOrganizationLink(integrationLinkId, userId) { // ИЗМЕНЕНО: Обновлено имя функции
  const link = await OrganizationLink.findOne({ integrationLink: integrationLinkId, user: userId }); // ИЗМЕНЕНО: Обновлено имя модели
  return link;
}

// @desc    Создать или обновить связку МойСклад сущностей
async function createOrUpdateOrganizationLink(integrationLinkId, userId, data) { // ИЗМЕНЕНО: Обновлено имя функции
  // Проверяем, существует ли интеграционная связка и принадлежит ли она пользователю
  const integrationLinkExists = await IntegrationLink.exists({ _id: integrationLinkId, user: userId });
  if (!integrationLinkExists) {
    throw new Error('Интеграционная связка не найдена или не принадлежит вам.');
  }

  // Находим существующую запись или создаем новую
  let organizationLink = await OrganizationLink.findOne({ integrationLink: integrationLinkId, user: userId }); // ИЗМЕНЕНО: Обновлено имя модели

  if (!organizationLink) {
    // Если записи нет, создаем новую
    organizationLink = new OrganizationLink({ // ИЗМЕНЕНО: Обновлено имя модели
      user: userId,
      integrationLink: integrationLinkId,
      ...data, // Присваиваем переданные данные
    });
    console.log('[OrganizationLinkService] Создана новая связка МойСклад сущностей.'); // ИЗМЕНЕНО: Обновлено имя сервиса
  } else {
    // Если запись существует, обновляем ее поля
    Object.assign(organizationLink, data);
    console.log('[OrganizationLinkService] Обновлена существующая связка МойСклад сущностей.'); // ИЗМЕНЕНО: Обновлено имя сервиса
  }

  await organizationLink.save();
  return organizationLink;
}

// @desc    Удалить связку МойСклад сущностей
async function deleteOrganizationLink(integrationLinkId, userId) { // ИЗМЕНЕНО: Обновлено имя функции
  const result = await OrganizationLink.deleteOne({ integrationLink: integrationLinkId, user: userId }); // ИЗМЕНЕНО: Обновлено имя модели
  if (result.deletedCount === 0) {
    throw new Error('Связка МойСклад сущностей не найдена или не принадлежит вам.');
  }
  return { message: 'Связка МойСклад сущностей успешно удалена.' };
}

module.exports = {
  getOrganizationLink, // ИЗМЕНЕНО: Обновлено имя функции
  createOrUpdateOrganizationLink, // ИЗМЕНЕНО: Обновлено имя функции
  deleteOrganizationLink, // ИЗМЕНЕНО: Обновлено имя функции
  // Дополнительные функции для работы с МойСклад API будут здесь, или в отдельном moySkladEntityService.js
};
