import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';

import DashboardView from './views/DashboardView.vue';
import RecordsView from './views/RecordsView.vue';
import CompensationsView from './views/CompensationsView.vue';
import ReportsView from './views/ReportsView.vue';
import SettingsView from './views/SettingsView.vue';
import LoginView from './views/LoginView.vue';
import AdminView from './views/AdminView.vue';
import ChangePasswordView from './views/ChangePasswordView.vue';

import { authState, fetchCurrentUser } from './services/auth.js';
import { initTheme } from './services/theme.js';

const routes = [
  { path: '/login', component: LoginView, meta: { public: true } },
  { path: '/change-password', component: ChangePasswordView },
  { path: '/', component: DashboardView },
  { path: '/records', component: RecordsView },
  { path: '/compensations', component: CompensationsView },
  { path: '/reports', component: ReportsView },
  { path: '/settings', component: SettingsView },
  { path: '/admin', component: AdminView, meta: { requiresAdmin: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const isPublic = to.meta.public;
  const hasToken = !!localStorage.getItem('minhas_horas_auth_token');

  if (!isPublic && !hasToken) {
    return next('/login');
  } else if (to.path === '/login' && hasToken) {
    return next('/');
  }

  // Ensure current user is loaded if authenticated
  if (hasToken && !authState.user.value) {
    await fetchCurrentUser();
  }

  // Mandatory password change check
  if (hasToken && authState.user.value?.must_change_password) {
    if (to.path !== '/change-password') {
      return next('/change-password');
    }
    return next();
  }

  // If user doesn't need to change password, prevent staying on /change-password
  if (to.path === '/change-password') {
    return next('/');
  }

  if (to.meta.requiresAdmin) {
    if (!hasToken) {
      return next('/login');
    }
    if (!authState.isAdmin.value) {
      return next('/');
    }
  }

  next();
});

initTheme();
fetchCurrentUser();

const app = createApp(App);
app.use(router);
app.mount('#app');
