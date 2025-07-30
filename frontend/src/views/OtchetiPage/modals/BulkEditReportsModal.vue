<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <h3>Массовое редактирование</h3>
      <p>Выбрано отчётов: {{ selectedCount }}</p>
      <div class="modal-actions-grid">
        <button
          v-for="action in availableActions"
          :key="action"
          class="action-btn big-btn"
          :class="actionClass(action)"
          @click="emit('bulk-action', action)"
          :disabled="bulkActionInProgress"
        >
          {{ bulkActionLabel(action) }}
        </button>
      </div>
      <button @click="emit('close')" class="cancel-button">Отмена</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  selectedCount: Number,
  availableActions: Array, // массив строк-ключей действий
  bulkActionInProgress: Boolean,
});

const emit = defineEmits(['close', 'bulk-action']);

function actionClass(action) {
  return action === 'deleteFromDB' ? 'del-btn' : 'ms-btn';
}

function bulkActionLabel(action) {
  switch (action) {
    case 'loadToDB':
      return props.bulkActionInProgress ? 'Загрузка…' : 'Загрузить в БД';
    case 'deleteFromDB':
      return props.bulkActionInProgress ? 'Удаление…' : 'Удалить из БД';
    case 'exportToMS':
      return props.bulkActionInProgress ? 'Выгрузка…' : 'Выгрузить в МС';
    case 'createServiceReceipts':
      return props.bulkActionInProgress ? 'Создание…' : 'Создать приемки услуг';
    case 'createExpenseOrders':
      return props.bulkActionInProgress ? 'Создание…' : 'Создать расходные ордера';
    default:
      return '';
  }
}
</script>

<style scoped>
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
  padding: 20px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 300px;
  max-width: 90%;
  text-align: center;
  animation: slideIn 0.3s ease-out;
}
.modal-content h3 {
  margin-top: 0;
  margin-bottom: 25px;
  color: #333;
  text-align: center;
  font-size: 1.2m;
  font-weight: 600;
}
.modal-content p {
  text-align: center;
  margin-bottom: 25px;
  font-size: 1.1em;
  color: #666;
}
.modal-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  margin-bottom: 20px;
}
.big-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
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
.del-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.3s;
}
.del-btn:hover:not(:disabled) {
  background-color: #a71d2a;
}
.del-btn:disabled {
  background-color: #e0aeb2;
  cursor: not-allowed;
}
.action-btn:disabled {
  background-color: #cccccc !important;
  cursor: not-allowed;
  opacity: 0.8;
}
.cancel-button {
  background-color: #e0e0e0;
  color: #333;
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.3s ease;
  display: block;
  width: 100%;
  margin: 0 auto;
}
.cancel-button:hover {
  background-color: #bdbdbd;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@media (max-width: 768px) {
  .modal-actions-grid { grid-template-columns: 1fr; }
}
</style> 