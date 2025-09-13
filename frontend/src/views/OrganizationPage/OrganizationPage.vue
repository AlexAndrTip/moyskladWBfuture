<template>
  <div class="organization-page-container">
    <h2>Управление Организациями МойСклад</h2>

    <p v-if="loadingIntegrations" class="loading-message">Загрузка интеграций...</p>
    <p v-if="integrationsError" class="error-message">{{ integrationsError }}</p>

    <div v-if="!loadingIntegrations && integrationLinks.length > 0" class="integration-selector-section">
      <h3>Выберите Интеграцию:</h3>
      <select v-model="selectedIntegrationId" @change="onIntegrationChange" class="integration-select">
        <option value="" disabled>-- Выберите связку (Кабинет - Склад) --</option>
        <option v-for="link in integrationLinks" :key="link._id" :value="link._id">
          {{ link.wbCabinet.name }} - {{ link.storage.name }}
        </option>
      </select>
    </div>
    <div v-else-if="!loadingIntegrations && !integrationsError" class="no-integrations-message">
      <p>Пожалуйста, сначала создайте интеграционные связки на странице "Интеграции".</p>
      <router-link to="/dashboard/integracii" class="link-button">Перейти к Интеграциям</router-link>
    </div>

    <!-- Основной функционал для выбранной интеграции -->
    <div v-if="selectedIntegrationId && !loadingIntegrations" class="organization-management-section">
      <h3>Связанные сущности МойСклад для выбранной интеграции:</h3>

      <p v-if="loadingOrganizationLink" class="loading-message">Загрузка данных связки МойСклад...</p>
      <p v-if="organizationLinkError" class="error-message">{{ organizationLinkError }}</p>

      <div v-if="!loadingOrganizationLink && !organizationLinkError" class="moysklad-link-form">

        <!-- Поле для Организации -->
        <div class="form-group-with-actions">
          <div class="form-group">
            <label for="orgSelect">
              Организация (МойСклад):
              <span v-if="currentOrganizationLink?.moyskladOrganizationHref" class="label-linked-indicator">
                <i class="fas fa-check-circle"></i>
              </span>
            </label>
            <select id="orgSelect" v-model="selectedMoyskladOrganization" class="moysklad-select">
              <option :value="null" disabled>-- Выберите организацию --</option>
              <option v-for="org in moyskladOrganizationsList" :key="org.id" :value="org">
                {{ org.name }}
              </option>
            </select>
          </div>
          <div class="action-buttons">
            <!-- Ссылка: неактивна если нет выбора, идёт сохранение или связь уже есть -->
            <button
              @click="linkOrganization"
              :disabled="!selectedMoyskladOrganization || savingOrganizationLink || currentOrganizationLink?.moyskladOrganizationHref"
              class="action-btn link-btn"
            >
              Связать
            </button>

            <!-- Создание: неактивна если идёт сохранение или связь уже есть -->
            <button
              @click="openCreateOrganizationModal"
              :disabled="savingOrganizationLink || currentOrganizationLink?.moyskladOrganizationHref"
              class="action-btn create-btn"
            >
              Создать в МС
            </button>

            <!-- Удалить: как было -->
            <button
              @click="unlinkOrganization"
              :disabled="!currentOrganizationLink?.moyskladOrganizationHref || savingOrganizationLink"
              class="action-btn unlink-btn"
            >
              Удалить связку
            </button>
          </div>
        </div>

        <!-- Поле для Контрагента -->
        <div class="form-group-with-actions">
          <div class="form-group">
            <label for="counterpartySelect">
              Контрагент (МойСклад):
              <span v-if="currentOrganizationLink?.moyskladCounterpartyHref" class="label-linked-indicator">
                <i class="fas fa-check-circle"></i>
              </span>
            </label>
            <select id="counterpartySelect" v-model="selectedMoyskladCounterparty" class="moysklad-select">
              <option :value="null" disabled>-- Выберите контрагента --</option>
              <option v-for="cp in moyskladCounterpartiesList" :key="cp.id" :value="cp">
                {{ cp.name }}
              </option>
            </select>
          </div>
          <div class="action-buttons">
            <button
              @click="linkCounterparty"
              :disabled="!selectedMoyskladCounterparty || savingOrganizationLink || currentOrganizationLink?.moyskladCounterpartyHref"
              class="action-btn link-btn"
            >
              Связать
            </button>
            <button
              @click="openCreateCounterpartyModal"
              :disabled="savingOrganizationLink || currentOrganizationLink?.moyskladCounterpartyHref"
              class="action-btn create-btn"
            >
              Создать в МС
            </button>
            <button
              @click="unlinkCounterparty"
              :disabled="!currentOrganizationLink?.moyskladCounterpartyHref || savingOrganizationLink"
              class="action-btn unlink-btn"
            >
              Удалить связку
            </button>
          </div>
        </div>

        <!-- Поле для Договора -->
        <div class="form-group-with-actions">
          <div class="form-group">
            <label for="contractSelect">
              Договор (МойСклад):
              <span v-if="currentOrganizationLink?.moyskladContractHref" class="label-linked-indicator">
                <i class="fas fa-check-circle"></i>
              </span>
            </label>
            <select
              id="contractSelect"
              v-model="selectedMoyskladContract"
              class="moysklad-select"
              :disabled="!currentOrganizationLink?.moyskladOrganizationHref || !currentOrganizationLink?.moyskladCounterpartyHref || loadingMoyskladContractsList"
            >
              <option :value="null" disabled>-- Выберите договор --</option>
              <option v-for="contract in moyskladContractsList" :key="contract.id" :value="contract">
                {{ contract.name }}
              </option>
            </select>
            <p v-if="loadingMoyskladContractsList" class="loading-message small-text">Загрузка договоров...</p>
            <p v-if="moyskladContractsListError" class="error-message small-text">{{ moyskladContractsListError }}</p>
            <p v-if="!loadingMoyskladContractsList && !moyskladContractsListError && moyskladContractsList.length === 0 && currentOrganizationLink?.moyskladOrganizationHref && currentOrganizationLink?.moyskladCounterpartyHref" class="info-message small-text">
              Нет доступных договоров для выбранной организации и контрагента.
            </p>
          </div>
          <div class="action-buttons">
            <button
              @click="linkContract"
              :disabled="!selectedMoyskladContract || savingOrganizationLink || currentOrganizationLink?.moyskladContractHref || !currentOrganizationLink?.moyskladOrganizationHref || !currentOrganizationLink?.moyskladCounterpartyHref"
              class="action-btn link-btn"
            >
              Связать
            </button>
            <button
              @click="openCreateContractModal"
              :disabled="savingOrganizationLink || currentOrganizationLink?.moyskladContractHref || !currentOrganizationLink?.moyskladOrganizationHref || !currentOrganizationLink?.moyskladCounterpartyHref"
              class="action-btn create-btn"
            >
              Создать в МС
            </button>
            <button
              @click="unlinkContract"
              :disabled="!currentOrganizationLink?.moyskladContractHref || savingOrganizationLink"
              class="action-btn unlink-btn"
            >
              Удалить связку
            </button>
          </div>
        </div>

        <!-- Поле для Склада -->
        <div class="form-group-with-actions">
          <div class="form-group">
            <label for="storeSelect">
              Склад для товаров (МойСклад):
              <span v-if="currentOrganizationLink?.moyskladStoreHref" class="label-linked-indicator">
                <i class="fas fa-check-circle"></i>
              </span>
            </label>
            <select
              id="storeSelect"
              v-model="selectedMoyskladStore"
              class="moysklad-select"
              :disabled="loadingMoyskladStoresList"
            >
              <option :value="null" disabled>-- Выберите склад --</option>
              <option v-for="store in moyskladStoresList" :key="store.id" :value="store">
                {{ store.name }}
              </option>
            </select>
            <p v-if="loadingMoyskladStoresList" class="loading-message small-text">Загрузка складов...</p>
            <p v-if="moyskladStoresListError" class="error-message small-text">{{ moyskladStoresListError }}</p>
            <p v-if="!loadingMoyskladStoresList && !moyskladStoresListError && moyskladStoresList.length === 0" class="info-message small-text">
              Нет доступных складов.
            </p>
          </div>
          <div class="action-buttons">
            <button
              @click="linkStore"
              :disabled="!selectedMoyskladStore || savingOrganizationLink || currentOrganizationLink?.moyskladStoreHref"
              class="action-btn link-btn"
            >
              Связать
            </button>
            <button
              @click="openCreateStoreModal"
              :disabled="savingOrganizationLink || currentOrganizationLink?.moyskladStoreHref"
              class="action-btn create-btn"
            >
              Создать в МС
            </button>
            <button
              @click="unlinkStore"
              :disabled="!currentOrganizationLink?.moyskladStoreHref || savingOrganizationLink"
              class="action-btn unlink-btn"
            >
              Удалить связку
            </button>
          </div>
        </div>

        <!-- Поле для Склада приемок по расходам WB -->
        <div class="form-group-with-actions">
          <div class="form-group">
            <label for="storeExpensesSelect">
              Склад для приемок по расходам WB (МойСклад):
              <span v-if="currentOrganizationLink?.moyskladStoreExpensesHref" class="label-linked-indicator">
                <i class="fas fa-check-circle"></i>
              </span>
            </label>
            <select
              id="storeExpensesSelect"
              v-model="selectedMoyskladStoreExpenses"
              class="moysklad-select"
              :disabled="loadingMoyskladStoresList"
            >
              <option :value="null" disabled>-- Выберите склад --</option>
              <option v-for="store in moyskladStoresList" :key="store.id" :value="store">
                {{ store.name }}
              </option>
            </select>
            <p v-if="loadingMoyskladStoresList" class="loading-message small-text">Загрузка складов...</p>
            <p v-if="moyskladStoresListError" class="error-message small-text">{{ moyskladStoresListError }}</p>
            <p v-if="!loadingMoyskladStoresList && !moyskladStoresListError && moyskladStoresList.length === 0" class="info-message small-text">
              Нет доступных складов.
            </p>
          </div>
          <div class="action-buttons">
            <button
              @click="linkStoreExpenses"
              :disabled="!selectedMoyskladStoreExpenses || savingOrganizationLink || currentOrganizationLink?.moyskladStoreExpensesHref"
              class="action-btn link-btn"
            >
              Связать
            </button>
            <button
              @click="openCreateStoreModal"
              :disabled="savingOrganizationLink || currentOrganizationLink?.moyskladStoreExpensesHref"
              class="action-btn create-btn"
            >
              Создать в МС
            </button>
            <button
              @click="unlinkStoreExpenses"
              :disabled="!currentOrganizationLink?.moyskladStoreExpensesHref || savingOrganizationLink"
              class="action-btn unlink-btn"
            >
              Удалить связку
            </button>
          </div>
        </div>

        <p v-if="saveMessage" :class="saveMessageType">{{ saveMessage }}</p>

        <div v-if="currentOrganizationLink && (currentOrganizationLink.moyskladOrganizationHref || currentOrganizationLink.moyskladCounterpartyHref || currentOrganizationLink.moyskladContractHref || currentOrganizationLink.moyskladStoreHref || currentOrganizationLink.moyskladStoreExpensesHref)" class="current-links">
          <h4>Текущие ссылки:</h4>
          <p v-if="currentOrganizationLink.moyskladOrganizationHref">Организация: <a :href="currentOrganizationLink.moyskladOrganizationHref" target="_blank">{{ currentOrganizationLink.moyskladOrganizationName || 'Ссылка' }}</a></p>
          <p v-if="currentOrganizationLink.moyskladCounterpartyHref">Контрагент: <a :href="currentOrganizationLink.moyskladCounterpartyHref" target="_blank">{{ currentOrganizationLink.moyskladCounterpartyName || 'Ссылка' }}</a></p>
          <p v-if="currentOrganizationLink.moyskladContractHref">Договор: <a :href="currentOrganizationLink.moyskladContractHref" target="_blank">{{ currentOrganizationLink.moyskladContractName || 'Ссылка' }}</a></p>
          <p v-if="currentOrganizationLink.moyskladStoreHref">Склад для товаров: <a :href="currentOrganizationLink.moyskladStoreHref" target="_blank">{{ currentOrganizationLink.moyskladStoreName || 'Ссылка' }}</a></p>
          <p v-if="currentOrganizationLink.moyskladStoreExpensesHref">Склад для приемок по расходам WB: <a :href="currentOrganizationLink.moyskladStoreExpensesHref" target="_blank">{{ currentOrganizationLink.moyskladStoreExpensesName || 'Ссылка' }}</a></p>
        </div>
      </div>
    </div>

    <!-- Модальное окно для создания организации в МойСклад -->
    <CreateMoyskladOrganizationModal
      :is-open="isCreateOrganizationModalOpen"
      :integration-link-id="selectedIntegrationId"
      :get-token="getToken"
      @close="isCreateOrganizationModalOpen = false"
      @organization-created="handleOrganizationCreated"
    />

    <!-- Модальное окно для создания контрагента в МойСклад -->
    <CreateMoyskladCounterpartyModal
      :is-open="isCreateCounterpartyModalOpen"
      :integration-link-id="selectedIntegrationId"
      :get-token="getToken"
      @close="isCreateCounterpartyModalOpen = false"
      @counterparty-created="handleCounterpartyCreated"
    />

    <!-- Модальное окно для создания договора в МойСклад -->
    <CreateMoyskladContractModal
      :is-open="isCreateContractModalOpen"
      :integration-link-id="selectedIntegrationId"
      :get-token="getToken"
      :own-agent-href="currentOrganizationLink?.moyskladOrganizationHref"
      :agent-href="currentOrganizationLink?.moyskladCounterpartyHref"
      @close="isCreateContractModalOpen = false"
      @contract-created="handleContractCreated"
    />

    <!-- Модальное окно для создания склада в МойСклад -->
    <CreateMoyskladStoreModal
      :is-open="isCreateStoreModalOpen"
      :integration-link-id="selectedIntegrationId"
      :get-token="getToken"
      @close="isCreateStoreModalOpen = false"
      @store-created="handleStoreCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useIntegrationLinks } from '../TovaryPage/composables/useIntegrationLinks.js';
