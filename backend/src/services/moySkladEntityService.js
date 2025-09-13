// backend/src/services/moySkladEntityService.js

const axios = require('axios');
const IntegrationLink = require('../models/IntegrationLink');

// Вспомогательная функция для получения токена МойСклад.
// Определена здесь, чтобы быть доступной для всех функций в этом сервисе.
async function getMoyskladToken(integrationLinkId, userId) {
  const integrationLink = await IntegrationLink.findOne({ _id: integrationLinkId, user: userId })
    .populate({
      path: 'storage',
      select: 'token' // Явно указываем, что нужно выбрать поле 'token'
    });

  if (!integrationLink) {
    throw new Error('Интеграционная связка не найдена.');
  }
  // Проверяем, что storage существует и у него есть токен
  if (!integrationLink.storage || !integrationLink.storage.token) {
    throw new Error('Склад в интеграционной связке не имеет токена МойСклад.');
  }
  return integrationLink.storage.token;
}

// Базовый URL для API МойСклад
const MOYSKLAD_API_BASE_URL = 'https://api.moysklad.ru/api/remap/1.2/entity/';

// @desc    Получить список организаций из МойСклад
async function getMoyskladOrganizations(integrationLinkId, userId, searchTerm = '') {
  const token = await getMoyskladToken(integrationLinkId, userId); // Вызов вспомогательной функции
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const params = searchTerm ? { search: searchTerm } : {};

  try {
    const response = await axios.get(`${MOYSKLAD_API_BASE_URL}organization`, { headers, params });
    return response.data.rows; // Возвращаем массив организаций
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при получении организаций из МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при получении организаций из МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

// @desc    Создать организацию в МойСклад
async function createMoyskladOrganization(integrationLinkId, userId, organizationData) {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(`${MOYSKLAD_API_BASE_URL}organization`, organizationData, { headers });
    return response.data; // Возвращаем созданную организацию
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при создании организации в МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при создании организации в МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

// @desc    Получить список контрагентов из МойСклад
async function getMoyskladCounterparties(integrationLinkId, userId, searchTerm = '') {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const params = searchTerm ? { search: searchTerm } : {};

  try {
    const response = await axios.get(`${MOYSKLAD_API_BASE_URL}counterparty`, { headers, params });
    return response.data.rows;
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при получении контрагентов из МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при получении контрагентов из МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

// @desc    Создать контрагента в МойСклад
async function createMoyskladCounterparty(integrationLinkId, userId, counterpartyData) {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(`${MOYSKLAD_API_BASE_URL}counterparty`, counterpartyData, { headers });
    return response.data;
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при создании контрагента в МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при создании контрагента в МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

// @desc    Получить список договоров из МойСклад
// @param   organizationHref - href организации (ownAgent) для фильтрации на стороне сервера
// @param   counterpartyHref - href контрагента (agent) для фильтрации на стороне сервера
// ПРИМЕЧАНИЕ: Возвращаются только договоры типа "Commission" (Договор комиссии)
async function getMoyskladContracts(integrationLinkId, userId, organizationHref, counterpartyHref, searchTerm = '') {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ИЗМЕНЕНО: Удаляем параметры фильтрации ownAgent.id и agent.id из запроса к МойСклад
  // Вместо этого, мы будем фильтровать полученные данные на стороне нашего сервера.
  const params = searchTerm ? { search: searchTerm } : {};
  params.expand = 'ownAgent,agent'; // Обязательно расширяем, чтобы получить Href для фильтрации

  try {
    const response = await axios.get(`${MOYSKLAD_API_BASE_URL}contract`, { headers, params });
    let contracts = response.data.rows;

    // ИЗМЕНЕНО: Фильтрация на стороне сервера по Href организации и контрагента
    if (organizationHref) {
      contracts = contracts.filter(contract =>
        contract.ownAgent && contract.ownAgent.meta && contract.ownAgent.meta.href === organizationHref
      );
    }
    if (counterpartyHref) {
      contracts = contracts.filter(contract =>
        contract.agent && contract.agent.meta && contract.agent.meta.href === counterpartyHref
      );
    }

    // ИЗМЕНЕНО: Фильтруем только договоры типа "Commission" (Договор комиссии)
    contracts = contracts.filter(contract => contract.contractType === 'Commission');

    return contracts; // Возвращаем отфильтрованный массив договоров
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при получении договоров из МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при получении договоров из МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

// @desc    Создать договор в МойСклад
// ПРИМЕЧАНИЕ: Создаются только договоры типа "Commission" (Договор комиссии)
async function createMoyskladContract(integrationLinkId, userId, contractData) {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // ИЗМЕНЕНО: Добавляем contractType: "Commission" для создания договора комиссии
    const contractPayload = {
      ...contractData,
      contractType: 'Commission' // Обязательно указываем тип договора как "Commission"
    };

    // contractData должно содержать name, ownAgent.meta, agent.meta
    const response = await axios.post(`${MOYSKLAD_API_BASE_URL}contract`, contractPayload, { headers });
    return response.data;
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при создании договора в МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при создании договора в МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}


// @desc    Получить список складов из МойСклад
async function getMoyskladStores(integrationLinkId, userId, searchTerm = '') {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const params = searchTerm ? { search: searchTerm } : {};

  try {
    const response = await axios.get(`${MOYSKLAD_API_BASE_URL}store`, { headers, params });
    return response.data.rows;
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при получении складов из МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при получении складов из МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}

// @desc    Создать склад в МойСклад (редко требуется через API, обычно создаются вручную)
async function createMoyskladStore(integrationLinkId, userId, storeData) {
  const token = await getMoyskladToken(integrationLinkId, userId);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(`${MOYSKLAD_API_BASE_URL}store`, storeData, { headers });
    return response.data;
  } catch (error) {
    console.error('[moySkladEntityService] Ошибка при создании склада в МойСклад:', error.response?.data || error.message);
    throw new Error(`Ошибка при создании склада в МойСклад: ${error.response?.data?.errors?.[0]?.error || error.message}`);
  }
}


module.exports = {
  getMoyskladOrganizations,
  createMoyskladOrganization,
  getMoyskladCounterparties,
  createMoyskladCounterparty,
  getMoyskladContracts,
  createMoyskladContract,
  getMoyskladStores,
  createMoyskladStore,
};
