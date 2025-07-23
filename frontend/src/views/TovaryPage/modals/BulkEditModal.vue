<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content">
      <h3>Массовое редактирование</h3>
      <p>Выбрано товаров: {{ selectedAllPages ? totalProducts : selectedProductCount }} {{ selectedAllPages ? 'на всех страницах' : '' }}</p>
      <div class="modal-actions-grid">
        <button @click="emit('bulk-create-in-ms')" class="action-btn big-btn create-ms" :disabled="bulkActionInProgress">
          {{ bulkActionInProgress ? 'Создаётся...' : 'Создать товары в МС' }}
        </button>
        <button @click="emit('bulk-create-variants')" class="action-btn big-btn create-kit" :disabled="bulkActionInProgress">Создать модификации</button>
        <button @click="emit('bulk-unlink-products')" class="action-btn big-btn unlink-product" :disabled="bulkActionInProgress">Удалить связки</button>
      </div>
      <button @click="emit('close')" class="cancel-button">Отмена</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  isOpen: Boolean,
  selectedProductCount: Number,
  selectedAllPages: Boolean,
  totalProducts: Number,
  bulkActionInProgress: Boolean,
});

const emit = defineEmits(['close', 'bulk-create-in-ms', 'bulk-create-variants', 'bulk-unlink-products']);
</script>

<style scoped>
/* Переместите сюда соответствующие стили */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; animation: fadeIn 0.3s ease-out; }
.modal-content { background-color: #ffffff; padding: 35px 40px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); width: 95%; max-width: 600px; text-align: left; animation: slideIn 0.3s ease-out; }
.modal-content h3 { margin-top: 0; margin-bottom: 30px; color: #333; text-align: center; font-size: 1.8em; font-weight: 600; }
.modal-content p { text-align: center; margin-bottom: 25px; font-size: 1.1em; color: #666; }
.modal-actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 30px; margin-bottom: 30px; }
.big-btn { padding: 15px 20px; font-size: 1.1em; font-weight: bold; }
.modal-content .cancel-button { background-color: #909399; color: white; padding: 13px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 17px; font-weight: 600; transition: background-color 0.3s ease, transform 0.2s ease; display: block; width: 100%; max-width: 200px; margin: 0 auto; }
.modal-content .cancel-button:hover { background-color: #a6a9ad; transform: translateY(-2px); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Shared button styles (for bulk actions) */
.create-ms { background-color: #5cb85c; color: white; }
.create-ms:hover { background-color: #4cae4c; }
.create-kit { background-color: #f0ad4e; color: white; }
.create-kit:hover { background-color: #ec971f; }
.link-product { background-color: #5bc0de; color: white; }
.link-product:hover { background-color: #31b0d5; }
.unlink-product { background-color: #d9534f; color: white; }
.unlink-product:hover { background-color: #c9302c; }
.action-btn:disabled { background-color: #cccccc !important; cursor: not-allowed; transform: none; opacity: 0.8; }

@media (max-width: 768px) {
  .modal-actions-grid { grid-template-columns: 1fr; }
}
</style>
