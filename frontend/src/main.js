// frontend/src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios'; // <-- Импортируем Axios

const app = createApp(App);

app.use(router);

app.mount('#app');

// --- Настройка перехватчика ответов Axios ---
axios.interceptors.response.use(
  response => response, // Если ответ успешен, просто возвращаем его
  async error => {
    // Проверяем, является ли ошибка ответом от сервера и имеет ли статус 401 (Unauthorized)
    // Исключаем ошибки токена WB API из глобальной обработки
    if (error.response && error.response.status === 401) {
      // Проверяем, не является ли это ошибкой токена WB API
      const isWbTokenError = error.config?.url?.includes('/integration-links/') && 
                            error.config?.url?.includes('/check-token');
      
      // Также исключаем ошибки синхронизации товаров, которые могут быть связаны с токеном WB
      const isWbSyncError = error.config?.url?.includes('/products/sync-now');
      
      if (!isWbTokenError && !isWbSyncError) {
        console.warn('Токен просрочен или недействителен. Перенаправление на страницу входа.');

        // Очищаем данные аутентификации
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');

        // Перенаправляем пользователя на страницу входа
        router.push('/');

        // Можно также вывести уведомление пользователю
        alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
      }
    }
    return Promise.reject(error); // Важно: всегда возвращать Promise.reject(error)
  }
);
// --- Конец настройки перехватчика ---
