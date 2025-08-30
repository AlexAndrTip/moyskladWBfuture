<template>
  <div class="integration-selector-section">
    <h3>Выберите Интеграцию:</h3>
    <p v-if="loadingIntegrations" class="loading-message">Загрузка интеграций...</p>
    <p v-if="integrationsError" class="error-message">{{ integrationsError }}</p>

    <div v-if="!loadingIntegrations && integrationLinks.length > 0">
      <select :value="selectedIntegrationId" @change="onSelectChange" class="integration-select">
        <option value="" disabled>-- Выберите связку (Кабинет - Склад) --</option>
        <option value="all">Все интеграции</option>
        <option v-for="link in integrationLinks" :key="link._id" :value="link._id">
          {{ link.wbCabinet.name }} - {{ link.storage.name }}
        </option>
      </select>
    </div>
    <div v-else-if="!loadingIntegrations && !integrationsError" class="no-integrations-message">
      <p>Пожалуйста, сначала создайте интеграционные связки на странице "Интеграции".</p>
      <router-link to="/dashboard/integracii" class="link-button">Перейти к Интеграциям</router-link>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { RouterLink } from 'vue-router'; // Используем RouterLink для навигации

const props = defineProps({
  loadingIntegrations: Boolean,
  integrationsError: String,
  integrationLinks: Array,
  selectedIntegrationId: String,
});

const emit = defineEmits(['update:selectedIntegrationId', 'integration-change']);

const onSelectChange = (event) => {
  emit('update:selectedIntegrationId', event.target.value);
  emit('integration-change');
};
</script>

<style scoped>
/* Переместите сюда соответствующие стили из TovaryPage.vue */
.integration-selector-section { margin-bottom: 30px; }
.integration-selector-section h3 { margin-bottom: 15px; color: #555; font-size: 1.2em; }
.integration-select { width: 100%; max-width: 400px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.loading-message, .error-message { text-align: center; margin-top: 20px; color: #666; }
.error-message { color: #dc3545; font-weight: bold; }
.no-integrations-message { padding: 20px; border: 1px dashed #ccc; border-radius: 8px; background-color: #f0f0f0; display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px; }
.no-integrations-message p { margin: 0; }
.link-button { background-color: #007bff; color: white; padding: 10px 15px; border-radius: 5px; text-decoration: none; transition: background-color 0.3s ease; }
.link-button:hover { background-color: #0056b3; }
</style>
