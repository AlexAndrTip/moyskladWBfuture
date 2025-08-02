<template>
  <div class="register-container">
    <h2>Регистрация</h2>
    <form @submit.prevent="register">
      <div class="form-group">
        <label for="username">Имя пользователя:</label>
        <input 
          type="text" 
          id="username" 
          v-model="formData.username" 
          :class="{ 'error': errors.username }"
          required 
        />
        <span v-if="errors.username" class="error-text">{{ errors.username }}</span>
      </div>
      
      <div class="form-group">
        <label for="email">Email адрес:</label>
        <input 
          type="email" 
          id="email" 
          v-model="formData.email" 
          :class="{ 'error': errors.email }"
          required 
        />
        <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
      </div>
      
      <div class="form-group">
        <label for="password">Пароль:</label>
        <input 
          type="password" 
          id="password" 
          v-model="formData.password" 
          :class="{ 'error': errors.password }"
          required 
        />
        <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
      </div>
      
      <div class="form-group">
        <label for="confirmPassword">Подтвердите пароль:</label>
        <input 
          type="password" 
          id="confirmPassword" 
          v-model="formData.confirmPassword" 
          :class="{ 'error': errors.confirmPassword }"
          required 
        />
        <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
      </div>
      
      <button type="submit" :disabled="isLoading">
        <span v-if="isLoading" class="loading-spinner"></span>
        {{ isLoading ? 'Регистрация...' : 'Зарегистрироваться' }}
      </button>
    </form>
    
    <div class="login-link">
      <p>Уже есть аккаунт? <router-link to="/login">Войти</router-link></p>
    </div>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const formData = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

// Валидация формы
const validateForm = () => {
  let isValid = true;
  
  // Очищаем предыдущие ошибки
  Object.keys(errors).forEach(key => errors[key] = '');
  
  // Валидация имени пользователя
  if (formData.username.length < 3) {
    errors.username = 'Имя пользователя должно содержать минимум 3 символа';
    isValid = false;
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
    errors.username = 'Имя пользователя может содержать только буквы, цифры и знак подчеркивания';
    isValid = false;
  }
  
  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    errors.email = 'Введите корректный email адрес';
    isValid = false;
  }
  
  // Валидация пароля
  if (formData.password.length < 6) {
    errors.password = 'Пароль должен содержать минимум 6 символов';
    isValid = false;
  }
  
  // Валидация подтверждения пароля
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Пароли не совпадают';
    isValid = false;
  }
  
  return isValid;
};

const register = async () => {
  if (!validateForm()) {
    return;
  }
  
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
      username: formData.username,
      email: formData.email,
      password: formData.password
    });

    if (response.data.message) {
      successMessage.value = response.data.message;
      
      // Очищаем форму
      Object.keys(formData).forEach(key => formData[key] = '');
      
      // Перенаправляем на страницу входа через 3 секунды
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message;
    } else {
      errorMessage.value = 'Ошибка сети или сервера. Попробуйте позже.';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
}

h2 {
  color: #333;
  margin-bottom: 25px;
  text-align: center;
}

.form-group {
  margin-bottom: 18px;
  text-align: left;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input[type="text"],
input[type="email"],
input[type="password"] {
  width: calc(100% - 20px);
  padding: 12px 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

input.error {
  border-color: #e74c3c;
}

.error-text {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 14px 20px;
  margin-top: 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 18px;
  width: 100%;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

button:hover:not(:disabled) {
  background-color: #45a049;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.login-link {
  margin-top: 20px;
  text-align: center;
}

.login-link a {
  color: #007bff;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}

.error-message {
  color: #e74c3c;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
}

.success-message {
  color: #28a745;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
}
</style> 