import CreateMoyskladOrganizationModal from './modals/CreateMoyskladOrganizationModal.vue';
import CreateMoyskladCounterpartyModal from './modals/CreateMoyskladCounterpartyModal.vue';
import CreateMoyskladContractModal from './modals/CreateMoyskladContractModal.vue';
import CreateMoyskladStoreModal from './modals/CreateMoyskladStoreModal.vue'; // НОВЫЙ ИМПОРТ МОДАЛКИ ДЛЯ СКЛАДА

const router = useRouter();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getToken = () => localStorage.getItem('token');

const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
} = useIntegrationLinks(getToken);

const currentOrganizationLink = ref(null);
const loadingOrganizationLink = ref(false);
const organizationLinkError = ref('');
const savingOrganizationLink = ref(false);
const saveMessage = ref('');
const saveMessageType = ref('');

const moyskladOrganizationsList = ref([]);
const loadingMoyskladOrganizationsList = ref(false);
const moyskladOrganizationsListError = ref('');

const selectedMoyskladOrganization = ref(null);

const moyskladCounterpartiesList = ref([]);
const loadingMoyskladCounterpartiesList = ref(false);
const moyskladCounterpartiesListError = ref('');

const selectedMoyskladCounterparty = ref(null);

const moyskladContractsList = ref([]);
const loadingMoyskladContractsList = ref(false);
const moyskladContractsListError = ref('');

