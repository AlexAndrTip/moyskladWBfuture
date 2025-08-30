<template>
  <div class="uslugi-page-container">
    <h2>Управление Услугами и Статьями Расхода Wildberries</h2>

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

    <div v-if="selectedIntegrationId && !loadingIntegrations" class="uslugi-management-section">
      <div class="blocks-container">
        <!-- Блок Услуги -->
        <div class="block">
          <div class="block-header">
            <h3>Услуги</h3>
            <div class="header-actions">
              <button 
                @click="syncUslugi" 
                :disabled="syncingUslugi"
                class="sync-button"
              >
                {{ syncingUslugi ? 'Синхронизация...' : 'Синхронизировать' }}
              </button>
              <button
                @click="unlinkUslugi"
                :disabled="syncingUslugi || !syncedUslugi.length"
                class="unlink-button"
              >
                Разорвать связи
              </button>
            </div>
          </div>
          
          <div class="services-list">
            <div v-for="service in wbServices" :key="service" class="service-item">
              <span class="service-name">{{ service }}</span>
              <div class="service-status">
                <span v-if="syncedUslugi.find(u => u.name === service)" class="sync-status synced">
                  <i class="fas fa-check"></i> Синхронизировано
                </span>
                <span v-else class="sync-status not-synced">
                  <i class="fas fa-times"></i> Не синхронизировано
                </span>
                <span v-if="syncedUslugi.find(u => u.name === service)?.wasCreated" class="created-indicator">
                  <i class="fas fa-plus"></i> Создана
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Блок Статьи Расходов -->
        <div class="block">
          <div class="block-header">
            <h3>Статьи Расходов</h3>
            <div class="header-actions">
              <button 
                @click="syncStatRashodov" 
                :disabled="syncingStatRashodov"
                class="sync-button"
              >
                {{ syncingStatRashodov ? 'Синхронизация...' : 'Синхронизировать' }}
              </button>
              <button
                @click="unlinkStatRashodov"
                :disabled="syncingStatRashodov || !syncedStatRashodov.length"
                class="unlink-button"
              >
                Разорвать связи
              </button>
            </div>
          </div>
          
          <div class="services-list">
            <div v-for="expense in wbExpenseItems" :key="expense" class="service-item">
              <span class="service-name">{{ expense }}</span>
              <span v-if="syncedStatRashodov.find(s => s.name === expense)" class="sync-status synced">
                <i class="fas fa-check"></i> Синхронизировано
              </span>
              <span v-else class="sync-status not-synced">
                <i class="fas fa-times"></i> Не синхронизировано
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Сообщения об успехе/ошибке -->
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useIntegrationLinks } from '../TovaryPage/composables/useIntegrationLinks.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getToken = () => localStorage.getItem('token');

const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
} = useIntegrationLinks(getToken);

// Списки услуг и статей расходов WB
const wbServices = ref([
  'Логистика WB',
  'Платная приемка WB',
  'Прочие удержания WB',
  'Хранение WB',
  'Штрафы WB'
]);

const wbExpenseItems = ref([
  'Логистика WB',
  'Платная приемка WB',
  'Прочие удержания WB',
  'Хранение WB',
  'Штрафы WB'
]);

// Состояние синхронизации
const syncingUslugi = ref(false);
const syncingStatRashodov = ref(false);

// Синхронизированные данные
const syncedUslugi = ref([]);
const syncedStatRashodov = ref([]);

// Сообщения
const message = ref('');
const messageType = ref('');

