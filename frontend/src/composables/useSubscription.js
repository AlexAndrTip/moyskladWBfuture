import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

export function useSubscription() {
  const subscriptionInfo = ref(null);
  const isLoading = ref(false);

  // Получение информации о подписке из localStorage
  const getSubscriptionFromStorage = () => {
    try {
      const subscription = localStorage.getItem('subscription');
      return subscription ? JSON.parse(subscription) : null;
    } catch (error) {
      console.error('Error parsing subscription from storage:', error);
      return null;
    }
  };

  // Загрузка информации о подписке из API
  const fetchSubscriptionInfo = async () => {
    try {
      isLoading.value = true;
      const token = localStorage.getItem('token');
      if (!token) {
        subscriptionInfo.value = { type: 'demo', status: 'inactive' };
        return;
      }

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      subscriptionInfo.value = response.data;
      // Сохраняем в localStorage
      localStorage.setItem('subscription', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      // При ошибке используем данные из localStorage или демо
      subscriptionInfo.value = getSubscriptionFromStorage() || { type: 'demo', status: 'inactive' };
    } finally {
      isLoading.value = false;
    }
  };

  // Проверка, является ли пользователь демо
  const isDemo = computed(() => {
    const subscription = subscriptionInfo.value || getSubscriptionFromStorage();
    return !subscription || subscription.type === 'demo';
  });

  // Проверка активности подписки
  const isSubscriptionActive = computed(() => {
    const subscription = subscriptionInfo.value || getSubscriptionFromStorage();
    return subscription && subscription.status === 'active';
  });

  // Проверка, может ли пользователь использовать функции
  const canUseFeatures = computed(() => {
    return !isDemo.value && isSubscriptionActive.value;
  });

  // Получение сообщения о подписке
  const getSubscriptionMessage = computed(() => {
    const subscription = subscriptionInfo.value || getSubscriptionFromStorage();
    
    if (!subscription || subscription.type === 'demo') {
      return 'Подписка: Демо';
    }
    
    if (subscription.status === 'active') {
      return `Подписка активна до: ${subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('ru-RU') : 'бессрочно'}`;
    }
    
    return 'Подписка истекла';
  });

  // Обновление информации о подписке
  const updateSubscriptionInfo = (newInfo) => {
    subscriptionInfo.value = newInfo;
    if (newInfo) {
      localStorage.setItem('subscription', JSON.stringify(newInfo));
    }
  };

  // Автоматическая загрузка при инициализации
  onMounted(() => {
    fetchSubscriptionInfo();
  });

  return {
    subscriptionInfo,
    isLoading,
    isDemo,
    isSubscriptionActive,
    canUseFeatures,
    getSubscriptionMessage,
    updateSubscriptionInfo,
    getSubscriptionFromStorage,
    fetchSubscriptionInfo
  };
} 