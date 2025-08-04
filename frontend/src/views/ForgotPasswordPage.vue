<template>
  <div class="forgot-password-container">
    <h2>Восстановление пароля</h2>
    
    <div v-if="!emailSent" class="form-section">
      <p>Введите ваш email адрес, и мы отправим вам ссылку для сброса пароля.</p>
      
      <form @submit.prevent="sendResetEmail">
        <div class="form-group">
          <label for="email">Email адрес:</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required 
            :disabled="isLoading"
          />
        </div>
        
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Отправка...' : 'Отправить ссылку' }}
        </button>
      </form>
      
      <div class="links">
        <router-link to="/">Вернуться к входу</router-link>
      </div>
    </div>
    
    <div v-else class="success-section">
      <div class="success-icon">✓</div>
      <h3>Письмо отправлено!</h3>
      <p>{{ successMessage }}</p>
      <div class="actions">
        <router-link to="/" class="btn btn-primary">Вернуться к входу</router-link>
      </div>
    </div>
    
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const email = ref('');
const isLoading = ref(false);
const emailSent = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const sendResetEmail = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`, {
      email: email.value
    });
    
    emailSent.value = true;
    successMessage.value = response.data.message;
  } catch (error) {
    console.error('Forgot password error:', error);
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
.forgot-password-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

h2 {
  color: #333;
  margin-bottom: 20px;
}

.form-section p {
  color: #666;
  margin-bottom: 25px;
  font-size: 16px;
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

input[type="email"] {
  width: calc(100% - 20px);
  padding: 12px 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
}

input[type="email"]:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
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
}

button:hover:not(:disabled) {
  background-color: #45a049;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.links {
  margin-top: 20px;
}

.links a {
  color: #4CAF50;
  text-decoration: none;
  font-weight: bold;
}

.links a:hover {
  text-decoration: underline;
}

.success-section {
  text-align: center;
}

.success-icon {
  font-size: 48px;
  color: #4CAF50;
  margin-bottom: 20px;
}

.success-section h3 {
  color: #4CAF50;
  margin-bottom: 15px;
}

.success-section p {
  color: #666;
  margin-bottom: 25px;
  font-size: 16px;
}

.actions {
  margin-top: 20px;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background-color: #45a049;
}

.error-message {
  color: #e74c3c;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
  padding: 10px;
  background-color: #fadbd8;
  border-radius: 5px;
}

@media (max-width: 600px) {
  .forgot-password-container {
    margin: 20px;
    padding: 20px;
  }
}
</style> 