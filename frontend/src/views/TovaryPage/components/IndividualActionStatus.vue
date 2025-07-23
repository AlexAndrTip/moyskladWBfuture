<template>
  <div v-if="message" :class="type" class="individual-action-status">
    {{ message }}
    <a v-if="msHref" :href="msHref" target="_blank" rel="noopener noreferrer">Открыть в МС</a>
    <button @click="emit('clear')" class="close-status-btn">X</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  message: String,
  type: String, // 'success', 'error', 'info'
  msHref: String,
});

const emit = defineEmits(['clear']);
</script>

<style scoped>
/* Переместите сюда соответствующие стили */
.individual-action-status { padding: 10px 15px; border-radius: 5px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; font-size: 0.95em; font-weight: 500; }
.individual-action-status.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.individual-action-status.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.individual-action-status.info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
.individual-action-status a { margin-left: 10px; color: inherit; text-decoration: underline; }
.individual-action-status .close-status-btn { background: none; border: none; font-size: 1.2em; font-weight: bold; cursor: pointer; color: inherit; margin-left: 15px; opacity: 0.7; }
.individual-action-status .close-status-btn:hover { opacity: 1; }
</style>
