<template>
  <div class="verify-container">
    <div v-if="!isLoading && !error" class="success-content">
      <div class="success-icon">✓</div>
      <h2>Email подтвержден!</h2>
      <p>{{ message }}</p>
      <button @click="goToLogin" class="login-btn">Войти в систему</button>
    </div>
    
    <div v-if="!isLoading && error" class="error-content">
      <div class="error-icon">✗</div>
      <h2>Ошибка подтверждения</h2>
      <p>{{ error }}</p>
      <div class="actions">
        <button @click="resendVerification" class="resend-btn">Отправить повторно</button>
        <button @click="goToLogin" class="login-btn">Вернуться к входу</button>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading-content">
      <div class="loading-spinner"></div>
      <p>Проверяем токен подтверждения...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';

// Определяем базовый URL API с запасным вариантом
const API_BASE_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_BASE_URL || '/api');
console.log('DEV mode?', import.meta.env.DEV, ' | API_BASE_URL (verify):', API_BASE_URL);

const router = useRouter();
const route = useRoute();
const isLoading = ref(true);
const error = ref('');
const message = ref('');

onMounted(async () => {
  const token = route.query.token;
  
  if (!token) {
    error.value = 'Отсутствует токен подтверждения';
    isLoading.value = false;
    return;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/verify-email?token=${token}`);
    message.value = response.data.message;
    isLoading.value = false;
  } catch (err) {
    console.error('Verification error:', err);
    if (err.response && err.response.data && err.response.data.message) {
      error.value = err.response.data.message;
    } else {
      error.value = 'Произошла ошибка при подтверждении email';
    }
    isLoading.value = false;
  }
});

const goToLogin = () => {
  router.push('/login');
};

const resendVerification = async () => {
  // Здесь можно добавить логику для повторной отправки email
  // Пока просто перенаправляем на страницу входа
  router.push('/login');
};
</script>

<style scoped>
.verify-container {
  max-width: 500px;
  margin: 100px auto;
  padding: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

.success-content,
.error-content,
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.success-icon {
  width: 80px;
  height: 80px;
  background-color: #28a745;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
}

.error-icon {
  width: 80px;
  height: 80px;
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: bold;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

h2 {
  color: #333;
  margin: 0;
  font-size: 24px;
}

p {
  color: #666;
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
}

.login-btn,
.resend-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  text-decoration: none;
  display: inline-block;
  transition: background-color 0.3s ease;
}

.login-btn {
  background-color: #007bff;
  color: white;
}

.login-btn:hover {
  background-color: #0056b3;
}

.resend-btn {
  background-color: #6c757d;
  color: white;
}

.resend-btn:hover {
  background-color: #545b62;
}
</style> 