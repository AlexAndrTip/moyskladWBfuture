<template>
  <div class="dashboard-layout">
    <aside :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
      <div class="sidebar-header">
        <h3>{{ isSidebarCollapsed ? 'WBMS' : 'WBMS Dashboard' }}</h3>
        <button @click="toggleSidebar" class="sidebar-toggle-btn">
          <span v-if="isSidebarCollapsed">&gt;</span>
          <span v-else>&lt;</span>
        </button>
      </div>
      <nav class="sidebar-nav">
        <ul>
          <li v-for="item in menuItems" :key="item.name">
            <router-link :to="item.path" active-class="active-link" @click="selectMenuItem(item.name)">
              <i :class="item.icon"></i>
              <span v-if="!isSidebarCollapsed">{{ item.label }}</span>
            </router-link>
          </li>
        </ul>
      </nav>
      <div class="sidebar-footer">
        <button @click="logout" class="logout-button">
          <i class="fas fa-sign-out-alt"></i>
          <span v-if="!isSidebarCollapsed">Выйти</span>
        </button>
      </div>
    </aside>

    <main class="main-content">
      <header class="main-header">
        <h1>{{ currentMenuItemLabel }}</h1>
        </header>
      <div class="content-area">
        <router-view name="dashboardContent" /> </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute(); // Для отслеживания текущего маршрута

const isSidebarCollapsed = ref(false); // Состояние меню: свернуто/развернуто

// Элементы меню
const menuItems = ref([
  { name: 'Skladi', label: 'Склады', path: '/dashboard/skladi', icon: 'fas fa-warehouse' },
  { name: 'WBKabinety', label: 'WB Кабинеты', path: '/dashboard/wb-kabinety', icon: 'fas fa-store' },
  { name: 'Integracii', label: 'Интеграции', path: '/dashboard/integracii', icon: 'fas fa-puzzle-piece' },
  { name: 'Tovary', label: 'Товары', path: '/dashboard/tovary', icon: 'fas fa-box' },
  { name: 'Nastroiki', label: 'Настройки', path: '/dashboard/nastroiki', icon: 'fas fa-cog' },
  { name: 'Otcheti', label: 'Отчеты', path: '/dashboard/otcheti', icon: 'fas fa-chart-line' },
  { name: 'Postavki', label: 'Поставки', path: '/dashboard/postavki', icon: 'fas fa-truck' },
]);

// Вычисляемое свойство для отображения заголовка текущего пункта меню
const currentMenuItemLabel = computed(() => {
  const currentItem = menuItems.value.find(item => route.path.startsWith(item.path));
  return currentItem ? currentItem.label : 'Дашборд пользователя';
});

// Логика для сворачивания/разворачивания меню
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

// Метод для выбора пункта меню (можно добавить дополнительную логику)
const selectMenuItem = (itemName) => {
  // Здесь можно добавить логику, например, закрыть сайдбар на мобильных устройствах
  console.log(`Выбран пункт меню: ${itemName}`);
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userRole');
  router.push('/'); // Перенаправляем на страницу входа
};
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh; /* Занимаем всю высоту экрана */
  font-family: Arial, sans-serif;
  background-color: #f0f2f5;
}

/* Стили для бокового меню */
aside {
  width: 250px; /* Ширина развернутого меню */
  background-color: #2c3e50;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease; /* Анимация сворачивания/разворачивания */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  height: 100vh; /* Занимаем всю высоту вьюпорта */
  overflow-y: auto; /* Для прокрутки, если меню длинное */
}

.sidebar-collapsed {
  width: 60px; /* Ширина свернутого меню */
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #34495e;
  white-space: nowrap; /* Предотвращаем перенос текста */
  overflow: hidden; /* Скрываем, если не помещается */
}

.sidebar-header h3 {
  margin: 0;
  color: #ecf0f1;
  font-size: 20px;
  transition: opacity 0.3s ease;
}

.sidebar-collapsed .sidebar-header h3 {
  opacity: 0; /* Скрываем текст "WBMS Dashboard" при сворачивании */
  width: 0; /* Чтобы не занимал место */
}

.sidebar-toggle-btn {
  background: none;
  border: 1px solid #7f8c8d;
  color: #ecf0f1;
  font-size: 1.2em;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
  min-width: 40px; /* Чтобы кнопка не сжималась */
  text-align: center;
}

.sidebar-toggle-btn:hover {
  background-color: #34495e;
  border-color: #ecf0f1;
}

.sidebar-nav {
  flex-grow: 1; /* Занимает все доступное пространство */
  padding: 20px 0;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-nav li {
  margin-bottom: 5px;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  color: #ecf0f1;
  text-decoration: none;
  padding: 12px 20px;
  transition: background-color 0.2s ease, padding 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-collapsed .sidebar-nav a {
  padding: 12px 10px; /* Уменьшаем паддинг при сворачивании */
  justify-content: center; /* Центрируем иконку */
}

.sidebar-nav a:hover,
.sidebar-nav a.active-link {
  background-color: #34495e;
}

.sidebar-nav a i {
  margin-right: 15px; /* Отступ для иконки */
  font-size: 1.2em;
  width: 20px; /* Фиксированная ширина для иконки */
  text-align: center;
}

.sidebar-collapsed .sidebar-nav a i {
  margin-right: 0; /* Убираем отступ при сворачивании */
}

.sidebar-nav a span {
  transition: opacity 0.3s ease;
}

.sidebar-collapsed .sidebar-nav a span {
  opacity: 0; /* Скрываем текст пунктов меню */
  width: 0; /* Чтобы не занимал место */
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #34495e;
  display: flex;
  justify-content: center; /* Центрируем кнопку выхода */
}

.logout-button {
  background-color: #e74c3c;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  transition: background-color 0.3s ease, width 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar-collapsed .logout-button {
  padding: 10px; /* Меньший паддинг при сворачивании */
  width: 40px; /* Делаем кнопку квадратной */
  justify-content: center;
}

.logout-button:hover {
  background-color: #c0392b;
}

.logout-button i {
  margin-right: 8px;
}

.sidebar-collapsed .logout-button i {
  margin-right: 0; /* Убираем отступ для иконки */
}

.sidebar-collapsed .logout-button span {
  opacity: 0;
  width: 0;
}


/* Стили для основного содержимого */
.main-content {
  flex-grow: 1; /* Занимает оставшееся пространство */
  padding: 20px;
  overflow-y: auto; /* Для прокрутки содержимого */
}

.main-header {
  background-color: #ffffff;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  text-align: left;
}

.main-header h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.content-area {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: calc(100vh - 140px); /* Примерная высота, чтобы избежать схлопывания */
  display: flex; /* Для корректного отображения дочерних роутов */
  flex-direction: column;
}
</style>
