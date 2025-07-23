<template>
  <div class="pagination-container" :class="{'top-pagination': isTop, 'bottom-pagination': !isTop}">
    <div class="pagination-controls">
      <button @click="emit('change-page', currentPage - 1)" :disabled="currentPage === 1">Предыдущая</button>
      <span>Страница {{ currentPage }} из {{ totalPages }}</span>
      <button @click="emit('change-page', currentPage + 1)" :disabled="currentPage === totalPages">Следующая</button>
    </div>
    <div class="pagination-options">
      <label :for="`items-per-page-${isTop ? 'top' : 'bottom'}`">Поставок на странице:</label>
      <select :id="`items-per-page-${isTop ? 'top' : 'bottom'}`" :value="postavkiPerPage" @change="e => emit('update:postavkiPerPage', Number(e.target.value))">
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>
      <label :for="`go-to-page-${isTop ? 'top' : 'bottom'}`">Перейти к странице:</label>
      <input type="number" :id="`go-to-page-${isTop ? 'top' : 'bottom'}`" :value="pageInput" @input="e => emit('update:pageInput', Number(e.target.value))" @keyup.enter="emit('go-to-page')"
             :min="1" :max="totalPages" class="page-input"/>
      <button @click="emit('go-to-page')">Перейти</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  currentPage: Number,
  totalPages: Number,
  postavkiPerPage: Number,
  pageInput: Number,
  isTop: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['change-page', 'update:postavkiPerPage', 'update:pageInput', 'go-to-page']);
</script>

<style scoped>
/* Переместите сюда соответствующие стили */
.pagination-container { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 15px; padding: 15px; background-color: #f0f2f5; border-radius: 8px; }
.top-pagination { margin-bottom: 20px; }
.bottom-pagination { margin-top: 30px; }

.pagination-controls { display: flex; align-items: center; gap: 15px; }
.pagination-controls button { background-color: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease; }
.pagination-controls button:hover:not(:disabled) { background-color: #0056b3; }
.pagination-controls button:disabled { background-color: #cccccc; cursor: not-allowed; }
.pagination-controls span { font-size: 1.1em; color: #555; font-weight: 500; white-space: nowrap; }

.pagination-options { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pagination-options label { color: #555; font-size: 0.95em; white-space: nowrap; }
.pagination-options select { padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 5px; font-size: 0.95em; background-color: #ffffff; cursor: pointer; min-width: 70px; }
.pagination-options .page-input { width: 60px; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 5px; font-size: 0.95em; text-align: center; }
.pagination-options button { background-color: #28a745; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease; white-space: nowrap; }
.pagination-options button:hover { background-color: #218838; }
</style> 