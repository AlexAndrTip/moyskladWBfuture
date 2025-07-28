<template>
  <div class="integracii-page-container">
    <h2>Интеграции WB Кабинетов и Складов</h2>

    <p v-if="loading" class="loading-message">Загрузка данных...</p>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div v-if="!loading && !errorMessage && wbCabinets.length === 0 && storages.length === 0" class="no-data-message">
      <p>Для создания интеграций, пожалуйста, сначала добавьте WB Кабинеты и Склады.</p>
      <router-link to="/dashboard/wb-kabinety" class="link-button">Добавить WB Кабинет</router-link>
      <router-link to="/dashboard/skladi" class="link-button">Добавить Склад</router-link>
    </div>

    <div v-if="wbCabinets.length && storages.length" class="integration-setup">
      <div class="cabinet-list-section">
        <h3>Доступные WB Кабинеты:</h3>
        <ul class="cabinet-select-list">
          <li v-for="cabinet in wbCabinets" :key="cabinet._id"
              :class="{ 'selected-cabinet': selectedCabinetId === cabinet._id }"
              @click="selectCabinet(cabinet)">
            {{ cabinet.name }}
          </li>
        </ul>
      </div>

      <div class="integration-action-section">
        <div v-if="selectedCabinetId">
          <h3>Подключить склады к "{{ selectedCabinetName }}"</h3>
          <div class="form-group">
            <label for="storageSelect">Выберите склад:</label>
            <select id="storageSelect" v-model="selectedStorageId">
              <option value="" disabled>-- Выберите склад --</option>
              <option v-for="storage in availableStorages" :key="storage._id" :value="storage._id">
                {{ storage.name }}
              </option>
            </select>
          </div>
          <p v-if="linkMessage" :class="linkMessageType" class="form-message">{{ linkMessage }}</p>
          <button @click="createLink" :disabled="!selectedStorageId" class="action-button connect-button">
            Подключить
          </button>
        </div>
        <p v-else class="info-message">Выберите WB Кабинет слева для подключения складов.</p>
      </div>
    </div>

    <h3>Существующие связки:</h3>
    <p v-if="linksLoading" class="loading-message">Загрузка связок...</p>
    <p v-if="linksErrorMessage" class="error-message">{{ linksErrorMessage }}</p>
    <div v-if="integrationLinks.length" class="links-list">
      <div v-for="link in integrationLinks" :key="link._id" class="link-item">
        <span>{{ link.wbCabinet.name }} <i class="fas fa-link link-icon"></i> {{ link.storage.name }}</span>
        <button @click="deleteLink(link._id)" class="action-button disconnect-button">Отключить</button>
      </div>
    </div>
    <p v-else-if="!linksLoading && wbCabinets.length && storages.length">Пока нет созданных связок.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const router = useRouter();

const wbCabinets = ref([]);
const storages = ref([]);
const integrationLinks = ref([]);

const loading = ref(true);
const errorMessage = ref('');
const linksLoading = ref(true);
const linksErrorMessage = ref('');

const selectedCabinetId = ref(null);
const selectedCabinetName = ref('');
const selectedStorageId = ref(''); // ID выбранного склада для подключения

const linkMessage = ref('');
const linkMessageType = ref('');

const getToken = () => localStorage.getItem('token');

// Вычисляемое свойство для доступных складов (все склады, не зависящие от текущего кабинета)
const availableStorages = computed(() => {
  // На данном этапе, поскольку "один и тот же склад может быть подключен к разным кабинетам",
  // показываем все склады.
  // В будущем, если склад должен быть уникально связан с кабинетом,
  // эту логику нужно будет изменить, чтобы исключать уже связанные склады.
  return storages.value;
});

