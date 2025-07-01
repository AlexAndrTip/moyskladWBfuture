<template>
  <div class="skladi-page-container">


    <button @click="openAddModal" class="add-button">Добавить новый склад</button>

    <p v-if="loading" class="loading-message">Загрузка складов...</p>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div v-if="storages.length" class="storages-list">
      <div v-for="storage in storages" :key="storage._id" class="storage-item">
        <span>{{ storage.name }}</span>
        <div class="actions">
          <button @click="openEditModal(storage)" class="edit-button">Редактировать</button>
          <button @click="deleteStorage(storage._id)" class="delete-button">Удалить</button>
        </div>
      </div>
    </div>
    <p v-else-if="!loading">У вас пока нет добавленных складов.</p>

    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Редактировать склад' : 'Добавить новый склад' }}</h3>
        <form @submit.prevent="saveStorage">
          <div class="form-group">
            <label for="storageName">Название склада:</label>
            <input type="text" id="storageName" v-model="currentStorage.name" required />
          </div>
          <div class="form-group">
            <label for="storageToken">Токен:</label>
            <input type="password" id="storageToken" v-model="currentStorage.token" :required="!isEditing" placeholder="Оставьте пустым, чтобы не менять токен" />
          </div>
          <p v-if="modalMessage" :class="modalMessageType">{{ modalMessage }}</p>
          <div class="modal-actions">
            <button type="submit" class="save-button">
              {{ isEditing ? 'Сохранить изменения' : 'Добавить склад' }}
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

const storages = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const isModalOpen = ref(false);
const isEditing = ref(false); // true - если редактируем, false - если добавляем
const currentStorage = ref({ _id: null, name: '', token: '' }); // Данные для модального окна

const modalMessage = ref('');
const modalMessageType = ref(''); // 'success' or 'error'

const getToken = () => localStorage.getItem('token');

// Получение списка складов
const fetchStorages = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/storages`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    storages.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Ошибка при загрузке складов.';
    console.error('Fetch storages error:', error);
  } finally {
    loading.value = false;
  }
};

// Открытие модального окна для добавления
const openAddModal = () => {
  isEditing.value = false;
  currentStorage.value = { _id: null, name: '', token: '' };
  modalMessage.value = '';
  modalMessageType.value = '';
  isModalOpen.value = true;
};

// Открытие модального окна для редактирования
const openEditModal = (storage) => {
  isEditing.value = true;
  // Копируем данные склада, чтобы не менять напрямую список
  currentStorage.value = { ...storage, token: '' }; // Токен не возвращается с бэкенда, поэтому он пуст
  modalMessage.value = '';
  modalMessageType.value = '';
  isModalOpen.value = true;
};

// Закрытие модального окна
const closeModal = () => {
  isModalOpen.value = false;
};

// Сохранение (добавление или обновление) склада
const saveStorage = async () => {
  modalMessage.value = '';
  modalMessageType.value = '';
  try {
    if (isEditing.value) {
      // Обновление
      await axios.put(`${API_BASE_URL}/storages/${currentStorage.value._id}`, {
        name: currentStorage.value.name,
        token: currentStorage.value.token || undefined, // Отправляем токен только если он введен
      }, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      modalMessage.value = 'Склад успешно обновлен!';
      modalMessageType.value = 'success';
    } else {
      // Добавление
      await axios.post(`${API_BASE_URL}/storages`, {
        name: currentStorage.value.name,
        token: currentStorage.value.token,
      }, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      modalMessage.value = 'Склад успешно добавлен!';
      modalMessageType.value = 'success';
    }
    await fetchStorages(); // Обновляем список складов после сохранения
    closeModal();
  } catch (error) {
    modalMessage.value = error.response?.data?.message || 'Ошибка при сохранении склада.';
    modalMessageType.value = 'error';
    console.error('Save storage error:', error);
  }
};

// Удаление склада
const deleteStorage = async (id) => {
  if (confirm('Вы уверены, что хотите удалить этот склад?')) {
    try {
      await axios.delete(`${API_BASE_URL}/storages/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      alert('Склад удален!');
      await fetchStorages(); // Обновляем список складов после удаления
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка при удалении склада.');
      console.error('Delete storage error:', error);
    }
  }
};

// Загружаем склады при монтировании компонента
onMounted(() => {
  fetchStorages();
});
</script>

<style scoped>
.skladi-page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 400px; /* Для демонстрации */
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
}
.add-button:hover {
  background-color: #218838;
}

.loading-message, .error-message {
  text-align: center;
  margin-top: 20px;
}
.error-message {
  color: #dc3545;
  font-weight: bold;
}

.storages-list {
  border: 1px solid #eee;
  border-radius: 5px;
  overflow: hidden;
}

.storage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}
.storage-item:last-child {
  border-bottom: none;
}
.storage-item span {
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

/* Стили для модального окна */
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
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  text-align: left;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 25px;
  color: #333;
  text-align: center;
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

.form-group input[type="text"],
.form-group input[type="password"] {
  width: calc(100% - 22px);
  padding: 12px 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.modal-actions button {
  padding: 12px 25px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.save-button {
  background-color: #28a745;
  color: white;
}

.save-button:hover {
  background-color: #218838;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
}

.cancel-button:hover {
  background-color: #5a6268;
}

.modal-message {
  margin-top: 15px;
  text-align: center;
  font-weight: bold;
}

.modal-message.success {
  color: #28a745;
}

.modal-message.error {
  color: #dc3545;
}
</style>
