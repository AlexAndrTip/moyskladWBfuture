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
  switch (action) {
    case 'loadToDB':
      return 'load-db';
    case 'deleteFromDB':
      return 'delete-db';
    case 'exportToMS':
      return 'export-ms';
    case 'createServiceReceipts':
      return 'service-receipts';
    case 'createExpenseOrders':
      return 'expense-orders';
    default:
      return '';
  }
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
  padding: 35px 40px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  width: 95%;
  max-width: 600px;
  text-align: left;
  animation: slideIn 0.3s ease-out;
}
.modal-content h3 {
  margin-top: 0;
  margin-bottom: 25px;
  color: #333;
  text-align: center;
  font-size: 1.8em;
  font-weight: 600;
}
.modal-content p {
  text-align: center;
  margin-bottom: 25px;
  font-size: 1.1em;
  color: #666;
}
.modal-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
  margin-bottom: 30px;
}
.big-btn {
  padding: 15px 20px;
  font-size: 1.05em;
  font-weight: bold;
}
.action-btn:disabled {
  background-color: #cccccc !important;
  cursor: not-allowed;
  opacity: 0.8;
}
/* Цвета кнопок */
.load-db {
  background-color: #007bff;
  color: #fff;
}
.load-db:hover:not(:disabled) {
  background-color: #0056b3;
}
.delete-db {
  background-color: #dc3545;
  color: #fff;
}
.delete-db:hover:not(:disabled) {
  background-color: #c82333;
}
.export-ms {
  background-color: #28a745;
  color: #fff;
}
.export-ms:hover:not(:disabled) {
  background-color: #218838;
}
.service-receipts {
  background-color: #17a2b8;
  color: #fff;
}
.service-receipts:hover:not(:disabled) {
  background-color: #138496;
}
.expense-orders {
  background-color: #6f42c1;
  color: #fff;
}
.expense-orders:hover:not(:disabled) {
  background-color: #5936a2;
}
.cancel-button {
  background-color: #909399;
  color: white;
  padding: 13px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;
  transition: background-color 0.3s ease, transform 0.2s ease;
  display: block;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
}
.cancel-button:hover {
  background-color: #a6a9ad;
  transform: translateY(-2px);
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