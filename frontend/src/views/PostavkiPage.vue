<template>
  <div class="postavki-page-container">
    <h2>Поставки Wildberries</h2>
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
    <div v-if="selectedIntegrationId && !loadingIntegrations" class="postavki-table-section">
      <div class="postavki-header">
        <h3>Список поставок</h3>
        <button 
          @click="refreshFromWB" 
          :disabled="loadingPostavki" 
          class="refresh-btn"
        >
          {{ loadingPostavki ? 'Обновление...' : 'Обновить данные' }}
        </button>
      </div>
      <!-- Форма поиска и фильтров -->
      <form class="search-filter-form" @submit.prevent>
        <input
          v-model="search"
          type="text"
          placeholder="Артикул или Штрихкод"
          class="search-input"
        />
        <input
          v-model="dateFrom"
          type="date"
          class="date-input"
          placeholder="Дата от"
        />
        <input
          v-model="dateTo"
          type="date"
          class="date-input"
          placeholder="Дата до"
        />
        <select v-model="status" class="status-select">
          <option value="">Все статусы</option>
          <option v-for="opt in statusOptions" :key="opt" :value="opt" v-if="opt">{{ opt }}</option>
        </select>
        <select v-model="exported" class="exported-select">
          <option value="">Все</option>
          <option value="true">Выгружено в МС</option>
          <option value="false">Не выгружено</option>
        </select>
        <button type="button" class="reset-btn" @click="resetFilters">Сбросить</button>
      </form>
      <!-- Конец формы поиска -->
      <div v-if="loadingPostavki" class="loading-section">
        <p class="loading-message">Загрузка поставок из WB и сохранение в базу данных...</p>
        <div class="loading-spinner"></div>
      </div>
      <p v-if="postavkiError" class="error-message">{{ postavkiError }}</p>
      <div v-if="!loadingPostavki && postavkiSummary" class="summary-section">
        <p class="summary-text">
          Загружено из WB: <strong>{{ postavkiSummary.totalFromWB }}</strong> | 
          Создано новых: <strong>{{ postavkiSummary.saved }}</strong> | 
          Обновлено: <strong>{{ postavkiSummary.updated }}</strong> | 
          Ошибок: <strong>{{ postavkiSummary.errors }}</strong> | 
          Всего в БД: <strong>{{ postavkiSummary.totalInDB }}</strong>
        </p>
      </div>
      <p v-if="!loadingPostavki && postavki.length > 0 && !postavkiSummary" class="info-message">Найдено поставок: {{ postavki.length }}</p>
      <table v-if="!loadingPostavki && postavki.length" class="postavki-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Артикул</th>
            <th>Штрихкод</th>
            <th>Кол-во</th>
            <th>Склад</th>
            <th>Статус</th>
            <th>Выгрузка в МС</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in postavki" :key="item._id">
            <td>{{ item.date }}</td>
            <td>{{ item.supplierArticle }}</td>
            <td>{{ item.barcode }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.warehouseName }}</td>
            <td>{{ item.status }}</td>
            <td>
              <span v-if="item.ms_href" class="ms-status-ok">Создана</span>
              <span v-else class="ms-status-none">—</span>
            </td>
            <td>
              <button class="ms-btn" @click="createDemand(item)" :disabled="!!item.ms_href">Выгрузить в МС</button>
              <button class="del-btn" @click="deleteMsHref(item)" :disabled="!item.ms_href">Удалить в БД</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!loadingPostavki && !postavki.length" class="info-message">Нет данных о поставках.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useIntegrationLinks } from './TovaryPage/composables/useIntegrationLinks.js';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem('token');
const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
  fetchIntegrationLinks
} = useIntegrationLinks(getToken);
const postavki = ref([]);
const loadingPostavki = ref(false);
const postavkiError = ref('');
const postavkiSummary = ref(null);

// --- Фильтры ---
const search = ref(''); // общий поиск по артикулу/штрихкоду
const dateFrom = ref('');
const dateTo = ref('');
const status = ref('');
const exported = ref(''); // 'true' | 'false' | ''

const statusOptions = [
  '', 'Принято', 'Ожидает', 'Отгружено', 'Отменено', 'Ошибка', 'В обработке'
];

const onIntegrationChange = async () => {
  console.log('[PostavkiPage] onIntegrationChange called, selectedIntegrationId:', selectedIntegrationId.value);
  if (selectedIntegrationId.value) {
    await fetchPostavki();
  } else {
    postavki.value = [];
    postavkiError.value = '';
    postavkiSummary.value = null;
  }
};

