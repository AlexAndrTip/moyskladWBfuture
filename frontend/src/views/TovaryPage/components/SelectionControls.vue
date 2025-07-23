<template>
  <div class="selection-controls">
    <div v-if="productsCountOnPage > 0 && areAllProductsSelectedOnPage && totalPages > 1 && !selectedAllPages" class="select-all-pages-bar">
        <button @click="emit('select-all-pages')" class="action-btn select-all-global-btn">
            Выбрать все ({{ totalProducts }})
        </button>
    </div>
    <div v-if="selectedAllPages" class="select-all-pages-bar selected-global">
        <span>Выбрано всего товаров: {{ totalProducts }}</span>
        <button @click="emit('clear-all-selection')" class="action-btn clear-all-global-btn">
            Очистить выбор
        </button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  productsCountOnPage: Number, // products.value.length
  areAllProductsSelectedOnPage: Boolean,
  totalPages: Number,
  selectedAllPages: Boolean,
  totalProducts: Number,
});

const emit = defineEmits(['select-all-pages', 'clear-all-selection']);
</script>

<style scoped>
/* Переместите сюда соответствующие стили */
.selection-controls { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 15px; }
.select-all-pages-bar { background-color: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: flex-start; align-items: center; gap: 10px; flex-wrap: wrap; text-align: left; font-size: 0.9em; color: #8c6b00; }
.select-all-pages-bar.selected-global { background-color: #f6ffed; border-color: #b7eb8f; color: #389e08; }
.select-all-global-btn, .clear-all-global-btn { background-color: #1890ff; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.3s ease; font-weight: bold; white-space: nowrap; }
.select-all-global-btn:hover { background-color: #40a9ff; }
.clear-all-global-btn { background-color: #faad14; }
.clear-all-global-btn:hover { background-color: #d48806; }
</style>