// Синхронизация услуг
const syncUslugi = async () => {
  if (!selectedIntegrationId.value) {
    showMessage('Пожалуйста, выберите интеграцию', 'error');
    return;
  }

  syncingUslugi.value = true;
  try {
    const response = await axios.post(
      `${API_BASE_URL}/uslugi/sync-uslugi`,
      { integrationLinkId: selectedIntegrationId.value },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    
    showMessage(response.data.message, 'success');
    await fetchSyncedUslugi(); // Обновляем список синхронизированных услуг
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Ошибка синхронизации услуг';
    showMessage(errorMessage, 'error');
    console.error('Ошибка синхронизации услуг:', error);
  } finally {
    syncingUslugi.value = false;
  }
};

// Синхронизация статей расходов
const syncStatRashodov = async () => {
  if (!selectedIntegrationId.value) {
    showMessage('Пожалуйста, выберите интеграцию', 'error');
    return;
  }

  syncingStatRashodov.value = true;
  try {
    const response = await axios.post(
      `${API_BASE_URL}/uslugi/sync-stat-rashodov`,
      { integrationLinkId: selectedIntegrationId.value },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    
    showMessage(response.data.message, 'success');
    await fetchSyncedStatRashodov(); // Обновляем список синхронизированных статей расходов
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Ошибка синхронизации статей расходов';
    showMessage(errorMessage, 'error');
    console.error('Ошибка синхронизации статей расходов:', error);
  } finally {
    syncingStatRashodov.value = false;
  }
};

// Получение синхронизированных услуг
const fetchSyncedUslugi = async () => {
  if (!selectedIntegrationId.value) {
    syncedUslugi.value = [];
    return;
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/uslugi/uslugi/${selectedIntegrationId.value}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    syncedUslugi.value = response.data;
  } catch (error) {
    console.error('Ошибка получения синхронизированных услуг:', error);
    syncedUslugi.value = [];
  }
};

// Получение синхронизированных статей расходов
const fetchSyncedStatRashodov = async () => {
  if (!selectedIntegrationId.value) {
    syncedStatRashodov.value = [];
    return;
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/uslugi/stat-rashodov/${selectedIntegrationId.value}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    syncedStatRashodov.value = response.data;
  } catch (error) {
    console.error('Ошибка получения синхронизированных статей расходов:', error);
    syncedStatRashodov.value = [];
  }
};

// Показать сообщение
const showMessage = (text, type) => {
  message.value = text;
  messageType.value = type;
  setTimeout(() => {
    message.value = '';
    messageType.value = '';
  }, 5000);
};

// Обработчик изменения интеграции
const onIntegrationChange = () => {
  fetchSyncedUslugi();
  fetchSyncedStatRashodov();
};

// Наблюдатель за изменением выбранной интеграции
watch(selectedIntegrationId, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    onIntegrationChange();
  }
});

// Разорвать связи услуг
const unlinkUslugi = async () => {
  if (!selectedIntegrationId.value) return;
  if (!confirm('Вы уверены, что хотите разорвать все связи услуг для этой интеграции?')) return;
  try {
    await axios.delete(`${API_BASE_URL}/uslugi/uslugi/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    showMessage('Все связи услуг разорваны', 'success');
    await fetchSyncedUslugi();
  } catch (error) {
    showMessage('Ошибка при разрыве связей услуг', 'error');
    console.error(error);
  }
};

// Разорвать связи статей расходов
const unlinkStatRashodov = async () => {
  if (!selectedIntegrationId.value) return;
  if (!confirm('Вы уверены, что хотите разорвать все связи статей расходов для этой интеграции?')) return;
  try {
    await axios.delete(`${API_BASE_URL}/uslugi/stat-rashodov/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    showMessage('Все связи статей расходов разорваны', 'success');
    await fetchSyncedStatRashodov();
  } catch (error) {
    showMessage('Ошибка при разрыве связей статей расходов', 'error');
    console.error(error);
  }
};

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
    onIntegrationChange();
  }
});
</script>

<style scoped>
.uslugi-page-container {
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

.blocks-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 20px;
}

.block {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #fafafa;
}

.block-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.block-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.sync-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.sync-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.sync-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.service-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.created-indicator {
  font-size: 10px;
  color: #28a745;
  font-weight: 500;
}

.service-name {
  font-weight: 500;
  color: #333;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
}

.sync-status.synced {
  color: #28a745;
}

.sync-status.not-synced {
  color: #dc3545;
}

.message {
  margin-top: 20px;
  padding: 10px 15px;
  border-radius: 4px;
  font-weight: 500;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.loading-message {
  color: #007bff;
  font-style: italic;
}

.error-message {
  color: #dc3545;
  font-weight: 500;
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
  text-align: center;
  color: #6c757d;
}

.no-integrations-message p {
  margin: 0;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.unlink-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.unlink-button:hover:not(:disabled) {
  background-color: #a71d2a;
}

.unlink-button:disabled {
  background-color: #e0aeb2;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .blocks-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .block-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .service-item {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
}
</style>
