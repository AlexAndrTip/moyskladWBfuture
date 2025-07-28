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
        <p class="reports-info">Отчеты по неделям за последние 3 месяца (доступны через 2 дня после окончания периода)</p>
      </div>

      <table class="reports-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Период</th>
            <th>Загружен в БД</th>
            <th>Выгружен в МС</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in reports" :key="report.id" class="report-row">
            <td class="report-id">{{ report.id }}</td>
            <td class="report-period">{{ report.period }}</td>
            <td class="report-status">
              <span v-if="report.loadedInDB" class="status-loaded">Да</span>
              <span v-else class="status-not-loaded">Нет</span>
            </td>
            <td class="report-status">
              <span v-if="report.exportedToMS" class="status-loaded">Да</span>
              <span v-else class="status-not-loaded">Нет</span>
            </td>
            <td class="report-actions">
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
                :disabled="!report.loadedInDB || report.exportedToMS"
                class="action-btn export-btn"
              >
                Выгрузить в МС
              </button>
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
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Функция для получения токена
const getToken = () => localStorage.getItem('token');

// Состояние интеграций
const integrationLinks = ref([]);
const loadingIntegrations = ref(false);
const integrationsError = ref('');
const selectedIntegrationId = ref('');

// Состояние для отчетов
const reports = ref([]);
const loadedReportsStatus = ref(new Set());
const loadingReportIds = ref(new Set());

// Состояние для уведомлений
const notification = ref({ show: false, message: '', type: 'success' });

// Состояние для настроек
const settings = ref({
  reportDepthWeeks: 0 // Будет загружено из БД
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
      reportDepthWeeks: response.data.reportDepthWeeks || 12
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
  }
};

// Загрузка статуса отчетов из БД
const loadReportsStatus = async () => {
  if (!selectedIntegrationId.value) return;
  
  try {
    const response = await axios.get(`${API_BASE_URL}/reports/status/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    if (response.data.success) {
      // Создаем Set из загруженных отчетов для быстрой проверки
      loadedReportsStatus.value = new Set(response.data.loadedReports);
      
      // Обновляем статус в списке отчетов
      reports.value.forEach(report => {
        report.loadedInDB = loadedReportsStatus.value.has(report.id);
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
const deleteFromDB = async (report) => {
  if (!selectedIntegrationId.value) return;
  
  // Запрашиваем подтверждение
  if (!confirm(`Вы уверены, что хотите удалить отчет ${report.id} из БД? Это действие нельзя отменить.`)) {
    return;
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

// Выгрузка отчета в МС (пока заглушка)
const exportToMS = (report) => {
  console.log('Выгрузка отчета в МС:', report.id);
  alert('Функция выгрузки в МС пока не реализована');
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
      exportedToMS: false // Пока всегда false, потом будет из БД
    });
    
    // Переходим к следующей неделе
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  console.log(`[OTCHETI] Генерация завершена. Добавлено отчетов: ${addedCount}, пропущено: ${skippedCount}`);
  
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
  color: #007bff;
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
  font-style: italic;
}

.report-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
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
</style>