const selectedMoyskladContract = ref(null);

const moyskladStoresList = ref([]);
const loadingMoyskladStoresList = ref(false);
const moyskladStoresListError = ref('');

const selectedMoyskladStore = ref(null);
const selectedMoyskladStoreExpenses = ref(null); // Новый поле для склада приемок по расходам WB

// ОБЪЕДИНЕННОЕ ОБЪЯВЛЕНИЕ form И СОСТОЯНИЙ МОДАЛЬНЫХ ОКОН
const form = ref({
  moyskladOrganizationName: '',
  moyskladCounterpartyName: '',
  moyskladContractName: '',
  moyskladStoreName: '',
});

const isCreateOrganizationModalOpen = ref(false);
const isCreateCounterpartyModalOpen = ref(false);
const isCreateContractModalOpen = ref(false);
const isCreateStoreModalOpen = ref(false); // НОВОЕ: Состояние для модального окна создания склада


const fetchMoyskladOrganizationsList = async () => {
  if (!selectedIntegrationId.value) {
    moyskladOrganizationsList.value = [];
    return;
  }
  loadingMoyskladOrganizationsList.value = true;
  moyskladOrganizationsListError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/organizations/moysklad-list/organizations/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    moyskladOrganizationsList.value = response.data;
  } catch (error) {
    moyskladOrganizationsListError.value = error.response?.data?.message || 'Ошибка загрузки списка организаций МойСклад.';
    console.error('Ошибка загрузки списка организаций МойСклад:', error);
  } finally {
    loadingMoyskladOrganizationsList.value = false;
  }
};