// Загрузка всех необходимых данных
const fetchAllData = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [cabinetsRes, storagesRes, linksRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/wbcabinets`, { headers: { Authorization: `Bearer ${getToken()}` }}),
      axios.get(`${API_BASE_URL}/storages`, { headers: { Authorization: `Bearer ${getToken()}` }}),
      axios.get(`${API_BASE_URL}/integration-links`, { headers: { Authorization: `Bearer ${getToken()}` }})
    ]);
    wbCabinets.value = cabinetsRes.data;
    storages.value = storagesRes.data;
    integrationLinks.value = linksRes.data;
    linksLoading.value = false; // После загрузки связок
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Ошибка при загрузке данных.';
    console.error('Fetch all data error:', error);
  } finally {
    loading.value = false;
  }
};

// Выбор WB Кабинета из списка
const selectCabinet = (cabinet) => {
  selectedCabinetId.value = cabinet._id;
  selectedCabinetName.value = cabinet.name;
  selectedStorageId.value = ''; // Сбрасываем выбранный склад
  linkMessage.value = ''; // Сбрасываем сообщения
  linkMessageType.value = '';
};

// Создание связки (подключение)
const createLink = async () => {
  linkMessage.value = '';
  linkMessageType.value = '';
  if (!selectedCabinetId.value || !selectedStorageId.value) {
    linkMessage.value = 'Пожалуйста, выберите WB Кабинет и Склад.';
    linkMessageType.value = 'error';
    return;
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/integration-links`, {
      wbCabinetId: selectedCabinetId.value,
      storageId: selectedStorageId.value,
    }, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    integrationLinks.value.push(response.data); // Добавляем новую связку в список
    linkMessage.value = `Склад "${response.data.storage.name}" успешно подключен к кабинету "${response.data.wbCabinet.name}"!`;
    linkMessageType.value = 'success';
    selectedStorageId.value = ''; // Сбрасываем выбранный склад
  } catch (error) {
    linkMessage.value = error.response?.data?.message || 'Ошибка при подключении склада.';
    linkMessageType.value = 'error';
    console.error('Create link error:', error);
  }
};

// Удаление связки (отключение)
const deleteLink = async (linkId) => {
  if (confirm('Внимание! Будут удалены все связанные с этой интеграцией данные (товары, организации, услуги, статьи расходов, поступления). Продолжить?')) {
    try {
      await axios.delete(`${API_BASE_URL}/integration-links/${linkId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      integrationLinks.value = integrationLinks.value.filter(link => link._id !== linkId); // Удаляем из списка
      alert('Связка успешно отключена!');
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка при отключении связки.');
      console.error('Delete link error:', error);
    }
  }
};

onMounted(() => {
  fetchAllData();
});
</script>

<style scoped>
.integracii-page-container {
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

.loading-message, .error-message, .no-data-message, .info-message {
  text-align: center;
  margin-top: 20px;
  color: #666;
}
.error-message {
  color: #dc3545;
  font-weight: bold;
}
.no-data-message {
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background-color: #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}
.no-data-message p {
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

.integration-setup {
  display: flex;
  gap: 30px;
  margin-top: 30px;
  margin-bottom: 40px;
  flex-wrap: wrap; /* Для адаптивности на маленьких экранах */
}

.cabinet-list-section, .integration-action-section {
  flex: 1; /* Распределение ширины */
  min-width: 300px; /* Минимальная ширина для каждого блока */
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.cabinet-list-section h3, .integration-action-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #555;
  font-size: 1.3em;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.cabinet-select-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.cabinet-select-list li {
  padding: 12px 15px;
  cursor: pointer;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  margin-bottom: 8px;
  background-color: #ffffff;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  font-weight: 500;
  color: #333;
}
.cabinet-select-list li:hover {
  background-color: #e9e9e9;
  border-color: #c0c0c0;
}
.cabinet-select-list li.selected-cabinet {
  background-color: #e6f7ff; /* Светло-голубой фон для выбранного */
  border-color: #91d5ff; /* Синяя рамка */
  color: #1890ff;
  font-weight: 700;
}

.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
}

.action-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
  width: auto;
}
.connect-button {
  background-color: #28a745;
  color: white;
  width: 100%; /* оставляем кнопку подключения широкой */
}
.connect-button:hover {
  background-color: #218838;
}
.action-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.form-message {
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  border-radius: 5px;
}
.form-message.success {
  color: #28a745;
  background-color: #d4edda;
}
.form-message.error {
  color: #dc3545;
  background-color: #f8d7da;
}


.links-list {
  margin-top: 30px;
  border: 1px solid #eee;
  border-radius: 5px;
  overflow: hidden;
}
.link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}
.link-item:last-child {
  border-bottom: none;
}
.link-item span {
  font-size: 1.1em;
  color: #333;
  font-weight: 500;
}
.link-icon {
  margin: 0 10px;
  color: #007bff; /* Цвет для иконки связи */
}
.disconnect-button {
  background-color: #dc3545;
  color: white;
  padding: 8px 15px;
}
.disconnect-button:hover {
  background-color: #c82333;
}
</style>
