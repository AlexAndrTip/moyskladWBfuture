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
        <p class="reports-info">Отчеты по неделям за последние 3 месяца</p>
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
                :disabled="report.loadedInDB"
                class="action-btn load-btn"
              >
                Загрузить в БД
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
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

// Состояние отчетов
const reports = ref([]);
const loadingReports = ref(false);
const reportsError = ref('');

// Обработчик изменения интеграции
const onIntegrationChange = () => {
  if (selectedIntegrationId.value) {
    generateReports();
  } else {
    reports.value = [];
  }
};

// Генерация отчетов по неделям за последние 3 месяца
const generateReports = () => {
  const reportsList = [];
  const today = new Date();
  
  // Начинаем с 3 месяцев назад
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 3);
  
  // Устанавливаем начало недели (понедельник)
  const dayOfWeek = startDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);
  
  // Генерируем отчеты по неделям
  let currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
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
    
    reportsList.push({
      id: reportId,
      period: period,
      startDate: weekStart,
      endDate: weekEnd,
      loadedInDB: false, // Пока всегда false, потом будет из БД
      exportedToMS: false // Пока всегда false, потом будет из БД
    });
    
    // Переходим к следующей неделе
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  reports.value = reportsList;
};

// Форматирование даты для отображения
const formatDate = (date) => {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Загрузка отчета в БД
const loadToDB = async (report) => {
  if (!selectedIntegrationId.value) return;
  
  try {
    console.log('Загрузка отчета в БД:', report.id);
    // TODO: Здесь будет API вызов для загрузки отчета в БД
    alert(`Отчет ${report.id} загружен в БД`);
    
    // Обновляем статус
    report.loadedInDB = true;
  } catch (error) {
    console.error('Ошибка загрузки отчета в БД:', error);
    alert('Ошибка загрузки отчета в БД: ' + error.message);
  }
};

// Выгрузка отчета в МС
const exportToMS = async (report) => {
  if (!selectedIntegrationId.value) return;
  
  try {
    console.log('Выгрузка отчета в МС:', report.id);
    // TODO: Здесь будет API вызов для выгрузки отчета в МС
    alert(`Отчет ${report.id} выгружен в МС`);
    
    // Обновляем статус
    report.exportedToMS = true;
  } catch (error) {
    console.error('Ошибка выгрузки отчета в МС:', error);
    alert('Ошибка выгрузки отчета в МС: ' + error.message);
  }
};

onMounted(async () => {
  await fetchIntegrationLinks();
  if (selectedIntegrationId.value) {
    generateReports();
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

.report-date {
  color: #666;
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

.no-reports-message {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  margin-top: 20px;
}
</style>
