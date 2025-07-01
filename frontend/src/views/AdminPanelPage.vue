<template>
  <div class="admin-panel-container">
    <h2>Админ-панель</h2>
    <button @click="logout" class="logout-button">Выйти</button>

    <h3>Добавить нового пользователя</h3>
    <form @submit.prevent="createUser" class="add-user-form">
      <div class="form-group">
        <label for="newUsername">Имя пользователя:</label>
        <input type="text" id="newUsername" v-model="newUsername" required />
      </div>
      <div class="form-group">
        <label for="newPassword">Пароль:</label>
        <input type="password" id="newPassword" v-model="newPassword" required />
      </div>
      <div class="form-group">
        <label for="newUserRole">Роль:</label>
        <select id="newUserRole" v-model="newUserRole">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit">Добавить пользователя</button>
    </form>
    <p v-if="addMessage" :class="addMessageType">{{ addMessage }}</p>

    <h3>Список пользователей</h3>
    <p v-if="loadingUsers">Загрузка пользователей...</p>
    <p v-if="usersErrorMessage" class="error-message">{{ usersErrorMessage }}</p>
    <ul v-if="users.length">
      <li v-for="user in users" :key="user._id" class="user-item">
        <span>{{ user.username }} ({{ user.role }})</span>
        <button @click="deleteUser(user._id)" class="delete-button">Удалить</button>
      </li>
    </ul>
    <p v-else-if="!loadingUsers">Пользователи не найдены.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const users = ref([]);
const newUsername = ref('');
const newPassword = ref('');
const newUserRole = ref('user');
const addMessage = ref('');
const addMessageType = ref(''); // 'success' or 'error'
const loadingUsers = ref(false);
const usersErrorMessage = ref('');
const router = useRouter();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Функция для получения токена из localStorage
const getToken = () => localStorage.getItem('token');

// Функция для получения списка пользователей
const fetchUsers = async () => {
  loadingUsers.value = true;
  usersErrorMessage.value = '';
  try {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    users.value = response.data;
  } catch (error) {
    usersErrorMessage.value = error.response?.data?.message || 'Ошибка при загрузке пользователей.';
    console.error('Fetch users error:', error);
  } finally {
    loadingUsers.value = false;
  }
};

// Функция для добавления пользователя
const createUser = async () => {
  addMessage.value = '';
  addMessageType.value = '';
  try {
    await axios.post(`${API_BASE_URL}/users`, {
      username: newUsername.value,
      password: newPassword.value,
      role: newUserRole.value,
    }, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    addMessage.value = 'Пользователь успешно добавлен!';
    addMessageType.value = 'success';
    newUsername.value = '';
    newPassword.value = '';
    newUserRole.value = 'user';
    fetchUsers(); // Обновляем список пользователей
  } catch (error) {
    addMessage.value = error.response?.data?.message || 'Ошибка при добавлении пользователя.';
    addMessageType.value = 'error';
    console.error('Create user error:', error);
  }
};

// Функция для удаления пользователя
const deleteUser = async (id) => {
  if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      alert('Пользователь удален!');
      fetchUsers(); // Обновляем список пользователей
    } catch (error) {
      alert(error.response?.data?.message || 'Ошибка при удалении пользователя.');
      console.error('Delete user error:', error);
    }
  }
};

// Функция для выхода
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  router.push('/');
};

// Загружаем пользователей при монтировании компонента
onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.admin-panel-container {
  max-width: 800px;
  margin: 50px auto;
  padding: 30px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #fff;
  text-align: left;
}

h2 {
  color: #333;
  margin-bottom: 25px;
  text-align: center;
}

.logout-button {
  background-color: #f44336;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  float: right;
  margin-top: -50px;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background-color: #da190b;
}

h3 {
  color: #444;
  margin-top: 30px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.add-user-form {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

input[type="text"],
input[type="password"],
select {
  width: calc(100% - 22px);
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
}

button[type="submit"] {
  background-color: #007bff;
  color: white;
  padding: 12px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  width: auto;
  transition: background-color 0.3s ease;
}

button[type="submit"]:hover {
  background-color: #0056b3;
}

.success {
  color: #28a745;
  font-weight: bold;
  margin-top: 10px;
}

.error {
  color: #dc3545;
  font-weight: bold;
  margin-top: 10px;
}

ul {
  list-style: none;
  padding: 0;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px dashed #eee;
}

.user-item:last-child {
  border-bottom: none;
}

.user-item span {
  font-size: 17px;
  color: #333;
}

.delete-button {
  background-color: #dc3545;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.delete-button:hover {
  background-color: #c82333;
}

.loading-message, .empty-message {
  color: #666;
  font-style: italic;
}
</style>