<template>
  <div class="verify-container">
    <div v-if="isLoading" class="loading">
      <h2>Подтверждение email...</h2>
      <p>Пожалуйста, подождите...</p>
    </div>
    
    <div v-else-if="isSuccess" class="success">
      <h2>Email подтвержден!</h2>
      <p>{{ successMessage }}</p>
      <div class="actions">
        <router-link to="/" class="btn btn-primary">Войти в систему</router-link>
      </div>
    </div>
    
    <div v-else-if="isError" class="error">
      <h2>Ошибка подтверждения</h2>
      <p>{{ errorMessage }}</p>
      <div class="actions">
        <button @click="resendVerification" class="btn btn-secondary" :disabled="resendLoading">
          {{ resendLoading ? 'Отправка...' : 'Отправить повторно' }}
        </button>
        <router-link to="/" class="btn btn-primary">Вернуться к входу</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const isLoading = ref(true);
const isSuccess = ref(false);
const isError = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const resendLoading = ref(false);

const verifyEmail = async () => {
  const token = route.query.token;
  
  if (!token) {
    isError.value = true;
    errorMessage.value = 'Токен подтверждения отсутствует';
    isLoading.value = false;
    return;
  }

  try {
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/verify-email?token=${token}`);
    
    if (response.data.message) {
      isSuccess.value = true;
      successMessage.value = response.data.message;
    }
  } catch (error) {
    console.error('Verification error:', error);
    isError.value = true;
    
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage.value = error.response.data.message;
    } else {
      errorMessage.value = 'Произошла ошибка при подтверждении email. Попробуйте позже.';
    }
  } finally {
    isLoading.value = false;
  }
};

const resendVerification = async () => {
  resendLoading.value = true;
  
  try {
    // Здесь нужно получить email пользователя
    // Для простоты показываем форму для ввода email
    const email = prompt('Введите ваш email для повторной отправки подтверждения:');
    
    if (!email) {
      resendLoading.value = false;
      return;
    }

    const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/resend-verification`, {
      email: email
    });
    
    if (response.data.message) {
      alert(response.data.message);
      router.push('/');
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error.response && error.response.data && error.response.data.message) {
      alert(error.response.data.message);
    } else {
      alert('Ошибка при повторной отправке подтверждения. Попробуйте позже.');
    }
  } finally {
    resendLoading.value = false;
  }
};

onMounted(() => {
  verifyEmail();
});
</script>

<style scoped>
.verify-container {
  max-width: 500px;
  margin: 50px auto;
  padding: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: center;
}

.loading h2,
.success h2,
.error h2 {
  color: #333;
  margin-bottom: 20px;
}

.loading p,
.success p,
.error p {
  color: #666;
  margin-bottom: 30px;
  font-size: 16px;
}

.success h2 {
  color: #27ae60;
}

.error h2 {
  color: #e74c3c;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  text-decoration: none;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: inline-block;
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

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .verify-container {
    margin: 20px;
    padding: 20px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style> 