<template>
  <div class="reset-password-container">
    <div v-if="isLoading" class="loading">
      <h2>Проверка токена...</h2>
      <p>Пожалуйста, подождите...</p>
    </div>
    
    <div v-else-if="isValidToken" class="form-section">
      <h2>Создание нового пароля</h2>
      <p>Введите новый пароль для вашего аккаунта.</p>
      
      <form @submit.prevent="resetPassword">
        <div class="form-group">
          <label for="newPassword">Новый пароль:</label>
          <input 
            type="password" 
            id="newPassword" 
            v-model="newPassword" 
            required 
            :disabled="isSubmitting"
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Подтвердите пароль:</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            required 
            :disabled="isSubmitting"
            minlength="6"
          />
        </div>
        
        <div v-if="passwordError" class="password-error">
          {{ passwordError }}
        </div>
        
        <button type="submit" :disabled="isSubmitting || !isPasswordValid">
          {{ isSubmitting ? 'Сохранение...' : 'Сохранить новый пароль' }}
        </button>
      </form>
    </div>
    
    <div v-else-if="isSuccess" class="success-section">
      <div class="success-icon">✓</div>
      <h3>Пароль изменен!</h3>
      <p>{{ successMessage }}</p>
      <div class="actions">
        <router-link to="/" class="btn btn-primary">Войти в систему</router-link>
      </div>
    </div>
    
    <div v-else class="error-section">
      <div class="error-icon">✗</div>
      <h3>Ошибка</h3>
      <p>{{ errorMessage }}</p>
      <div class="actions">
        <router-link to="/forgot-password" class="btn btn-secondary">Запросить новую ссылку</router-link>
        <router-link to="/" class="btn btn-primary">Вернуться к входу</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const isLoading = ref(true);
const isValidToken = ref(false);
const isSuccess = ref(false);
const isSubmitting = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');
const successMessage = ref('');
const errorMessage = ref('');

const passwordError = computed(() => {
  if (newPassword.value && confirmPassword.value && newPassword.value !== confirmPassword.value) {
    return 'Пароли не совпадают';
  }
  if (newPassword.value && newPassword.value.length < 6) {
    return 'Пароль должен содержать минимум 6 символов';
  }
  return '';
});

const isPasswordValid = computed(() => {
  return newPassword.value && 
         confirmPassword.value && 
         newPassword.value === confirmPassword.value && 
         newPassword.value.length >= 6;
});

const validateToken = async () => {
  const token = route.query.token;
  
  if (!token) {
    errorMessage.value = 'Токен для сброса пароля отсутствует';
    isLoading.value = false;
    return;
  }

  // Токен будет проверен при отправке формы
  isValidToken.value = true;
  isLoading.value = false;
};

const resetPassword = async () => {
  if (!isPasswordValid.value) {
    return;
  }

  isSubmitting.value = true;
  const token = route.query.token;
  
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/reset-password`, {
      token: token,
      newPassword: newPassword.value
    });
    
    isSuccess.value = true;
    successMessage.value = response.data.message;
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message;
    } else {
      errorMessage.value = 'Произошла ошибка при сбросе пароля. Попробуйте позже.';
    }
    isValidToken.value = false;
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  validateToken();
});
</script>

<style scoped>
.reset-password-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

.loading h2,
.form-section h2,
.success-section h3,
.error-section h3 {
  color: #333;
  margin-bottom: 20px;
}

.loading p,
.form-section p,
.success-section p,
.error-section p {
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

input[type="password"] {
  width: calc(100% - 20px);
  padding: 12px 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
}

input[type="password"]:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.password-error {
  color: #e74c3c;
  font-size: 14px;
  margin-bottom: 15px;
  text-align: left;
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

.success-section,
.error-section {
  text-align: center;
}

.success-icon,
.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.success-icon {
  color: #4CAF50;
}

.error-icon {
  color: #e74c3c;
}

.success-section h3 {
  color: #4CAF50;
}

.error-section h3 {
  color: #e74c3c;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
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

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

@media (max-width: 600px) {
  .reset-password-container {
    margin: 20px;
    padding: 20px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn {
    width: auto;
    min-width: fit-content;
  }
}
</style> 