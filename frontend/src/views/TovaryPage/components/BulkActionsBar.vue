<template>
  <div class="bulk-actions-bar">
    <button @click="emit('open-bulk-edit-modal')" class="bulk-edit-button">
      Массовое редактирование ({{ selectedAllPages ? totalProducts : productsCount }} {{ selectedAllPages ? 'на всех страницах' : '' }})
    </button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  productsCount: Number,
  selectedAllPages: Boolean,
  totalProducts: Number,
});

const emit = defineEmits(['open-bulk-edit-modal']);
</script>

<style scoped>
/* Переместите сюда соответствующие стили */
.bulk-actions-bar { background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 8px; padding: 15px 20px; margin-bottom: 20px; display: flex; justify-content: center; align-items: center; }
.bulk-edit-button { background-color: #1890ff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; font-weight: bold; transition: background-color 0.3s ease; }
.bulk-edit-button:hover { background-color: #40a9ff; }
</style>
