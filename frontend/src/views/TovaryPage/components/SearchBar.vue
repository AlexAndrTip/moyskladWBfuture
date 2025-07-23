<template>
  <div class="search-bar">
    <input
      type="text"
      :value="searchTerm"
      @input="onInput"
      placeholder="Поиск по названию, артикулу WB, артикулу продавца, размеру, SKU..."
      class="search-input"
    />
    <button @click="emit('clear-search')" v-if="searchTerm" class="clear-search-btn">X</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  searchTerm: String,
});

const emit = defineEmits(['update:searchTerm', 'search', 'clear-search']);

let searchTimeout = null;
const onInput = (event) => {
  emit('update:searchTerm', event.target.value);
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    emit('search');
  }, 300); // Debounce
};
</script>

<style scoped>
/* Переместите сюда соответствующие стили */
.search-bar { display: flex; gap: 10px; margin-bottom: 20px; margin-top: 10px; }
.search-input { flex-grow: 1; padding: 10px 15px; border: 1px solid #dcdfe6; border-radius: 5px; font-size: 1em; box-sizing: border-box; }
.clear-search-btn { background-color: #f44336; color: white; border: none; border-radius: 5px; padding: 10px 15px; cursor: pointer; font-weight: bold; transition: background-color 0.3s ease; }
.clear-search-btn:hover { background-color: #d32f2f; }
</style>
