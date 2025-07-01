<template>
  <div class="wbcabinets-page-container">

    <button @click="openAddModal" class="add-button">Добавить новый WB Кабинет</button>

    <p v-if="loading" class="loading-message">Загрузка WB Кабинетов...</p>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div v-if="wbCabinets.length" class="cabinets-list">
      <div v-for="cabinet in wbCabinets" :key="cabinet._id" class="cabinet-item">
        <span>{{ cabinet.name }}</span>
        <div class="actions">
          <button @click="openEditModal(cabinet)" class="edit-button">Редактировать</button>
          <button @click="deleteWbCabinet(cabinet._id)" class="delete-button">Удалить</button>
        </div>
      </div>
    </div>
    <p v-else-if="!loading">У вас пока нет добавленных WB Кабинетов.</p>

    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Редактировать WB Кабинет' : 'Добавить новый WB Кабинет' }}</h3>
        <form @submit.prevent="saveWbCabinet">
          <div class="form-group">
            <label for="cabinetName">Название WB Кабинета:</label>
            <input type="text" id="cabinetName" v-model="currentCabinet.name" required />
          </div>
          <div class="form-group">
            <label for="cabinetToken">Токен:</label>
            <input type="password" id="cabinetToken" v-model="currentCabinet.token" :required="!isEditing" placeholder="Оставьте пустым, чтобы не менять токен" />
          </div>
          <p v-if="modalMessage" :class="modalMessageType" class="modal-message">{{ modalMessage }}</p>
          <div class="modal-actions">
            <button type="submit" class="save-button">
              {{ isEditing ? 'Сохранить изменения' : 'Добавить WB Кабинет' }}
            </button>
            <button type="button" @click="closeModal" class="cancel-button">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const wbCabinets = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const isModalOpen = ref(false);
const isEditing = ref(false);
const currentCabinet = ref({ _id: null, name: '', token: '' });

const modalMessage = ref('');
const modalMessageType = ref('');

const getToken = () => localStorage.getItem('token');

// Получение списка WB Кабинетов
const fetchWbCabinets = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/wbcabinets`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    wbCabinets.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Ошибка при загрузке WB Кабинетов.';
    console.error('Fetch WB Cabinets error:', error);
  } finally {
    loading.value = false;
  }
};

// Открытие модального окна для добавления
const openAddModal = () => {
  isEditing.value = false;
  currentCabinet.value = { _id: null, name: '', token: '' };
  modalMessage.value = '';
  modalMessageType.value = '';
  isModalOpen.value = true;
};

// Открытие модального окна для редактирования
const openEditModal = (cabinet) => {
  isEditing.value = true;
  currentCabinet.value = { ...cabinet, token: '' };
  modalMessage.value = '';
  modalMessageType.value = '';
  isModalOpen.value = true;
};

// Закрытие модального окна
const closeModal = () => {
  isModalOpen.value = false;
};

// Сохранение (добавление или обновление) WB Кабинета
const saveWbCabinet = async () => {
  modalMessage.value = '';
  modalMessageType.value = '';
  try {
    if (isEditing.value) {
      await axios.put(`${API_BASE_URL}/wbcabinets/${currentCabinet.value._id}`, {
        name: currentCabinet.value.name,
        token: currentCabinet.value.token || undefined,
      }, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      modalMessage.value = 'WB Кабинет успешно обновлен!';
      modalMessageType.value = 'success';
    } else {
      await axios.post(`${API_BASE_URL}/wbcabinets`, {
        name: currentCabinet.value.name,
        token: currentCabinet.value.token,
      }, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      modalMessage.value = 'WB Кабинет успешно добавлен!';
      modalMessageType.value = 'success';
    }
    await fetchWbCabinets();
    closeModal();
  } catch (error) {
    modalMessage.value = error.response?.data?.message || 'Ошибка при сохранении WB Кабинета.';
    modalMessageType.value = 'error';
    console.error('Save WB Cabinet error:', error);
  }
};

// Удаление WB Кабинета
const deleteWbCabinet = async (id) => {
  if (confirm('Вы уверены, что хотите удалить этот WB Кабинет?')) {
    try {
      await axios.delete(`${API_BASE_URL}/wbcabinets/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      alert('WB Кабинет удален!');
      await fetchWbCabinets();
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка при удалении WB Кабинета.');
      console.error('Delete WB Cabinet error:', error);
    }
  }
};

onMounted(() => {
  fetchWbCabinets();
});
</script>

<style scoped>
/* Стили для страницы WB Кабинетов */
.wbcabinets-page-container {
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

.add-button {
  background-color: #28a745;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 25px;
  transition: background-color 0.3s ease;
  display: block;
  width: 100%;
  max-width: 280px; /* Немного шире для "WB Кабинет" */
  margin-left: auto;
  margin-right: auto;
}
.add-button:hover {
  background-color: #218838;
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

.cabinets-list { /* Изменил на cabinets-list */
  border: 1px solid #eee;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 30px;
}

.cabinet-item { /* Изменил на cabinet-item */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
  transition: background-color 0.2s ease;
}
.cabinet-item:last-child {
  border-bottom: none;
}
.cabinet-item:hover {
  background-color: #f0f0f0;
}
.cabinet-item span {
  font-size: 1.1em;
  color: #555;
  font-weight: 600;
}
.actions button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}
.edit-button {
  background-color: #007bff;
  color: white;
}
.edit-button:hover {
  background-color: #0056b3;
}
.delete-button {
  background-color: #dc3545;
  color: white;
}
.delete-button:hover {
  background-color: #c82333;
}

/* --- Стили для модального окна (аналогично SkladiPage.vue) --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background-color: #ffffff;
  padding: 35px 40px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  width: 95%;
  max-width: 550px;
  text-align: left;
  animation: slideIn 0.3s ease-out;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 30px;
  color: #333;
  text-align: center;
  font-size: 1.8em;
  font-weight: 600;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #555;
  font-size: 1.1em;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: calc(100% - 24px);
  padding: 14px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 17px;
  box-sizing: border-box;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input[type="text"]:focus,
.form-group input[type="password"]:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 35px;
}

.modal-actions button {
  padding: 13px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.save-button {
  background-color: #409eff;
  color: white;
}

.save-button:hover {
  background-color: #66b1ff;
  transform: translateY(-2px);
}

.cancel-button {
  background-color: #909399;
  color: white;
}

.cancel-button:hover {
  background-color: #a6a9ad;
  transform: translateY(-2px);
}

.modal-message {
  margin-top: 20px;
  text-align: center;
  font-weight: bold;
  font-size: 1.05em;
  padding: 10px;
  border-radius: 5px;
}

.modal-message.success {
  color: #28a745;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.modal-message.error {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

/* Анимации */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