const fetchMoyskladCounterpartiesList = async () => {
  if (!selectedIntegrationId.value) {
    moyskladCounterpartiesList.value = [];
    return;
  }
  loadingMoyskladCounterpartiesList.value = true;
  moyskladCounterpartiesListError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/organizations/moysklad-list/counterparties/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    moyskladCounterpartiesList.value = response.data;
  } catch (error) {
    moyskladCounterpartiesListError.value = error.response?.data?.message || 'Ошибка загрузки списка контрагентов МойСклад.';
    console.error('Ошибка загрузки списка контрагентов МойСклад:', error);
  } finally {
    loadingMoyskladCounterpartiesList.value = false;
  }
};


const fetchMoyskladContractsList = async () => {
  // Договоры можно загружать только если есть связанные организация и контрагент
  if (!selectedIntegrationId.value || !currentOrganizationLink.value?.moyskladOrganizationHref || !currentOrganizationLink.value?.moyskladCounterpartyHref) {
    moyskladContractsList.value = [];
    return;
  }
  loadingMoyskladContractsList.value = true;
  moyskladContractsListError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/organizations/moysklad-list/contracts/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: {
        organizationHref: currentOrganizationLink.value.moyskladOrganizationHref,
        counterpartyHref: currentOrganizationLink.value.moyskladCounterpartyHref,
      },
    });
    moyskladContractsList.value = response.data;
  } catch (error) {
    moyskladContractsListError.value = error.response?.data?.message || 'Ошибка загрузки списка договоров МойСклад.';
    console.error('Ошибка загрузки списка договоров МойСклад:', error);
  } finally {
    loadingMoyskladContractsList.value = false;
  }
};


