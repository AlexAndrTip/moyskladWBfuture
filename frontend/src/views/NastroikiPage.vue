<template>
  <div class="nastroiki-page-container">
    <h2>Настройки интеграций</h2>

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

    <!-- Настройки для выбранной интеграции -->
    <div v-if="selectedIntegrationId && !loadingIntegrations" class="settings-section">
      <h3>Настройки для выбранной интеграции:</h3>
      
      <p v-if="loadingSettings" class="loading-message">Загрузка настроек...</p>
      <p v-if="settingsError" class="error-message">{{ settingsError }}</p>
      <p v-if="saveMessage" :class="saveMessageType">{{ saveMessage }}</p>

      <div v-if="!loadingSettings && !settingsError" class="settings-form">
        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              v-model="settings.autoExportProducts"
              @change="onAutoExportProductsChange"
              class="setting-checkbox"
            />
            <span class="setting-text">Автоматическая выгрузка товаров</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              v-model="settings.autoExportSupplies"
              @change="onSettingChange"
              class="setting-checkbox"
            />
            <span class="setting-text">Автоматическая выгрузка поставок</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              v-model="settings.autoExportReports"
              @change="onSettingChange"
              :disabled="!settings.autoExportProducts"
              class="setting-checkbox"
            />
            <span class="setting-text" :class="{ 'disabled': !settings.autoExportProducts }">
              Автоматическая выгрузка отчетов
            </span>
          </label>
          <p v-if="!settings.autoExportProducts" class="setting-hint">
            Сначала следует включить Автоматическую выгрузку товаров
          </p>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              v-model="settings.createServiceReceipts"
              @change="onSettingChange"
              class="setting-checkbox"
            />
            <span class="setting-text">Создавать приемки услуг совместно с отчетом</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              v-model="settings.createServiceExpenseOrders"
              @change="onSettingChange"
              class="setting-checkbox"
            />
            <span class="setting-text">Создавать расходные ордера по услугам совместно с отчетом</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input 
              type="checkbox" 
              v-model="settings.exportFBSOrders"
              @change="onSettingChange"
              class="setting-checkbox"
            />
            <span class="setting-text">Выгружать заказы FBS в МС</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <span class="setting-text">Глубина выгрузки отчетов (недель):</span>
            <input 
              type="number" 
              v-model.number="settings.reportDepthWeeks"
              @change="onSettingChange"
              min="4"
              max="25"
              class="setting-number-input"
            />
            <span class="setting-hint">От 4 до 25 недель</span>
          </label>
        </div>

        <div class="settings-actions">
          <button 
            @click="saveSettings" 
            :disabled="savingSettings"
            class="save-button"
          >
            <span v-if="savingSettings">Сохранение...</span>
            <span v-else>Сохранить настройки</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Модальное окно с предупреждением -->
    <div v-if="showWarningModal" class="modal-overlay" @click="closeWarningModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Внимание!</h3>
          <button @click="closeWarningModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>В случае автоматической выгрузки товаров в МС будут создаваться простые товары (Не комплекты) и если какая-либо карточка является комплектом, после выгрузки отчета вы не сможете это изменить.</p>
          <p>Поэтому рекомендуем пользоваться автоматической выгрузкой в том случае, если ваши карточки на WB не являются комплектами в МС.</p>
        </div>
        <div class="modal-footer">
          <button @click="confirmAutoExport" class="confirm-btn">Продолжить</button>
          <button @click="cancelAutoExport" class="cancel-btn">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useIntegrationLinks } from './TovaryPage/composables/useIntegrationLinks.js';

const router = useRouter();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getToken = () => localStorage.getItem('token');

const {
  integrationLinks,
  loadingIntegrations,
  integrationsError,
  selectedIntegrationId,
} = useIntegrationLinks(getToken);

// Состояние настроек
const settings = ref({
  autoExportProducts: false,
  autoExportSupplies: false,
  autoExportReports: false,
  createServiceReceipts: false,
  createServiceExpenseOrders: false,
  exportFBSOrders: false,
  reportDepthWeeks: 0, // Будет загружено из БД
});

const loadingSettings = ref(false);
const savingSettings = ref(false);
const settingsError = ref('');
const saveMessage = ref('');
const saveMessageType = ref('');

// Состояние модального окна
const showWarningModal = ref(false);
const autoExportProducts = ref(false); // Для отслеживания изменений

