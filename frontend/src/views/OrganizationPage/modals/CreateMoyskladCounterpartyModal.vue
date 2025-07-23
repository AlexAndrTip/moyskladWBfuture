<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <button class="modal-close-button" @click="emit('close')">&times;</button>
      <h3>Создать Контрагента в МойСклад</h3>

      <div class="form-group">
        <label for="newCounterpartyName">Название нового контрагента:</label>
        <input
          type="text"
          id="newCounterpartyName"
          v-model="newCounterpartyName"
          placeholder="Введите название контрагента"
          class="modal-input"
        />
      </div>

      <p v-if="loading" class="loading-message">Создание контрагента...</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

      <div class="modal-actions">
        <button @click="createCounterparty" :disabled="!newCounterpartyName || loading" class="action-button primary">
          {{ loading ? 'Создание...' : 'Создать' }}
        </button>
        <button @click="emit('close')" :disabled="loading" class="action-button secondary">Отмена</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import axios from 'axios';

const props = defineProps({
  isOpen: Boolean,
  integrationLinkId: String,
  getToken: Function,
});

const emit = defineEmits(['close', 'counterparty-created']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const newCounterpartyName = ref('');
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// Сброс состояния при открытии модального окна
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    newCounterpartyName.value = '';
    loading.value = false;
    errorMessage.value = '';
    successMessage.value = '';
  }
});

const createCounterparty = async () => {
  if (!newCounterpartyName.value.trim()) {
    errorMessage.value = 'Название контрагента не может быть пустым.';
    return;
  }
  if (!props.integrationLinkId) {
    errorMessage.value = 'Не выбрана интеграционная связка.';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const response = await axios.post(`${API_BASE_URL}/organizations/moysklad-create/counterparty`, {
      integrationLinkId: props.integrationLinkId,
      counterpartyName: newCounterpartyName.value.trim(),
    }, {
      headers: { Authorization: `Bearer ${props.getToken()}` },
    });

    successMessage.value = `Контрагент "${response.data.name}" успешно создан в МойСклад!`;
    // Эмитируем событие с данными нового контрагента, чтобы родитель мог обновить список
    emit('counterparty-created', response.data);
    // Закрываем модальное окно через небольшой таймаут
    setTimeout(() => {
      emit('close');
    }, 1500);

  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Ошибка при создании контрагента в МойСклад.';
    console.error('Ошибка создания контрагента в МС:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Стили аналогичны CreateMoyskladOrganizationModal.vue */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  position: relative;
  text-align: center;
  animation: slideIn 0.3s ease-out;
}

.modal-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #888;
}

.modal-close-button:hover {
  color: #333;
}

h3 {
  color: #333;
  margin-bottom: 25px;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1em;
  box-sizing: border-box;
}

.loading-message, .error-message, .success-message {
  margin-top: 15px;
  font-weight: bold;
}

.loading-message {
  color: #007bff;
}

.error-message {
  color: #dc3545;
}

.success-message {
  color: #28a745;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 25px;
}

.action-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.action-button.primary {
  background-color: #28a745;
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background-color: #218838;
}

.action-button.secondary {
  background-color: #6c757d;
  color: white;
}

.action-button.secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.action-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