const fetchPostavki = async () => {
  if (!selectedIntegrationId.value) return;
  loadingPostavki.value = true;
  postavkiError.value = '';
  try {
    // Формируем query параметры
    const params = {};
    if (search.value) params.search = search.value;
    if (dateFrom.value) params.dateFrom = dateFrom.value;
    if (dateTo.value) params.dateTo = dateTo.value;
    if (status.value) params.status = status.value;
    if (exported.value) params.exported = exported.value;
    const response = await axios.get(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params
    });
    if (response.data.data && response.data.summary) {
      postavki.value = response.data.data;
      postavkiSummary.value = response.data.summary;
    } else {
      postavki.value = response.data;
      postavkiSummary.value = null;
    }
  } catch (error) {
    postavkiError.value = error.response?.data?.message || 'Ошибка загрузки поставок';
    postavki.value = [];
    postavkiSummary.value = null;
  } finally {
    loadingPostavki.value = false;
  }
};

const refreshFromWB = async () => {
  if (!selectedIntegrationId.value) return;
  loadingPostavki.value = true;
  postavkiError.value = '';
  try {
    // Формируем query параметры для фильтров
    const params = {};
    if (search.value) params.search = search.value;
    if (dateFrom.value) params.dateFrom = dateFrom.value;
    if (dateTo.value) params.dateTo = dateTo.value;
    if (status.value) params.status = status.value;
    if (exported.value) params.exported = exported.value;
    
    // Запрос на обновление из WB с учетом фильтров
    const response = await axios.post(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/refresh`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params
    });
    
    // Обрабатываем ответ с обновленными данными
    if (response.data.data && response.data.summary) {
      postavki.value = response.data.data;
      postavkiSummary.value = response.data.summary;
    } else {
      postavki.value = response.data;
      postavkiSummary.value = null;
    }
  } catch (error) {
    postavkiError.value = error.response?.data?.message || 'Ошибка обновления из WB';
  } finally {
    loadingPostavki.value = false;
  }
};

const createDemand = async (item) => {
  if (!selectedIntegrationId.value || !item._id) return;
  try {
    await axios.post(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/demand/${item._id}`, {}, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    alert('Отгрузка создана в МойСклад!');
    await fetchPostavki();
  } catch (error) {
    alert('Ошибка создания отгрузки в МойСклад: ' + (error.response?.data?.message || error.message));
  }
};

const deleteMsHref = async (item) => {
  if (!selectedIntegrationId.value || !item._id) return;
  if (!confirm('Удалить ms_href для этой поставки?')) return;
  try {
    await axios.delete(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/demand/${item._id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    await fetchPostavki();
  } catch (error) {
    alert('Ошибка удаления ms_href: ' + (error.response?.data?.message || error.message));
  }
};

const resetFilters = () => {
  search.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  status.value = '';
  exported.value = '';
  // fetchPostavki вызовется автоматически через watch
};

// Автоматический вызов fetchPostavki при изменении любого фильтра
watch([search, dateFrom, dateTo, status, exported], fetchPostavki);

onMounted(async () => {
  await fetchIntegrationLinks();
  if (selectedIntegrationId.value) fetchPostavki();
});
</script>

<style scoped>
.postavki-page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 400px;
  text-align: left;
}
.integration-selector-section {
  margin-bottom: 30px;
}
.integration-select {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
.postavki-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.refresh-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #218838;
}

.refresh-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.postavki-table-section {
  margin-top: 30px;
}
.postavki-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.postavki-table th, .postavki-table td {
  border: 1px solid #e0e0e0;
  padding: 8px 12px;
  text-align: left;
}
.postavki-table th {
  background-color: #f4f4f4;
}
.loading-section {
  text-align: center;
  padding: 20px;
}

.loading-message {
  color: #007bff;
  font-style: italic;
  margin-bottom: 10px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.error-message {
  color: #dc3545;
  font-weight: 500;
}
.summary-section {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
}

.summary-text {
  margin: 0;
  color: #495057;
  font-size: 14px;
}

.summary-text strong {
  color: #007bff;
}

.info-message {
  color: #6c757d;
  font-style: italic;
}
.no-integrations-message {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}
.link-button {
  display: inline-block;
  margin-top: 15px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}
.link-button:hover {
  background-color: #0056b3;
}
.ms-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.3s;
}
.ms-btn:hover:not(:disabled) {
  background-color: #0056b3;
}
.ms-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}
.ms-status-ok {
  color: #28a745;
  font-weight: bold;
}
.ms-status-none {
  color: #aaa;
}
.del-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  margin-left: 6px;
  transition: background-color 0.3s;
}
.del-btn:hover:not(:disabled) {
  background-color: #a71d2a;
}
.del-btn:disabled {
  background-color: #e0aeb2;
  cursor: not-allowed;
}

/* --- Стили для формы поиска и фильтров --- */
.search-filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;
}
.search-input, .date-input, .status-select, .exported-select {
  padding: 7px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}
.search-input {
  min-width: 180px;
}
.date-input {
  min-width: 130px;
}
.status-select, .exported-select {
  min-width: 140px;
}
.reset-btn {
  background: #e0e0e0;
  color: #333;
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.reset-btn:hover {
  background: #bdbdbd;
}
</style>