const fetchMoyskladStoresList = async () => {
  if (!selectedIntegrationId.value) {
    moyskladStoresList.value = [];
    return;
  }
  loadingMoyskladStoresList.value = true;
  moyskladStoresListError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/organizations/moysklad-list/stores/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    moyskladStoresList.value = response.data;
  } catch (error) {
    moyskladStoresListError.value = error.response?.data?.message || 'Ошибка загрузки списка складов МойСклад.';
    console.error('Ошибка загрузки списка складов МойСклад:', error);
  } finally {
    loadingMoyskladStoresList.value = false;
  }
};


const fetchOrganizationLink = async () => {
  if (!selectedIntegrationId.value) {
    currentOrganizationLink.value = null;
    form.value = {
      moyskladOrganizationName: '',
      moyskladCounterpartyName: '',
      moyskladContractName: '',
      moyskladStoreName: '',
    };
    selectedMoyskladOrganization.value = null;
    selectedMoyskladCounterparty.value = null;
    selectedMoyskladContract.value = null;
    selectedMoyskladStore.value = null; // Сбрасываем и для склада
    selectedMoyskladStoreExpenses.value = null; // Сбрасываем для нового склада
    return;
  }

  loadingOrganizationLink.value = true;
  organizationLinkError.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/organizations/link/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;

    if (response.data) {
      form.value.moyskladOrganizationName = response.data.moyskladOrganizationName || '';
      form.value.moyskladCounterpartyName = response.data.moyskladCounterpartyName || '';
      form.value.moyskladContractName = response.data.moyskladContractName || '';
      form.value.moyskladStoreName = response.data.moyskladStoreName || '';

      if (response.data.moyskladOrganizationHref && moyskladOrganizationsList.value.length > 0) {
        selectedMoyskladOrganization.value = moyskladOrganizationsList.value.find(
          org => org.meta.href === response.data.moyskladOrganizationHref
        ) || null;
      } else {
        selectedMoyskladOrganization.value = null;
      }

      if (response.data.moyskladCounterpartyHref && moyskladCounterpartiesList.value.length > 0) {
        selectedMoyskladCounterparty.value = moyskladCounterpartiesList.value.find(
          cp => cp.meta.href === response.data.moyskladCounterpartyHref
        ) || null;
      } else {
        selectedMoyskladCounterparty.value = null;
      }

      if (response.data.moyskladContractHref && moyskladContractsList.value.length > 0) {
        selectedMoyskladContract.value = moyskladContractsList.value.find(
          contract => contract.meta.href === response.data.moyskladContractHref
        ) || null;
      } else {
        selectedMoyskladContract.value = null;
      }

      if (response.data.moyskladStoreHref && moyskladStoresList.value.length > 0) {
        selectedMoyskladStore.value = moyskladStoresList.value.find(
          store => store.meta.href === response.data.moyskladStoreHref
        ) || null;
      } else {
        selectedMoyskladStore.value = null;
      }

      if (response.data.moyskladStoreExpensesHref && moyskladStoresList.value.length > 0) {
        selectedMoyskladStoreExpenses.value = moyskladStoresList.value.find(
          store => store.meta.href === response.data.moyskladStoreExpensesHref
        ) || null;
      } else {
        selectedMoyskladStoreExpenses.value = null;
      }

    } else {
      form.value = {
        moyskladOrganizationName: '',
        moyskladCounterpartyName: '',
        moyskladContractName: '',
        moyskladStoreName: '',
      };
      selectedMoyskladOrganization.value = null;
      selectedMoyskladCounterparty.value = null;
      selectedMoyskladContract.value = null;
      selectedMoyskladStore.value = null; // Сбрасываем и для склада
      selectedMoyskladStoreExpenses.value = null; // Сбрасываем для нового склада
    }
  } catch (error) {
    organizationLinkError.value = error.response?.data?.message || 'Ошибка загрузки связки МойСклад.';
    console.error('Ошибка загрузки связки МойСклад:', error);
    currentOrganizationLink.value = null;
    form.value = {
      moyskladOrganizationName: '',
      moyskladCounterpartyName: '',
      moyskladContractName: '',
      moyskladStoreName: '',
    };
    selectedMoyskladOrganization.value = null;
    selectedMoyskladCounterparty.value = null;
    selectedMoyskladContract.value = null;
    selectedMoyskladStore.value = null; // Сбрасываем и для склада при ошибке
    selectedMoyskladStoreExpenses.value = null; // Сбрасываем для нового склада
  } finally {
    loadingOrganizationLink.value = false;
  }
};