// Загрузка настроек для выбранной интеграции
const fetchSettings = async () => {
  if (!selectedIntegrationId.value) {
    return;
  }

  loadingSettings.value = true;
  settingsError.value = '';
  saveMessage.value = '';

  try {
    const response = await axios.get(`${API_BASE_URL}/settings/${selectedIntegrationId.value}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    
    settings.value = {
      autoExportProducts: response.data.autoExportProducts || false,
      autoExportSupplies: response.data.autoExportSupplies || false,
      autoExportReports: response.data.autoExportReports || false,
      createServiceReceipts: response.data.createServiceReceipts || false,
      createServiceExpenseOrders: response.data.createServiceExpenseOrders || false,
      exportFBSOrders: response.data.exportFBSOrders || false,
      reportDepthWeeks: response.data.reportDepthWeeks || 12, // Загружаем точное значение из БД
    };
  } catch (error) {
    settingsError.value = error.response?.data?.message || 'Ошибка загрузки настроек.';
    console.error('Ошибка загрузки настроек:', error);
  } finally {
    loadingSettings.value = false;
  }
};

// Сохранение настроек
const saveSettings = async () => {
  if (!selectedIntegrationId.value) {
    return;
  }

  savingSettings.value = true;
  saveMessage.value = '';
  saveMessageType.value = '';

  try {
    await axios.put(`${API_BASE_URL}/settings/${selectedIntegrationId.value}`, settings.value, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    
    saveMessage.value = 'Настройки успешно сохранены!';
    saveMessageType.value = 'success';
  } catch (error) {
    saveMessage.value = error.response?.data?.message || 'Ошибка сохранения настроек.';
    saveMessageType.value = 'error';
    console.error('Ошибка сохранения настроек:', error);
  } finally {
    savingSettings.value = false;
  }
};

// Обработчик изменения настроек
const onSettingChange = () => {
  // Если отключили выгрузку товаров, отключаем и выгрузку отчетов
  if (!settings.value.autoExportProducts && settings.value.autoExportReports) {
    settings.value.autoExportReports = false;
  }
};

// Обработчик изменения автоматической выгрузки товаров
const onAutoExportProductsChange = () => {
  // Если включаем автоматическую выгрузку товаров, показываем предупреждение
  if (settings.value.autoExportProducts) {
    openWarningModal();
  } else {
    // Если отключаем, применяем обычную логику
    onSettingChange();
  }
};

// Обработчик изменения интеграции
const onIntegrationChange = () => {
  if (selectedIntegrationId.value) {
    fetchSettings();
  }
};

// Следим за изменением выбранной интеграции
watch(selectedIntegrationId, (newValue) => {
  if (newValue) {
    fetchSettings();
  }
});

onMounted(() => {
  // Настройки будут загружены автоматически при выборе интеграции
});

// Логика для модального окна
const openWarningModal = () => {
  showWarningModal.value = true;
  autoExportProducts.value = settings.value.autoExportProducts; // Сохраняем текущее состояние
};

const closeWarningModal = () => {
  showWarningModal.value = false;
};

const confirmAutoExport = () => {
  settings.value.autoExportProducts = true;
  saveSettings();
  showWarningModal.value = false;
};

const cancelAutoExport = () => {
  settings.value.autoExportProducts = false;
  saveSettings();
  showWarningModal.value = false;
};

</script>

<style scoped>
.nastroiki-page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 400px;
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
  padding: 10px 15px;
  border: 1px solid #dcdfe6;
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

.settings-section {
  margin-top: 30px;
}

.settings-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.setting-item {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
}

.setting-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 1em;
}

.setting-checkbox {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.setting-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.setting-text {
  font-weight: 500;
  color: #333;
}

.setting-text.disabled {
  color: #999;
}

.setting-hint {
  margin-top: 8px;
  margin-left: 30px;
  font-size: 0.9em;
  color: #dc3545;
  font-style: italic;
}

.setting-number-input {
  margin-left: 10px;
  width: 60px;
  padding: 5px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  text-align: center;
  font-size: 1em;
}

.settings-actions {
  margin-top: 30px;
  text-align: center;
}

.save-button {
  background-color: #28a745;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.save-button:hover:not(:disabled) {
  background-color: #218838;
}

.save-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.save-message {
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  border-radius: 5px;
  font-weight: 500;
}

.save-message.success {
  color: #28a745;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.save-message.error {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  transition: color 0.3s ease;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  font-size: 1em;
  color: #555;
  line-height: 1.6;
  overflow-y: auto;
  flex-grow: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
}

.confirm-btn, .cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.confirm-btn {
  background-color: #28a745;
  color: white;
}

.confirm-btn:hover {
  background-color: #218838;
}

.cancel-btn {
  background-color: #dc3545;
  color: white;
}

.cancel-btn:hover {
  background-color: #c82333;
}
</style>
