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
    // или если сообщение об ошибке явно указывает на просроченный JWT
    if (error.response && error.response.status === 401) {
      // Также можно проверить текст ошибки, если бэкенд возвращает "jwt expired"
      // if (error.response.data.message === 'jwt expired' || error.response.data.message === 'Unauthorized') {
      console.warn('Токен просрочен или недействителен. Перенаправление на страницу входа.');

      // Очищаем данные аутентификации
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userRole');

      // Перенаправляем пользователя на страницу входа
      // Используем router.push() из Vue Router, но так как мы вне компонента,
      // нам нужно получить доступ к экземпляру router.
      // Если router уже импортирован, можно использовать его напрямую.
      router.push('/');

      // Можно также вывести уведомление пользователю
      alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
    }
    return Promise.reject(error); // Важно: всегда возвращать Promise.reject(error)
  }
);
// --- Конец настройки перехватчика ---
