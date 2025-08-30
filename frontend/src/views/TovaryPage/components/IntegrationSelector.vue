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
.integration-select { width: 100%; padding: 10px 15px; border: 1px solid #dcdfe6; border-radius: 5px; font-size: 1em; box-sizing: border-box; background-color: #ffffff; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2C197.9c-3.6%2C3.6-8.3%2C5.4-13.1%2C5.4s-9.5-1.8-13.1-5.4L146.2%2C77.4L32.6%2C197.9c-3.6%2C3.6-8.3%2C5.4-13.1%2C5.4s-9.5-1.8-13.1-5.4c-7.3-7.3-7.3-19.1%2C0-26.4L133%2C50.9c7.3-7.3%2C19.1-7.3%2C26.4%2C0l119.6%2C119.6C294.3%2C178.9%2C294.3%2C190.7%2C287%2C197.9z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 10px center; background-size: 12px; }
.loading-message, .error-message { text-align: center; margin-top: 20px; color: #666; }
.error-message { color: #dc3545; font-weight: bold; }
.no-integrations-message { padding: 20px; border: 1px dashed #ccc; border-radius: 8px; background-color: #f0f0f0; display: flex; flex-direction: column; align-items: center; gap: 15px; margin-top: 30px; }
.no-integrations-message p { margin: 0; }
.link-button { background-color: #007bff; color: white; padding: 10px 15px; border-radius: 5px; text-decoration: none; transition: background-color 0.3s ease; }
.link-button:hover { background-color: #0056b3; }
</style>
