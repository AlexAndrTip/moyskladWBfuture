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
      <p v-if="!loadingPostavki && postavki.length > 0 && !postavkiSummary" class="info-message">Найдено поставок: {{ totalPostavki }}</p>
      
      <!-- Пагинация сверху -->
      <PaginationControls
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        v-model:postavki-per-page="postavkiPerPage"
        v-model:page-input="pageInput"
        @change-page="changePage"
        @go-to-page="goToPage"
        @update:postavki-per-page="onPostavkiPerPageChange"
        :is-top="true"
      />

      <!-- ДОБАВЛЕНО: панель массовых действий -->
      <div v-if="selectedIds.length" class="bulk-actions-bar">
        <span>Выбрано: {{ selectedIds.length }}</span>
        <button class="bulk-btn" @click="selectAllAcrossPages">Выбрать все</button>
        <button class="bulk-btn" @click="openBulkModal">Редактировать выбранные</button>
        <button class="bulk-btn" @click="clearSelection">Снять выделение</button>
      </div>

      <table v-if="!loadingPostavki && postavki.length" class="postavki-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="allPageSelected"
                @change="toggleSelectPage"
              />
            </th>
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
            <td>
              <input type="checkbox" :checked="isSelected(item._id)" @change="toggleSelection(item._id)" />
            </td>
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

      <!-- Пагинация снизу -->
      <PaginationControls
        v-if="totalPages > 1"
        :current-page="currentPage"
        :total-pages="totalPages"
        v-model:postavki-per-page="postavkiPerPage"
        v-model:page-input="pageInput"
        @change-page="changePage"
        @go-to-page="goToPage"
        @update:postavki-per-page="onPostavkiPerPageChange"
        :is-top="false"
      />
    </div>

    <!-- ДОБАВЛЕНО: модальное окно массовых действий -->
    <div v-if="showBulkModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Редактирование выбранных ({{ selectedIds.length }})</h3>
        <div class="modal-actions">
          <button class="ms-btn" @click="bulkCreateDemand" :disabled="bulkLoading">Выгрузить в МС</button>
          <button class="del-btn" @click="bulkDeleteMsHref" :disabled="bulkLoading">Удалить в БД</button>
          <button class="reset-btn" @click="closeBulkModal" :disabled="bulkLoading">Отмена</button>
        </div>
        <p v-if="bulkLoading" class="loading-message" style="margin-top:10px;">Обработка...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useIntegrationLinks } from './TovaryPage/composables/useIntegrationLinks.js';
import { usePostavki } from './PostavkiPage/composables/usePostavki.js';
import PaginationControls from './PostavkiPage/components/PaginationControls.vue';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => localStorage.getItem('token');

const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
  fetchIntegrationLinks
} = useIntegrationLinks(getToken);

// Используем новый composable для поставок с пагинацией
const {
  postavki,
  loadingPostavki,
  postavkiError,
  postavkiSummary,
  currentPage,
  totalPages,
  totalPostavki,
  postavkiPerPage,
  pageInput,
  search,
  dateFrom,
  dateTo,
  status,
  exported,
  fetchPostavki,
  refreshFromWB,
  changePage,
  onPostavkiPerPageChange,
  goToPage,
  resetFilters,
} = usePostavki(selectedIntegrationId, getToken);

// Опции статусов
const statusOptions = [
  '', 'Принято', 'Ожидает', 'Отгружено', 'Отменено', 'Ошибка', 'В обработке'
];

const onIntegrationChange = async () => {
  console.log('[PostavkiPage] onIntegrationChange called, selectedIntegrationId:', selectedIntegrationId.value);
  if (selectedIntegrationId.value) {
    await fetchPostavki();
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

// === ДОБАВЛЕНО: логика выбора и массовых действий ===
const selectedIds = ref([]);
const showBulkModal = ref(false);
const bulkLoading = ref(false);

const isSelected = (id) => selectedIds.value.includes(id);

function toggleSelection(id) {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id);
  } else {
    selectedIds.value.push(id);
  }
}

function clearSelection() {
  selectedIds.value = [];
}

async function selectAllAcrossPages() {
  if (!selectedIntegrationId.value) return;
  try {
    const params = {
      page: 1,
      limit: totalPostavki.value || 10000,
    };
    // применяем активные фильтры
    if (search.value) params.search = search.value;
    if (dateFrom.value) params.dateFrom = dateFrom.value;
    if (dateTo.value) params.dateTo = dateTo.value;
    if (status.value) params.status = status.value;
    if (exported.value) params.exported = exported.value;

    const response = await axios.get(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      params,
    });
    const allItems = response.data.data ? response.data.data : response.data;
    selectedIds.value = allItems.map((i) => i._id);
  } catch (e) {
    alert('Ошибка выборки всех поставок: ' + (e.response?.data?.message || e.message));
  }
}

function openBulkModal() {
  showBulkModal.value = true;
}
function closeBulkModal() {
  showBulkModal.value = false;
}

async function bulkCreateDemand() {
  if (!selectedIds.value.length) return;
  if (!confirm(`Выгрузить ${selectedIds.value.length} выбранных поставок в МойСклад?`)) return;
  bulkLoading.value = true;
  try {
    await Promise.all(
      selectedIds.value.map((id) =>
        axios.post(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/demand/${id}`, {}, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
      )
    );
    alert('Отгрузки успешно созданы!');
    await fetchPostavki();
    clearSelection();
    closeBulkModal();
  } catch (e) {
    alert('Ошибка массовой выгрузки: ' + (e.response?.data?.message || e.message));
  } finally {
    bulkLoading.value = false;
  }
}

async function bulkDeleteMsHref() {
  if (!selectedIds.value.length) return;
  if (!confirm(`Удалить ms_href у ${selectedIds.value.length} выбранных поставок?`)) return;
  bulkLoading.value = true;
  try {
    await Promise.all(
      selectedIds.value.map((id) =>
        axios.delete(`${API_BASE_URL}/postavki/${selectedIntegrationId.value}/demand/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
      )
    );
    alert('Ссылки ms_href успешно удалены!');
    await fetchPostavki();
    clearSelection();
    closeBulkModal();
  } catch (e) {
    alert('Ошибка массового удаления: ' + (e.response?.data?.message || e.message));
  } finally {
    bulkLoading.value = false;
  }
}
// === КОНЕЦ добавленного кода ===

// === Чекбокс «выбрать всё на странице» ===
const allPageSelected = computed(() =>
  postavki.value.length > 0 && postavki.value.every((item) => selectedIds.value.includes(item._id))
);

function toggleSelectPage() {
  if (allPageSelected.value) {
    // снять выделение с элементов текущей страницы
    const pageIds = postavki.value.map((i) => i._id);
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id));
  } else {
    // добавить все элементы текущей страницы
    postavki.value.forEach((item) => {
      if (!selectedIds.value.includes(item._id)) {
        selectedIds.value.push(item._id);
      }
    });
  }
}
// === конец добавленного ===

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
.bulk-actions-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  padding: 10px;
  background: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 4px;
}
.bulk-btn {
  background: #17a2b8;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s;
}
.bulk-btn:hover {
  background: #138496;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 6px;
  width: 300px;
  text-align: center;
}
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}
</style>
