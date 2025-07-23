// backend/src/controllers/organizationController.js

const organizationService = require('../services/organizationService'); // Для собственных организаций пользователя
const organizationLinkService = require('../services/organizationLinkService'); // Обновленный импорт
const moySkladEntityService = require('../services/moySkladEntityService'); // Для работы с МойСклад API

// @desc    Получить все организации пользователя (собственные)
// @route   GET /api/organizations
// @access  Private
exports.getOrganizations = async (req, res) => {
  try {
    const organizations = await organizationService.getOrganizations(req.user._id);
    res.status(200).json(organizations);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении собственных организаций: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении собственных организаций.' });
  }
};

// @desc    Создать новую организацию (собственную)
// @route   POST /api/organizations
// @access  Private
exports.createOrganization = async (req, res) => {
  try {
    const organization = await organizationService.createOrganization(req.body, req.user._id);
    res.status(201).json(organization);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при создании собственной организации: ${error.message}`);
    if (error.message.includes('ИНН уже существует')) {
      return res.status(400).json({ message: error.message });
    }
    // Обработка ошибок валидации Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании собственной организации.' });
  }
};

// @desc    Получить организацию по ID (собственную)
// @route   GET /api/organizations/:id
// @access  Private
exports.getOrganization = async (req, res) => {
  try {
    const organization = await organizationService.getOrganizationById(req.params.id, req.user._id);
    res.status(200).json(organization);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении собственной организации ${req.params.id}: ${error.message}`);
    if (error.message.includes('не найдена')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении собственной организации.' });
  }
};

// @desc    Обновить организацию (собственную)
// @route   PUT /api/organizations/:id
// @access  Private
exports.updateOrganization = async (req, res) => {
  try {
    const organization = await organizationService.updateOrganization(req.params.id, req.body, req.user._id);
    res.status(200).json(organization);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при обновлении собственной организации ${req.params.id}: ${error.message}`);
    if (error.message.includes('не найдена')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('ИНН уже существует')) {
      return res.status(400).json({ message: error.message });
    }
    // Обработка ошибок валидации Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: error.message || 'Ошибка сервера при обновлении собственной организации.' });
  }
};

// @desc    Удалить организацию (собственную)
// @route   DELETE /api/organizations/:id
// @access  Private
exports.deleteOrganization = async (req, res) => {
  try {
    const result = await organizationService.deleteOrganization(req.params.id, req.user._id);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при удалении собственной организации ${req.params.id}: ${error.message}`);
    if (error.message.includes('не найдена')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Невозможно удалить')) { // Для будущих проверок целостности
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Ошибка сервера при удалении собственной организации.' });
  }
};


// --- НОВЫЕ ЭНДПОИНТЫ ДЛЯ РАБОТЫ СО СВЯЗКАМИ СУЩНОСТЕЙ МОЙСКЛАД ---

// @desc    Получить связку МойСклад сущностей для конкретной интеграции
// @route   GET /api/organizations/link/:integrationLinkId
// @access  Private
exports.getOrganizationLink = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const link = await organizationLinkService.getOrganizationLink(integrationLinkId, req.user._id);
    res.status(200).json(link);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении связки МойСклад сущностей: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении связки МойСклад сущностей.' });
  }
};

// @desc    Создать или обновить связку МойСклад сущностей
// @route   POST /api/organizations/link
// @access  Private
exports.createOrUpdateOrganizationLink = async (req, res) => {
  try {
    // ИЗМЕНЕНО: Добавлены поля Href в деструктуризацию req.body
    const {
      integrationLinkId,
      moyskladOrganizationName,
      moyskladOrganizationHref, // ДОБАВЛЕНО
      moyskladCounterpartyName,
      moyskladCounterpartyHref, // ДОБАВЛЕНО
      moyskladContractName,
      moyskladContractHref, // ДОБАВЛЕНО
      moyskladStoreName,
      moyskladStoreHref // ДОБАВЛЕНО
    } = req.body;

    const dataToSave = {
      moyskladOrganizationName,
      moyskladOrganizationHref, // ДОБАВЛЕНО
      moyskladCounterpartyName,
      moyskladCounterpartyHref, // ДОБАВЛЕНО
      moyskladContractName,
      moyskladContractHref, // ДОБАВЛЕНО
      moyskladStoreName,
      moyskladStoreHref // ДОБАВЛЕНО
    };

    const link = await organizationLinkService.createOrUpdateOrganizationLink(
      integrationLinkId,
      req.user._id,
      dataToSave
    );
    res.status(200).json(link);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при создании/обновлении связки МойСклад сущностей: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании/обновлении связки МойСклад сущностей.' });
  }
};