const linkOrganization = async () => {
  if (!selectedMoyskladOrganization.value) {
    alert('Пожалуйста, выберите организацию для связывания.');
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: selectedMoyskladOrganization.value.name,
      moyskladOrganizationHref: selectedMoyskladOrganization.value.meta.href,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    saveMessage.value = 'Организация МойСклад успешно связана!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка связывания организации МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка связывания организации МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

const openCreateOrganizationModal = () => {
  isCreateOrganizationModalOpen.value = true;
};

const handleOrganizationCreated = (newOrganization) => {
  fetchMoyskladOrganizationsList();
  selectedMoyskladOrganization.value = newOrganization;
  // linkOrganization(); // Закомментировано, если не нужно сразу связывать
};

const unlinkOrganization = async () => {
  if (!currentOrganizationLink.value?.moyskladOrganizationHref) {
    alert('Организация не связана.');
    return;
  }
  if (!confirm('Вы уверены, что хотите удалить связку с этой организацией?')) {
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: null,
      moyskladOrganizationHref: null,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    selectedMoyskladOrganization.value = null;
    saveMessage.value = 'Связка с организацией МойСклад успешно удалена!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка удаления связки с организацией МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка удаления связки с организацией МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

// Функции для Контрагента
const linkCounterparty = async () => {
  if (!selectedMoyskladCounterparty.value) {
    alert('Пожалуйста, выберите контрагента для связывания.');
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: selectedMoyskladCounterparty.value.name,
      moyskladCounterpartyHref: selectedMoyskladCounterparty.value.meta.href,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    saveMessage.value = 'Контрагент МойСклад успешно связан!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка связывания контрагента МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка связывания контрагента МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

const openCreateCounterpartyModal = () => {
  isCreateCounterpartyModalOpen.value = true;
};

const handleCounterpartyCreated = (newCounterparty) => {
  fetchMoyskladCounterpartiesList();
  selectedMoyskladCounterparty.value = newCounterparty;
  // linkCounterparty(); // Возможно, захотите автоматически связать
};

const unlinkCounterparty = async () => {
  if (!currentOrganizationLink.value?.moyskladCounterpartyHref) {
    alert('Контрагент не связан.');
    return;
  }
  if (!confirm('Вы уверены, что хотите удалить связку с этим контрагентом?')) {
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: null,
      moyskladCounterpartyHref: null,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    selectedMoyskladCounterparty.value = null;
    saveMessage.value = 'Связка с контрагентом МойСклад успешно удалена!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка удаления связки с контрагентом МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка удаления связки с контрагентом МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

// Функции для Договора
const linkContract = async () => {
  if (!selectedMoyskladContract.value) {
    alert('Пожалуйста, выберите договор для связывания.');
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: selectedMoyskladContract.value.name,
      moyskladContractHref: selectedMoyskladContract.value.meta.href,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    saveMessage.value = 'Договор МойСклад успешно связан!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка связывания договора МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка связывания договора МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

const openCreateContractModal = () => {
  // Проверяем, связаны ли организация и контрагент
  if (!currentOrganizationLink.value?.moyskladOrganizationHref || !currentOrganizationLink.value?.moyskladCounterpartyHref) {
    alert('Для создания договора необходимо сначала связать Организацию и Контрагента.');
    return;
  }
  isCreateContractModalOpen.value = true;
};

const handleContractCreated = (newContract) => {
  fetchMoyskladContractsList();
  selectedMoyskladContract.value = newContract;
  // linkContract(); // Возможно, захотите автоматически связать
};

const unlinkContract = async () => {
  if (!currentOrganizationLink.value?.moyskladContractHref) {
    alert('Договор не связан.');
    return;
  }
  if (!confirm('Вы уверены, что хотите удалить связку с этим договором?')) {
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: null,
      moyskladContractHref: null,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    selectedMoyskladContract.value = null;
    saveMessage.value = 'Связка с договором МойСклад успешно удалена!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка удаления связки с договором МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка удаления связки с договором МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

// Функции для Склада
const linkStore = async () => {
  if (!selectedMoyskladStore.value) {
    alert('Пожалуйста, выберите склад для связывания.');
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: selectedMoyskladStore.value.name,
      moyskladStoreHref: selectedMoyskladStore.value.meta.href,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    saveMessage.value = 'Склад МойСклад успешно связан!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка связывания склада МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка связывания склада МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

const openCreateStoreModal = () => {
  isCreateStoreModalOpen.value = true;
};

const handleStoreCreated = (newStore) => {
  fetchMoyskladStoresList();
  selectedMoyskladStore.value = newStore;
  // linkStore(); // Возможно, захотите автоматически связать
};

const unlinkStore = async () => {
  if (!currentOrganizationLink.value?.moyskladStoreHref) {
    alert('Склад не связан.');
    return;
  }
  if (!confirm('Вы уверены, что хотите удалить связку с этим складом?')) {
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: null,
      moyskladStoreHref: null,
      moyskladStoreExpensesName: currentOrganizationLink.value?.moyskladStoreExpensesName,
      moyskladStoreExpensesHref: currentOrganizationLink.value?.moyskladStoreExpensesHref,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    selectedMoyskladStore.value = null;
    saveMessage.value = 'Связка со складом МойСклад успешно удалена!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка удаления связки со складом МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка удаления связки со складом МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

// Функции для Склада приемок по расходам WB
const linkStoreExpenses = async () => {
  if (!selectedMoyskladStoreExpenses.value) {
    alert('Пожалуйста, выберите склад для связывания.');
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: selectedMoyskladStoreExpenses.value.name,
      moyskladStoreExpensesHref: selectedMoyskladStoreExpenses.value.meta.href,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    saveMessage.value = 'Склад для приемок по расходам WB МойСклад успешно связан!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка связывания склада для приемок по расходам WB МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка связывания склада для приемок по расходам WB МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

const unlinkStoreExpenses = async () => {
  if (!currentOrganizationLink.value?.moyskladStoreExpensesHref) {
    alert('Склад для приемок по расходам WB не связан.');
    return;
  }
  if (!confirm('Вы уверены, что хотите удалить связку с этим складом для приемок по расходам WB?')) {
    return;
  }
  savingOrganizationLink.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';
  try {
    const payload = {
      integrationLinkId: selectedIntegrationId.value,
      moyskladOrganizationName: currentOrganizationLink.value?.moyskladOrganizationName,
      moyskladOrganizationHref: currentOrganizationLink.value?.moyskladOrganizationHref,
      moyskladCounterpartyName: currentOrganizationLink.value?.moyskladCounterpartyName,
      moyskladCounterpartyHref: currentOrganizationLink.value?.moyskladCounterpartyHref,
      moyskladContractName: currentOrganizationLink.value?.moyskladContractName,
      moyskladContractHref: currentOrganizationLink.value?.moyskladContractHref,
      moyskladStoreName: currentOrganizationLink.value?.moyskladStoreName,
      moyskladStoreHref: currentOrganizationLink.value?.moyskladStoreHref,
      moyskladStoreExpensesName: null,
      moyskladStoreExpensesHref: null,
    };
    const response = await axios.post(`${API_BASE_URL}/organizations/link`, payload, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    currentOrganizationLink.value = response.data;
    selectedMoyskladStoreExpenses.value = null;
    saveMessage.value = 'Связка со складом для приемок по расходам WB МойСклад успешно удалена!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка удаления связки со складом для приемок по расходам WB МойСклад.';
    saveMessageType.value = 'error';
    console.error('Ошибка удаления связки со складом для приемок по расходам WB МойСклад:', error);
  } finally {
    savingOrganizationLink.value = false;
  }
};

const onIntegrationChange = () => {
  fetchMoyskladOrganizationsList();
  fetchMoyskladCounterpartiesList();
  fetchMoyskladContractsList();
  fetchMoyskladStoresList();
  fetchOrganizationLink();
};

watch(selectedIntegrationId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    fetchMoyskladOrganizationsList();
    fetchMoyskladCounterpartiesList();
    fetchMoyskladContractsList();
    fetchMoyskladStoresList();
    fetchOrganizationLink();
  }
});

watch(moyskladOrganizationsList, (newList) => {
  if (currentOrganizationLink.value && currentOrganizationLink.value.moyskladOrganizationHref) {
    selectedMoyskladOrganization.value = newList.find(
      org => org.meta.href === currentOrganizationLink.value.moyskladOrganizationHref
    ) || null;
  }
});

watch(moyskladCounterpartiesList, (newList) => {
  if (currentOrganizationLink.value && currentOrganizationLink.value.moyskladCounterpartyHref) {
    selectedMoyskladCounterparty.value = newList.find(
      cp => cp.meta.href === currentOrganizationLink.value.moyskladCounterpartyHref
    ) || null;
  }
});

watch(moyskladContractsList, (newList) => {
  if (currentOrganizationLink.value && currentOrganizationLink.value.moyskladContractHref) {
    selectedMoyskladContract.value = newList.find(
      contract => contract.meta.href === currentOrganizationLink.value.moyskladContractHref
    ) || null;
  }
});

watch(moyskladStoresList, (newList) => {
  if (currentOrganizationLink.value && currentOrganizationLink.value.moyskladStoreHref) {
    selectedMoyskladStore.value = newList.find(
      store => store.meta.href === currentOrganizationLink.value.moyskladStoreHref
    ) || null;
  }
});

watch(moyskladStoresList, (newList) => {
  if (currentOrganizationLink.value && currentOrganizationLink.value.moyskladStoreExpensesHref) {
    selectedMoyskladStoreExpenses.value = newList.find(
      store => store.meta.href === currentOrganizationLink.value.moyskladStoreExpensesHref
    ) || null;
  }
});

// Watcher для отслеживания изменений в связанных организация и контрагенте
watch(() => [currentOrganizationLink.value?.moyskladOrganizationHref, currentOrganizationLink.value?.moyskladCounterpartyHref], ([newOrgHref, newCpHref], [oldOrgHref, oldCpHref]) => {
  // Если изменились href организации или контрагента, и оба теперь связаны, или если они были связаны и теперь нет
  if ((newOrgHref && newCpHref && (newOrgHref !== oldOrgHref || newCpHref !== oldCpHref)) || (!newOrgHref || !newCpHref)) {
    fetchMoyskladContractsList();
    selectedMoyskladContract.value = null; // Сбрасываем выбранный договор
  }
}, { deep: true });

// Функция для установки первой интеграции по умолчанию
const setDefaultIntegration = () => {
  if (integrationLinks.value.length > 0 && !selectedIntegrationId.value) {
    selectedIntegrationId.value = integrationLinks.value[0]._id;
  }
};

// Следим за загрузкой интеграций и устанавливаем первую по умолчанию
watch(integrationLinks, (newLinks) => {
  if (newLinks.length > 0 && !selectedIntegrationId.value) {
    setDefaultIntegration();
  }
}, { immediate: true });

onMounted(() => {
  if (selectedIntegrationId.value) {
    fetchMoyskladOrganizationsList();
    fetchMoyskladCounterpartiesList();
    fetchMoyskladContractsList();
    fetchMoyskladStoresList();
    fetchOrganizationLink();
  }
});
</script>

<style scoped>
.organization-page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 400px;
  text-align: left;
}

h2 {
  color: #333;
  margin-bottom: 25px;
  text-align: center;
}

.loading-message, .error-message {
  text-align: center;
  margin-top: 20px;
  color: #666;
}
.error-message {
  color: #dc3545;
  font-weight: bold;
}

.no-integrations-message {
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background-color: #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
}
.no-integrations-message p {
  margin: 0;
}
.link-button {
  background-color: #007bff;
  color: white;
  padding: 10px 15px;
  border-radius: 5px;
  text-decoration: none;
  transition: background-color 0.3s ease;
}
.link-button:hover {
  background-color: #0056b3;
}

.integration-selector-section {
  margin-bottom: 30px;
}
.integration-selector-section h3 {
  margin-bottom: 15px;
  color: #555;
  font-size: 1.2em;
}
.integration-select {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.organization-management-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.organization-management-section h3 {
  margin-bottom: 20px;
  text-align: center;
}

.moysklad-link-form {
  background-color: #f9f9f9;
  padding: 25px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.form-group-with-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  margin-bottom: 20px;
  gap: 10px;
}

.form-group {
  flex: 1;
  min-width: 250px;
  margin-bottom: 0;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

/* Оставляем этот для остальных полей */
.linked-indicator {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #28a745;
  font-size: 1.5em;
}

/* Новый класс для галочки в лейбле */
.label-linked-indicator {
  margin-left: 8px;
  color: #28a745;
  font-size: 1.2em;
  vertical-align: middle;
}

.form-group input[type="text"],
.moysklad-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
  background-color: #ffffff;
  appearance: none;
  background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2C197.9c-3.6%2C3.6-8.3%2C5.4-13.1%2C5.4s-9.5-1.8-13.1-5.4L146.2%2C77.4L32.6%2C197.9c-3.6%2C3.6-8.3%2C5.4-13.1%2C5.4s-9.5-1.8-13.1-5.4c-7.3-7.3-7.3-19.1%2C0-26.4L133%2C50.9c7.3-7.3%2C19.1-7.3%2C26.4%2C0l119.6%2C119.6C294.3%2C178.9%2C294.3%2C190.7%2C287%2C197.9z%22%2F%3E%3C%2Fsvg%3E');
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.action-btn {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: bold;
  transition: background-color 0.3s ease;
  white-space: nowrap;
}

.link-btn { background-color: #007bff; color: white; }
.link-btn:hover:not(:disabled) { background-color: #0056b3; }
.create-btn { background-color: #28a745; color: white; }
.create-btn:hover:not(:disabled) { background-color: #218838; }
.unlink-btn { background-color: #dc3545; color: white; }
.unlink-btn:hover:not(:disabled) { background-color: #c82333; }

.action-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.current-links {
  margin-top: 30px;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.current-links h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
}

.current-links p {
  margin-bottom: 5px;
  color: #666;
}

.current-links a {
  color: #007bff;
  text-decoration: none;
}

.current-links a:hover {
  text-decoration: underline;
}

.success {
  color: #28a745;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
}

.error {
  color: #dc3545;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
}

/* Мобильная адаптивность */
@media (max-width: 768px) {
  .form-group-with-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .form-group {
    min-width: unset;
    width: 100%;
  }
  .action-buttons {
    justify-content: flex-start;
    width: 100%;
  }
}
</style>
