// src/views/TovaryPage/composables/useTokenCheck.js
import { ref } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useTokenCheck(getToken) {
  const tokenValid = ref(true);
  const tokenChecking = ref(false);
  const tokenError = ref(null);

  const checkToken = async (integrationId) => {
    if (!integrationId) {
      tokenValid.value = true;
      tokenError.value = null;
      return;
    }

    tokenChecking.value = true;
    tokenError.value = null;

    try {
      const response = await axios.get(`${API_BASE_URL}/integration-links/${integrationId}/check-token`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (response.data.success) {
        tokenValid.value = response.data.tokenValid;
        if (!response.data.tokenValid) {
          tokenError.value = {
            message: 'Ошибка проверки токена WB, список товаров не получен',
            organizationName: response.data.organizationName
          };
        }
      } else {
        tokenValid.value = false;
        tokenError.value = {
          message: 'Ошибка проверки токена WB, список товаров не получен',
          organizationName: response.data.organizationName || 'неизвестной организации'
        };
      }
    } catch (error) {
      console.error('Token check error:', error);
      // При ошибке сети считаем токен валидным, чтобы не блокировать работу
      tokenValid.value = true;
      tokenError.value = null;
    } finally {
      tokenChecking.value = false;
    }
  };

  const resetTokenCheck = () => {
    tokenValid.value = true;
    tokenError.value = null;
    tokenChecking.value = false;
  };

  return {
    tokenValid,
    tokenChecking,
    tokenError,
    checkToken,
    resetTokenCheck
  };
} 