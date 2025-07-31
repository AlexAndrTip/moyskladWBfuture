<template>
  <div class="otcheti-page-container">
    <h2>Отчеты Wildberries</h2>
    
    <!-- Выпадающее меню интеграций -->
    <div class="integration-selector-section">
      <h3>Выберите Интеграцию:</h3>
      <p v-if="loadingIntegrations" class="loading-message">Загрузка интеграций...</p>
      <p v-if="integrationsError" class="error-message">{{ integrationsError }}</p>

      <div v-if="!loadingIntegrations && integrationLinks.length > 0">
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
    </div>
    
    <!-- Таблица отчетов -->
    <div v-if="selectedIntegrationId && !loadingIntegrations" class="reports-section">
      <div class="reports-header">
        <h3>Список отчетов</h3>
        <!-- панель массовых действий -->
        <div v-if="selectedIds.length" class="bulk-actions-bar">
          <span>Выбрано: {{ selectedIds.length }}</span>
          <button class="bulk-btn" @click="openBulkModal">Редактировать выбранные</button>
          <button class="bulk-btn" @click="clearSelection">Снять выделение</button>
        </div>
      </div>

      <table class="reports-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
            </th>
            <th>ID</th>
            <th>Период</th>
            <th>Загружен в БД</th>
            <th>Выгружен в МС</th>
            <th>Приемки услуг в МС</th>
            <th>Расходные ордера в МС</th>
            <th>Приходный ордер МС</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.id" class="report-row">
            <td>
              <input type="checkbox" :checked="isSelected(report.id)" @change="toggleSelection(report.id)" />
            </td>
            <td class="report-id">
              <template v-if="report.loadedInDB">
                <a href="#" @click.prevent="openReportDetails(report.id)">{{ report.id }}</a>
              </template>
              <template v-else>
                {{ report.id }}
              </template>
            </td>
            <td class="report-period">{{ report.period }}</td>
            <td class="report-status">
              <span v-if="report.loadedInDB" class="status-loaded"><i class="fas fa-check-circle"></i></span>
              <span v-else class="status-not-loaded">—</span>
            </td>
            <td class="report-status">
              <span v-if="report.exportedToMS" class="status-loaded"><i class="fas fa-check-circle"></i></span>
              <span v-else class="status-not-loaded">—</span>
            </td>
            <td class="report-status">
              <span v-if="report.serviceReceiptsCreated" class="status-loaded"><i class="fas fa-check-circle"></i></span>
              <span v-else class="status-not-loaded">—</span>
            </td>
            <td class="report-status">
              <span v-if="report.expenseOrdersCreated" class="status-loaded"><i class="fas fa-check-circle"></i></span>
              <span v-else class="status-not-loaded">—</span>
            </td>
            <td class="report-status">
              <span v-if="report.incomeOrdersCreated" class="status-loaded"><i class="fas fa-check-circle"></i></span>
              <span v-else class="status-not-loaded">—</span>
            </td>
            <td class="report-actions">
              <div class="action-row">
                <button 
                  @click="loadToDB(report)" 
                  :disabled="report.loadedInDB || loadingReportIds.has(report.id)"
                  class="action-btn load-btn"
                >
                  <span v-if="loadingReportIds.has(report.id)" class="loading-spinner"></span>
                  {{ loadingReportIds.has(report.id) ? 'Загрузка...' : 'Загрузить в БД' }}
                </button>
                <button 
                  @click="deleteFromDB(report)" 
                  :disabled="!report.loadedInDB || loadingReportIds.has(report.id)"
                  class="action-btn delete-btn"
                >
                  Удалить из БД
                </button>
                <button 
                  @click="exportToMS(report)" 
                  :disabled="!report.loadedInDB || report.exportedToMS || exportLoadingIds.has(report.id)"
                  class="action-btn export-btn"
                >
                  <span v-if="exportLoadingIds.has(report.id)" class="loading-spinner"></span>
                  {{ exportLoadingIds.has(report.id) ? 'Выгрузка...' : 'Выгрузить в МС' }}
                </button>
              </div>
              <div class="action-row">
                <button 
                  @click="createServiceReceipts(report)" 
                  :disabled="!report.loadedInDB || !report.exportedToMS || report.serviceReceiptsCreated || serviceLoadingIds.has(report.id)"
                  class="action-btn service-btn"
                >
                  <span v-if="serviceLoadingIds.has(report.id)" class="loading-spinner"></span>
                  {{ serviceLoadingIds.has(report.id) ? 'Создание...' : 'Приемки услуг' }}
                </button>
                <button 
                  @click="createExpenseOrders(report)" 
                  :disabled="!report.loadedInDB || !report.exportedToMS || report.expenseOrdersCreated || expenseLoadingIds.has(report.id)"
                  class="action-btn expense-btn"
                >
                  <span v-if="expenseLoadingIds.has(report.id)" class="loading-spinner"></span>
                  {{ expenseLoadingIds.has(report.id) ? 'Создание...' : 'Расходные ордера' }}
                </button>
                <button 
                  @click="createIncomeOrders(report)" 
                  :disabled="!report.loadedInDB || !report.exportedToMS || report.incomeOrdersCreated || incomeLoadingIds.has(report.id)"
                  class="action-btn income-btn"
                >
                  <span v-if="incomeLoadingIds.has(report.id)" class="loading-spinner"></span>
                  {{ incomeLoadingIds.has(report.id) ? 'Создание...' : 'Приходный ордер' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="reports.length === 0" class="no-reports-message">
        Нет доступных отчетов для выбранной интеграции.
      </p>
    </div>
    
    <!-- Уведомление -->
    <div v-if="notification.show" class="notification" :class="notification.type">
      <div class="notification-content">
        <span class="notification-message">{{ notification.message }}</span>
        <button @click="hideNotification" class="notification-close">&times;</button>
      </div>
    </div>

    <!-- Модальное окно для деталей отчета -->
    <ReportDetailsModal
      :is-open="isModalOpen"
      :report-id="selectedReportId"
      :integration-link-id="selectedIntegrationId"
      :get-token="getToken"
      @close="isModalOpen = false"
    />

    <!-- Модальное окно массовых действий -->
    <BulkEditReportsModal
      :is-open="showBulkModal"
      :selected-count="selectedIds.length"
      :available-actions="availableActions"
      :bulk-action-in-progress="bulkActionInProgress"
      @close="closeBulkModal"
      @bulk-action="executeBulkAction"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import ReportDetailsModal from './OtchetiPage/components/ReportDetailsModal.vue'; // Импортируем компонент
import BulkEditReportsModal from './OtchetiPage/modals/BulkEditReportsModal.vue'; // Модальное окно массовых действий

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Функция для получения токена
const getToken = () => localStorage.getItem('token');

// Состояние для модального окна
const isModalOpen = ref(false);
const selectedReportId = ref('');

// Открыть модальное окно с деталями
const openReportDetails = (reportId) => {
  selectedReportId.value = reportId;
  isModalOpen.value = true;
};

// Состояние интеграций
const integrationLinks = ref([]);
const loadingIntegrations = ref(false);
const integrationsError = ref('');
const selectedIntegrationId = ref('');

// Состояние для отчетов
const reports = ref([]);
const loadedReportsStatus = ref(new Set());
const loadingReportIds = ref(new Set());
const exportedReportsStatus = ref(new Set());
const exportLoadingIds = ref(new Set());
const serviceLoadingIds = ref(new Set());
const expenseLoadingIds = ref(new Set());
const incomeLoadingIds = ref(new Set());

// === Выбор отчётов и массовые действия ===
const selectedIds = ref([]); // выбранные ID отчётов
const showBulkModal = ref(false);
const bulkActionInProgress = ref(false);

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

const allSelected = computed(() => reports.value.length > 0 && reports.value.every(r => selectedIds.value.includes(r.id)));

function toggleSelectAll() {
  if (allSelected.value) {
    clearSelection();
  } else {
    selectedIds.value = reports.value.map(r => r.id);
  }
}

function openBulkModal() {
  showBulkModal.value = true;
}

function closeBulkModal() {
  showBulkModal.value = false;
}

const availableActions = computed(() => {
  if (!selectedIds.value.length) return [];
  const sel = reports.value.filter(r => selectedIds.value.includes(r.id));
  const allLoaded = sel.every(r => r.loadedInDB);
  const noneLoaded = sel.every(r => !r.loadedInDB);
  const allExported = sel.every(r => r.exportedToMS);
  const noneExported = sel.every(r => !r.exportedToMS);
  const allReceiptsDone = sel.every(r => r.serviceReceiptsCreated);
  const noneReceiptsDone = sel.every(r => !r.serviceReceiptsCreated);
  const allExpensesDone = sel.every(r => r.expenseOrdersCreated);
  const noneExpensesDone = sel.every(r => !r.expenseOrdersCreated);

  const actions = [];
  if (noneLoaded) actions.push('loadToDB');
  if (allLoaded) actions.push('deleteFromDB');
  if (allLoaded && noneExported) actions.push('exportToMS');
  if (allLoaded && allExported && noneReceiptsDone) actions.push('createServiceReceipts');
  if (allLoaded && allExported && noneExpensesDone) actions.push('createExpenseOrders');
  if (allLoaded && allExported && sel.every(r=>!r.incomeOrdersCreated)) actions.push('createIncomeOrders');
  return actions;
});

async function executeBulkAction(action) {
  if (!selectedIds.value.length) return;
  bulkActionInProgress.value = true;
  try {
    const selectedReports = reports.value.filter(r => selectedIds.value.includes(r.id));
    // Закрываем модальное окно перед началом выполнения операций
    closeBulkModal();
    switch (action) {
      case 'loadToDB':
        for (const rep of selectedReports) {
          if (!rep.loadedInDB) {
            await loadToDB(rep);
          }
        }
        break;
      case 'deleteFromDB':
        for (const rep of selectedReports) {
          if (rep.loadedInDB) {
            await deleteFromDB(rep, true);
          }
        }
        break;
      case 'exportToMS':
        for (const rep of selectedReports) {
          if (!rep.exportedToMS && rep.loadedInDB) {
            await exportToMS(rep);
          }
        }
        break;
      case 'createServiceReceipts':
        for (const rep of selectedReports) {
          if (!rep.serviceReceiptsCreated && rep.exportedToMS && rep.loadedInDB) {
            await createServiceReceipts(rep);
          }
        }
        break;
      case 'createExpenseOrders':
        for (const rep of selectedReports) {
          if (!rep.expenseOrdersCreated && rep.exportedToMS && rep.loadedInDB) {
            await createExpenseOrders(rep);
          }
        }
        break;
      case 'createIncomeOrders':
        for (const rep of selectedReports) {
          if (!rep.incomeOrdersCreated && rep.exportedToMS && rep.loadedInDB) {
            await createIncomeOrders(rep);
          }
        }
        break;
      default:
        break;
    }
    // после выполнения перезагружаем статусы
    await loadReportsStatus();
    clearSelection();
  } catch (e) {
    console.error('Ошибка массового действия:', e);
    showNotification('Ошибка массовой операции: ' + (e.response?.data?.message || e.message), 'error');
  } finally {
    bulkActionInProgress.value = false;
  }
}

// Состояние для уведомлений
const notification = ref({ show: false, message: '', type: 'success' });

// Состояние для настроек
const settings = ref({
  reportDepthWeeks: 0, // Будет загружено из БД
  createServiceReceipts: false, // Автоматически создавать приемки услуг
  createServiceExpenseOrders: false // Автоматически создавать расходные ордера
});

// Загрузка настроек интеграции
const fetchSettings = async () => {
  if (!selectedIntegrationId.value) {
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/settings/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    
    settings.value = {
      reportDepthWeeks: response.data.reportDepthWeeks ?? 12,
      createServiceReceipts: response.data.createServiceReceipts ?? false,
      createServiceExpenseOrders: response.data.createServiceExpenseOrders ?? false
    };
    
    console.log(`[OTCHETI] Загружены настройки. Глубина отчетов: ${settings.value.reportDepthWeeks} недель`);
  } catch (error) {
    console.error('Ошибка загрузки настроек:', error);
    // Используем значение по умолчанию
    settings.value.reportDepthWeeks = 12;
  }
};

// Загрузка интеграций
const fetchIntegrations = async () => {
  loadingIntegrations.value = true;
  integrationsError.value = '';
  
  try {
    const token = getToken();
    
    const response = await axios.get(`${API_BASE_URL}/integration-links`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Проверяем, что ответ - это массив
    if (Array.isArray(response.data)) {
      integrationLinks.value = response.data;
    } else {
      integrationsError.value = 'Некорректный формат ответа от сервера';
    }
  } catch (error) {
    console.error('[OTCHETI] Ошибка загрузки интеграций:', error);
    integrationsError.value = 'Ошибка загрузки интеграций: ' + (error.response?.data?.message || error.message);
  } finally {
    loadingIntegrations.value = false;
  }
};

// Обработчик изменения интеграции
const onIntegrationChange = () => {
  if (selectedIntegrationId.value) {
    // Настройки и отчеты будут загружены через watch
  } else {
    reports.value = [];
    loadedReportsStatus.value.clear();
    clearSelection(); // Очищаем выделение при смене интеграции
  }
};

// Обновлённая загрузка статуса отчётов (БД + экспорт)
const loadReportsStatus = async () => {
  if (!selectedIntegrationId.value) return;
  
  try {
    const response = await axios.get(`${API_BASE_URL}/reports/status/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    if (response.data.success) {
      // Создаем Set из загруженных и экспортированных отчетов для быстрой проверки
      loadedReportsStatus.value = new Set(response.data.loadedReports);
      exportedReportsStatus.value = new Set(response.data.exportedReports || []);
      const receiptsSet = new Set(response.data.serviceReceipts || []);
      const expensesSet = new Set(response.data.expenseOrders || []);
      const incomeOrdersSet = new Set(response.data.incomeOrders || []);
      
      // Обновляем статус в списке отчетов
      reports.value.forEach(report => {
        report.loadedInDB = loadedReportsStatus.value.has(report.id);
        report.exportedToMS = exportedReportsStatus.value.has(report.id);
        report.serviceReceiptsCreated = receiptsSet.has(report.id);
        report.expenseOrdersCreated = expensesSet.has(report.id);
        report.incomeOrdersCreated = incomeOrdersSet.has(report.id);
      });
    }
  } catch (error) {
    console.error('Ошибка загрузки статуса отчетов:', error);
    // Не показываем ошибку пользователю, просто логируем
  }
};

// Показать уведомление
const showNotification = (message, type = 'success') => {
  notification.value = { show: true, message, type };
  setTimeout(() => {
    notification.value.show = false;
  }, 5000); // Скрыть через 5 секунд
};

// Скрыть уведомление
const hideNotification = () => {
  notification.value.show = false;
};

// Загрузка отчета в БД
const loadToDB = async (report) => {
  if (!selectedIntegrationId.value) return;
  
  // Добавляем отчет в список загружающихся
  loadingReportIds.value.add(report.id);
  
  try {
    console.log('Загрузка отчета в БД:', report.id);
    
    // Форматируем даты для API (YYYY-MM-DD)
    const formatDateForAPI = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const response = await axios.post(`${API_BASE_URL}/reports/upload`, {
      integrationLinkId: selectedIntegrationId.value,
      reportId: report.id,
      dateFrom: formatDateForAPI(report.startDate),
      dateTo: formatDateForAPI(report.endDate)
    }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    if (response.data.success) {
      showNotification(`Отчет ${report.id} успешно загружен в БД! Загружено записей: ${response.data.count}`);
      report.loadedInDB = true;
      loadedReportsStatus.value.add(report.id); // Обновляем статус в Set
    } else {
      showNotification('Ошибка загрузки отчета в БД', 'error');
    }
  } catch (error) {
    console.error('Ошибка загрузки отчета в БД:', error);
    if (error.response?.status === 401) {
      showNotification('Ошибка авторизации. Пожалуйста, войдите в систему заново.', 'error');
    } else {
      showNotification('Ошибка загрузки отчета в БД: ' + (error.response?.data?.message || error.message), 'error');
    }
  } finally {
    // Убираем отчет из списка загружающихся
    loadingReportIds.value.delete(report.id);
  }
};

// Удаление отчета из БД
const deleteFromDB = async (report, skipConfirm = false) => {
  if (!selectedIntegrationId.value) return;
  
  // Запрашиваем подтверждение (если не массовый вызов)
  if (!skipConfirm) {
    if (!confirm(`Вы уверены, что хотите удалить отчет ${report.id} из БД? Это действие нельзя отменить.`)) {
      return;
    }
  }
  
  // Добавляем отчет в список загружающихся
  loadingReportIds.value.add(report.id);
  
  try {
    console.log('Удаление отчета из БД:', report.id);
    
    const response = await axios.delete(`${API_BASE_URL}/reports/${selectedIntegrationId.value}/${report.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    if (response.data.success) {
      showNotification(`Отчет ${report.id} успешно удален из БД! Удалено записей: ${response.data.deletedCount}`);
      report.loadedInDB = false;
      loadedReportsStatus.value.delete(report.id); // Обновляем статус в Set
      // сброс остальных статусов
      report.exportedToMS = false;
      report.serviceReceiptsCreated = false;
      report.expenseOrdersCreated = false;
      report.incomeOrdersCreated = false;
      exportedReportsStatus.value.delete(report.id);
      serviceLoadingIds.value.delete(report.id);
      expenseLoadingIds.value.delete(report.id);
      incomeLoadingIds.value.delete(report.id);
    } else {
      showNotification('Ошибка удаления отчета из БД', 'error');
    }
  } catch (error) {
    console.error('Ошибка удаления отчета из БД:', error);
    if (error.response?.status === 401) {
      showNotification('Ошибка авторизации. Пожалуйста, войдите в систему заново.', 'error');
    } else {
      showNotification('Ошибка удаления отчета из БД: ' + (error.response?.data?.message || error.message), 'error');
    }
  } finally {
    // Убираем отчет из списка загружающихся
    loadingReportIds.value.delete(report.id);
  }
};

// Выгрузка отчета в МС
const exportToMS = async (report) => {
  if (!selectedIntegrationId.value) return;

  // Помечаем как загружающийся
  exportLoadingIds.value.add(report.id);

  try {
    console.log('Выгрузка отчета в МС:', report.id);

    const response = await axios.post(`${API_BASE_URL}/reports/export-ms`, {
      integrationLinkId: selectedIntegrationId.value,
      reportId: report.id
    }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (response.data.success) {
      if (response.data.alreadyExported) {
        showNotification(`Отчет ${report.id} уже существует в МойСклад.`, 'info');
      } else {
        showNotification(`Отчет ${report.id} успешно выгружен в МойСклад!`);
      }
      report.exportedToMS = true;
      exportedReportsStatus.value.add(report.id);

      // автоматические действия согласно настройкам
      if (settings.value.createServiceReceipts && !report.serviceReceiptsCreated) {
        await createServiceReceipts(report);
        if (settings.value.createServiceExpenseOrders && !report.expenseOrdersCreated) {
          await createExpenseOrders(report);
        }
      }
    } else {
      showNotification('Не удалось выгрузить отчет в МойСклад', 'error');
    }
  } catch (error) {
    console.error('Ошибка выгрузки отчета в МС:', error);
    if (error.response?.status === 401) {
      showNotification('Ошибка авторизации. Пожалуйста, войдите заново.', 'error');
    } else {
      showNotification('Ошибка выгрузки отчета в МойСклад: ' + (error.response?.data?.message || error.message), 'error');
    }
  } finally {
    exportLoadingIds.value.delete(report.id);
  }
};

// Создание приемок услуг
const createServiceReceipts = async (report) => {
  if (!selectedIntegrationId.value) return;
  serviceLoadingIds.value.add(report.id);
  try {
    const response = await axios.post(`${API_BASE_URL}/reports/service-receipts`, {
      integrationLinkId: selectedIntegrationId.value,
      reportId: report.id
    }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (response.data.success) {
      if (response.data.already) {
        showNotification(`Приёмки услуг для отчёта ${report.id} уже были созданы.`, 'info');
      } else {
        showNotification(`Приёмки услуг для отчёта ${report.id} успешно созданы!`);
      }
      report.serviceReceiptsCreated = true;
    } else {
      showNotification('Не удалось создать приёмки услуг', 'error');
    }
  } catch (error) {
    console.error('Ошибка создания приёмок услуг:', error);
    showNotification('Ошибка создания приёмок услуг: ' + (error.response?.data?.message || error.message), 'error');
  } finally {
    serviceLoadingIds.value.delete(report.id);
  }
};

// Создание расходных ордеров
const createExpenseOrders = async (report) => {
  if (!selectedIntegrationId.value) return;
  expenseLoadingIds.value.add(report.id);
  try {
    const response = await axios.post(`${API_BASE_URL}/reports/expense-orders`, {
      integrationLinkId: selectedIntegrationId.value,
      reportId: report.id
    }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (response.data.success) {
      if (response.data.already) {
        showNotification(`Расходные ордера для отчёта ${report.id} уже созданы.`, 'info');
      } else {
        showNotification(`Расходные ордера для отчёта ${report.id} успешно созданы!`);
      }
      report.expenseOrdersCreated = true;
    } else {
      showNotification('Не удалось создать расходные ордера', 'error');
    }
  } catch (error) {
    console.error('Ошибка создания расходных ордеров:', error);
    showNotification('Ошибка создания расходных ордеров: ' + (error.response?.data?.message || error.message), 'error');
  } finally {
    expenseLoadingIds.value.delete(report.id);
  }
};

// Создание приходных ордеров
const createIncomeOrders = async (report) => {
  if (!selectedIntegrationId.value) return;
  incomeLoadingIds.value.add(report.id);
  try {
    const response = await axios.post(`${API_BASE_URL}/reports/income-orders`, {
      integrationLinkId: selectedIntegrationId.value,
      reportId: report.id
    }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (response.data.success) {
      if (response.data.already) {
        showNotification(`Приходный ордер для отчёта ${report.id} уже создан.`, 'info');
      } else {
        showNotification(`Приходный ордер для отчёта ${report.id} успешно создан!`);
      }
      report.incomeOrdersCreated = true;
    } else {
      showNotification('Не удалось создать приходный ордер', 'error');
    }
  } catch (error) {
    console.error('Ошибка создания приходного ордера:', error);
    showNotification('Ошибка создания приходного ордера: ' + (error.response?.data?.message || error.message), 'error');
  } finally {
    incomeLoadingIds.value.delete(report.id);
  }
};

// Генерация отчетов по неделям за последние 3 месяца
const generateReports = () => {
  const reportsList = [];
  const today = new Date();
  
  console.log(`[OTCHETI] Генерация отчетов. Сегодня: ${today.toLocaleDateString()}`);
  console.log(`[OTCHETI] Глубина отчетов: ${settings.value.reportDepthWeeks} недель`);
  
  // Начинаем с указанного количества недель назад
  // Увеличиваем на 1 для корректного отображения количества отчетов
  const startDate = new Date(today);
  const weeksToSubtract = settings.value.reportDepthWeeks + 1;
  startDate.setDate(startDate.getDate() - (weeksToSubtract * 7));
  
  console.log(`[OTCHETI] Начальная дата для генерации: ${startDate.toLocaleDateString()}`);
  
  // Устанавливаем начало недели (понедельник)
  const dayOfWeek = startDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);
  
  console.log(`[OTCHETI] Начальная дата после выравнивания на понедельник: ${startDate.toLocaleDateString()}`);
  
  // Генерируем отчеты по неделям
  let currentDate = new Date(startDate);
  let skippedCount = 0;
  let addedCount = 0;
  
  while (currentDate <= today) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Проверяем, что отчет не из будущего
    if (weekStart > today) {
      console.log(`[OTCHETI] Пропускаем отчет из будущего: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`);
      skippedCount++;
      // Переходим к следующей неделе
      currentDate.setDate(currentDate.getDate() + 7);
      continue;
    }
    
    // Проверяем, что отчет доступен (прошло минимум 2 дня после окончания периода)
    const daysAfterEnd = Math.floor((today - weekEnd) / (1000 * 60 * 60 * 24));
    if (daysAfterEnd < 2) {
      console.log(`[OTCHETI] Пропускаем недоступный отчет: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()} (прошло ${daysAfterEnd} дней)`);
      skippedCount++;
      // Переходим к следующей неделе
      currentDate.setDate(currentDate.getDate() + 7);
      continue;
    }
    
    // Генерируем ID отчета в формате DDMMYYDDMMYY
    const startDay = weekStart.getDate().toString().padStart(2, '0');
    const startMonth = (weekStart.getMonth() + 1).toString().padStart(2, '0');
    const startYear = weekStart.getFullYear().toString().slice(-2);
    const endDay = weekEnd.getDate().toString().padStart(2, '0');
    const endMonth = (weekEnd.getMonth() + 1).toString().padStart(2, '0');
    const endYear = weekEnd.getFullYear().toString().slice(-2);
    
    const reportId = `${startDay}${startMonth}${startYear}${endDay}${endMonth}${endYear}`;
    
    // Формируем период для отображения
    const period = `${startDay}.${startMonth}.${startYear} - ${endDay}.${endMonth}.${endYear}`;
    
    // Проверяем, загружен ли отчет в БД
    const isLoadedInDB = loadedReportsStatus.value.has(reportId);
    
    console.log(`[OTCHETI] Добавляем отчет: ${period} (ID: ${reportId}, загружен: ${isLoadedInDB})`);
    addedCount++;
    
    reportsList.push({
      id: reportId,
      period: period,
      startDate: weekStart,
      endDate: weekEnd,
      loadedInDB: isLoadedInDB,
      exportedToMS: false, // Пока всегда false, потом будет из БД
      serviceReceiptsCreated: false,
      expenseOrdersCreated: false,
      incomeOrdersCreated: false
    });
    
    // Переходим к следующей неделе
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  console.log(`[OTCHETI] Генерация завершена. Добавлено отчетов: ${addedCount}, пропущено: ${skippedCount}`);
  // Сортируем по дате начала периода (от самого нового к раннему)
  reportsList.sort((a, b) => b.startDate - a.startDate);
  reports.value = reportsList;
};

// Загрузка данных при монтировании компонента
onMounted(() => {
  fetchIntegrations();
});

// Следим за изменением выбранной интеграции
watch(selectedIntegrationId, (newValue) => {
  if (newValue) {
    // Сначала загружаем настройки, затем генерируем отчеты
    fetchSettings().then(() => {
      generateReports();
      loadReportsStatus();
    });
  } else {
    reports.value = [];
    loadedReportsStatus.value.clear();
    clearSelection();
  }
});
</script>

<style scoped>
.otcheti-page-container {
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

h3 {
  color: #555;
  margin-bottom: 15px;
  font-size: 1.2em;
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

.reports-section {
  margin-top: 30px;
}

.reports-header {
  margin-bottom: 20px;
}

.reports-info {
  color: #666;
  font-style: italic;
  margin: 0;
}

.reports-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.reports-table th,
.reports-table td {
  border: 1px solid #e0e0e0;
  padding: 12px;
  text-align: left;
}

.reports-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.report-row:hover {
  background-color: #f8f9fa;
}

.report-id {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #333;
}

.report-id a {
  text-decoration: none;
  color: #007bff;
  font-weight: bold;
}
.report-id a:hover {
  text-decoration: underline;
}

.report-period {
  font-weight: 500;
  color: #333;
}

.report-status {
  text-align: center;
}

.status-loaded {
  color: #28a745;
  font-weight: bold;
}

.status-not-loaded {
  color: #6c757d;
}

.report-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.action-row {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.load-btn {
  background-color: #007bff;
  color: white;
}

.load-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.load-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.delete-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.delete-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.export-btn {
  background-color: #28a745;
  color: white;
}

.export-btn:hover:not(:disabled) {
  background-color: #218838;
}

.export-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.service-btn {
  background-color: #17a2b8;
  color: white;
}

.service-btn:hover {
  background-color: #138496;
}

.service-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.expense-btn {
  background-color: #6f42c1;
  color: white;
}

.expense-btn:hover {
  background-color: #5936a2;
}

.expense-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.income-btn {
  background-color: #007bff; /* Синий цвет для приходных ордеров */
  color: white;
}

.income-btn:hover {
  background-color: #0056b3;
}

.income-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-reports-message {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  margin-top: 20px;
}

/* Уведомление */
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}

.notification.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.notification.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.notification.info {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.notification-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-radius: 6px;
}

.notification-message {
  flex: 1;
  margin-right: 10px;
  font-size: 14px;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-close:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Стили для панели массовых действий */
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
</style>
