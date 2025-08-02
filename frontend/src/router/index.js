// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../views/LoginPage.vue'; // Путь к LoginPage
import RegisterPage from '../views/RegisterPage.vue'; // Путь к RegisterPage
import VerifyEmailPage from '../views/VerifyEmailPage.vue'; // Путь к VerifyEmailPage
import AdminPanelPage from '../views/AdminPanelPage.vue'; // Путь к AdminPanelPage
import UserDashboardPage from '../views/UserDashboardPage.vue';

// Импорты для вложенных страниц дашборда
import SkladiPage from '../views/SkladiPage.vue'; // <-- Новый импорт
import WbKabinetyPage from '../views/WbKabinetyPage.vue';
import IntegraciiPage from '../views/IntegraciiPage.vue';
import TovaryPage from '../views/TovaryPage/TovaryPage.vue';
import NastroikiPage from '../views/NastroikiPage.vue';
import OtchetiPage from '../views/OtchetiPage.vue';
import PostavkiPage from '../views/PostavkiPage.vue';
import OrganizationPage from '../views/OrganizationPage/OrganizationPage.vue';
import UslugiPage from '../views/UslugiPage/UslugiPage.vue';
import FbsOrdersPage from '../views/FbsOrdersPage.vue';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage,
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmailPage,
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: AdminPanelPage,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/dashboard',
    name: 'UserDashboard',
    component: UserDashboardPage,
    meta: { requiresAuth: true },
    // Вложенные маршруты для содержимого дашборда
    children: [
      {
        path: '', // Дефолтный маршрут для /dashboard
        name: 'DashboardHome',
        components: {
          dashboardContent: { template: '<div><h3>Выберите пункт меню слева</h3></div>' } // Заглушка
        }
      },
      {
        path: 'skladi',
        name: 'Skladi',
        components: { dashboardContent: SkladiPage } // Используем именованный view
      },
      {
        path: 'wb-kabinety',
        name: 'WBKabinety',
        components: { dashboardContent: WbKabinetyPage }
      },
      {
        path: 'integracii',
        name: 'Integracii',
        components: { dashboardContent: IntegraciiPage }
      },
      {
        path: 'tovary',
        name: 'tovary',
        components: { dashboardContent: TovaryPage }
      },
      {
        path: 'nastroiki',
        name: 'Nastroiki',
        components: { dashboardContent: NastroikiPage }
      },
      {
        path: 'otcheti',
        name: 'Otcheti',
        components: { dashboardContent: OtchetiPage }
      },
      {
        path: 'postavki',
        name: 'Postavki',
        components: { dashboardContent: PostavkiPage }
      },
      { // <-- НОВЫЙ МАРШРУТ ДЛЯ ОРГАНИЗАЦИЙ
        path: 'organizations',
        name: 'Organizations',
        components: {
          dashboardContent: OrganizationPage
        },
        meta: { requiresAuth: true, roles: ['user', 'admin'] }
      },
      { // <-- НОВЫЙ МАРШРУТ ДЛЯ УСЛУГ
        path: 'uslugi',
        name: 'Uslugi',
        components: {
          dashboardContent: UslugiPage
        },
        meta: { requiresAuth: true, roles: ['user', 'admin'] }
      },
      {
        path: 'fbs',
        name: 'FBSOrders',
        components: { dashboardContent: FbsOrdersPage },
        meta: { requiresAuth: true, roles: ['user', 'admin'] }
      }
    ]
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Глобальный навигационный хук для проверки аутентификации и роли
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  // Если маршрут требует авторизации, но токена нет
  if (to.meta.requiresAuth && !token) {
    next('/'); // Перенаправляем на логин
  }
  // Если маршрут требует роль админа, но у пользователя нет такой роли
  else if (to.meta.requiresAdmin && userRole !== 'admin') {
    alert('У вас нет прав доступа к этой странице.');
    next('/'); // Перенаправляем на логин или на дашборд пользователя
  }
  // Если пользователь авторизован и пытается перейти на страницу логина/регистрации,
  // перенаправляем его на соответствующий дашборд
  else if ((to.name === 'Login' || to.name === 'Register') && token) {
    if (userRole === 'admin') {
      next('/admin');
    } else {
      next('/dashboard'); // Перенаправляем на дашборд пользователя
    }
  }
  // Во всех остальных случаях разрешаем переход
  else {
    next();
  }
});

export default router;
