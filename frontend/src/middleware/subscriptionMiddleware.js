// frontend/src/middleware/subscriptionMiddleware.js
import axios from 'axios';

// Функция для проверки подписки
export const checkSubscription = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { type: 'demo', status: 'inactive' };
    }

    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/subscription/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { type: 'demo', status: 'inactive' };
  }
};

// Функция для проверки доступа к страницам, требующим подписку
export const hasSubscriptionAccess = (subscription) => {
  if (!subscription) return false;
  
  // Доступ к расширенным функциям только с basic или premium подпиской
  return subscription.type === 'basic' || subscription.type === 'premium';
};

// Функция для получения сообщения о необходимости подписки
export const getSubscriptionMessage = () => {
  return {
    title: 'Требуется подписка',
    message: 'Для доступа к этой странице необходима активная подписка. Оформите подписку для получения полного доступа ко всем функциям системы.',
    buttonText: 'Оформить подписку'
  };
}; 