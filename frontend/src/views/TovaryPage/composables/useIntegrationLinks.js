// src/views/TovaryPage/composables/useIntegrationLinks.js
import { ref, onMounted } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useIntegrationLinks(getToken) {
  const integrationLinks = ref([]);
  const loadingIntegrations = ref(true);
  const integrationsError = ref('');
  const selectedIntegrationId = ref('');

  const fetchIntegrationLinks = async () => {
    loadingIntegrations.value = true;
    integrationsError.value = '';
    try {
      const response = await axios.get(`${API_BASE_URL}/integration-links`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      integrationLinks.value = response.data;
      if (integrationLinks.value.length > 0) {
        // По умолчанию выбираем "Все интеграции" если есть хотя бы одна интеграция
        selectedIntegrationId.value = 'all';
      }
    } catch (error) {
      integrationsError.value = error.response?.data?.message || 'Ошибка при загрузке интеграций.';
      console.error('Fetch integration links error:', error);
    } finally {
      loadingIntegrations.value = false;
    }
  };

  onMounted(fetchIntegrationLinks);

  return {
    integrationLinks,
    loadingIntegrations,
    integrationsError,
    selectedIntegrationId,
    fetchIntegrationLinks,
  };
}