// @desc    Удалить связку МойСклад сущностей
// @route   DELETE /api/organizations/link/:integrationLinkId
// @access  Private
exports.deleteOrganizationLink = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const result = await organizationLinkService.deleteOrganizationLink(integrationLinkId, req.user._id);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при удалении связки МойСклад сущностей: ${error.message}`);
    if (error.message.includes('не найдена')) {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Ошибка сервера при удалении связки МойСклад сущностей.' });
  }
};


// --- ЭНДПОИНТЫ ДЛЯ ПОЛУЧЕНИЯ СПИСКОВ СУЩНОСТЕЙ ИЗ МОЙСКЛАД API ---

// @desc    Получить список организаций из МойСклад
// @route   GET /api/organizations/moysklad-list/organizations/:integrationLinkId
// @access  Private
exports.getMoyskladOrganizationsList = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const { searchTerm } = req.query;
    const organizations = await moySkladEntityService.getMoyskladOrganizations(integrationLinkId, req.user._id, searchTerm);
    res.status(200).json(organizations);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении списка организаций из МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении списка организаций из МойСклад.' });
  }
};

// @desc    Получить список контрагентов из МойСклад
// @route   GET /api/organizations/moysklad-list/counterparties/:integrationLinkId
// @access  Private
exports.getMoyskladCounterpartiesList = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const { searchTerm } = req.query;
    const counterparties = await moySkladEntityService.getMoyskladCounterparties(integrationLinkId, req.user._id, searchTerm);
    res.status(200).json(counterparties);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении списка контрагентов из МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении списка контрагентов из МойСклад.' });
  }
};


// @desc    Получить список договоров из МойСклад (заглушка)
// @route   GET /api/organizations/moysklad-list/contracts/:integrationLinkId
// @access  Private
exports.getMoyskladContractsList = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const { searchTerm } = req.query;
    const contracts = await moySkladEntityService.getMoyskladContracts(integrationLinkId, req.user._id, searchTerm);
    res.status(200).json(contracts);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении списка договоров из МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении списка договоров из МойСклад.' });
  }
};


// @desc    Создать организацию в МойСклад
// @route   POST /api/organizations/moysklad-create/organization
// @access  Private
exports.createMoyskladOrganization = async (req, res) => {
  try {
    const { integrationLinkId, organizationName } = req.body;
    if (!organizationName) {
      return res.status(400).json({ message: 'Название организации обязательно.' });
    }

    const newOrganization = await moySkladEntityService.createMoyskladOrganization(
      integrationLinkId,
      req.user._id,
      { name: organizationName } // Передаем только имя для создания
    );
    res.status(201).json(newOrganization); // Возвращаем созданную организацию из МС
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при создании организации в МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании организации в МойСклад.' });
  }
};


// @desc    Создать контрагента в МойСклад
// @route   POST /api/organizations/moysklad-create/counterparty
// @access  Private
exports.createMoyskladCounterparty = async (req, res) => {
  try {
    const { integrationLinkId, counterpartyName } = req.body;
    if (!counterpartyName) {
      return res.status(400).json({ message: 'Название контрагента обязательно.' });
    }

    const newCounterparty = await moySkladEntityService.createMoyskladCounterparty(
      integrationLinkId,
      req.user._id,
      { name: counterpartyName } // Передаем только имя для создания
    );
    res.status(201).json(newCounterparty); // Возвращаем созданного контрагента из МС
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при создании контрагента в МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании контрагента в МойСклад.' });
  }
};



// @desc    Получить список договоров из МойСклад
// @route   GET /api/organizations/moysklad-list/contracts/:integrationLinkId
// @access  Private
exports.getMoyskladContractsList = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const { searchTerm, organizationHref, counterpartyHref } = req.query; // НОВОЕ: Получаем href организации и контрагента

    // Проверяем, что организация и контрагент связаны
    if (!organizationHref || !counterpartyHref) {
      return res.status(400).json({ message: 'Для получения списка договоров необходимо указать href организации и контрагента.' });
    }

    const contracts = await moySkladEntityService.getMoyskladContracts(
      integrationLinkId,
      req.user._id,
      organizationHref,
      counterpartyHref,
      searchTerm
    );
    res.status(200).json(contracts);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении списка договоров из МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении списка договоров из МойСклад.' });
  }
};



// @desc    Создать договор в МойСклад
// @route   POST /api/organizations/moysklad-create/contract
// @access  Private
exports.createMoyskladContract = async (req, res) => {
  try {
    const { integrationLinkId, contractName, ownAgentHref, agentHref } = req.body;
    if (!contractName) {
      return res.status(400).json({ message: 'Название договора обязательно.' });
    }
    if (!ownAgentHref || !agentHref) {
      return res.status(400).json({ message: 'Для создания договора необходимо указать href организации (ownAgent) и контрагента (agent).' });
    }

    const newContract = await moySkladEntityService.createMoyskladContract(
      integrationLinkId,
      req.user._id,
      {
        name: contractName,
        ownAgent: { meta: { href: ownAgentHref, type: 'organization', mediaType: 'application/json' } },
        agent: { meta: { href: agentHref, type: 'counterparty', mediaType: 'application/json' } },
      }
    );
    res.status(201).json(newContract); // Возвращаем созданный договор из МС
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при создании договора в МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании договора в МойСклад.' });
  }
};




// @desc    Получить список складов из МойСклад
// @route   GET /api/organizations/moysklad-list/stores/:integrationLinkId
// @access  Private
exports.getMoyskladStoresList = async (req, res) => {
  try {
    const { integrationLinkId } = req.params;
    const { searchTerm } = req.query;
    const stores = await moySkladEntityService.getMoyskladStores(integrationLinkId, req.user._id, searchTerm);
    res.status(200).json(stores);
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при получении списка складов из МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при получении списка складов из МойСклад.' });
  }
};


// @desc    Создать склад в МойСклад
// @route   POST /api/organizations/moysklad-create/store
// @access  Private
exports.createMoyskladStore = async (req, res) => {
  try {
    const { integrationLinkId, storeName } = req.body;
    if (!storeName) {
      return res.status(400).json({ message: 'Название склада обязательно.' });
    }

    const newStore = await moySkladEntityService.createMoyskladStore(
      integrationLinkId,
      req.user._id,
      { name: storeName } // Передаем только имя для создания
    );
    res.status(201).json(newStore); // Возвращаем созданный склад из МС
  } catch (error) {
    console.error(`[CONTROLLER ERROR] Ошибка при создании склада в МойСклад: ${error.message}`);
    res.status(500).json({ message: error.message || 'Ошибка сервера при создании склада в МойСклад.' });
  }
};
