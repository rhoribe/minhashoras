<template>
  <div class="min-h-full flex flex-col justify-center items-center px-4 py-8 sm:py-16">
    <div class="w-full max-w-md mx-auto space-y-6">
      <!-- App Brand Header -->
      <div class="text-center space-y-2">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-brand-900/20">
          MH
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-app-primary">
          Minhas Horas
        </h1>
        <p class="text-sm text-app-text-muted">
          Gerenciamento inteligente de horas extras e banco de horas
        </p>
      </div>

      <!-- Card Container -->
      <div class="bg-app-surface rounded-3xl border border-app-border shadow-2xl overflow-hidden p-6 sm:p-8 transition-colors duration-200">
        <!-- Tab Selector -->
        <div class="grid grid-cols-2 p-1.5 bg-app-surface-elevated rounded-2xl mb-6">
          <button
            type="button"
            class="py-2.5 text-xs font-bold rounded-xl transition-all min-h-touch flex items-center justify-center"
            :class="isRegister ? 'text-app-text-muted hover:text-app-primary' : 'bg-app-surface text-app-primary shadow-sm'"
            @click="isRegister = false; errorMsg = ''"
          >
            Entrar
          </button>
          <button
            type="button"
            class="py-2 text-sm font-semibold rounded-lg transition-all min-h-touch flex items-center justify-center"
            :class="isRegister ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'"
            @click="isRegister = true; errorMsg = ''"
          >
            Criar Conta
          </button>
        </div>

        <!-- Reset Success Feedback Banner -->
        <div
          v-if="route.query.reset === 'success'"
          class="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-2"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
          <span>O sistema foi restaurado para o estado inicial com sucesso. Entre com sua conta de administrador para começar do início.</span>
        </div>

        <!-- Error Feedback Banner -->
        <div
          v-if="errorMsg || authState.error.value"
          class="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ errorMsg || authState.error.value }}</span>
        </div>

        <!-- Login Form -->
        <form v-if="!isRegister" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Usuário ou E-mail
            </label>
            <input
              v-model="loginForm.login"
              type="text"
              required
              autocomplete="username"
              placeholder="seu.usuario ou email@exemplo.com"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Senha
            </label>
            <input
              v-model="loginForm.password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <button
            type="submit"
            :disabled="authState.isLoading.value"
            class="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 min-h-touch disabled:opacity-50"
          >
            <span v-if="authState.isLoading.value" class="inline-block animate-spin mr-2">⏳</span>
            <span>{{ authState.isLoading.value ? 'Entrando...' : 'Acessar Painel' }}</span>
          </button>
        </form>

        <!-- Registration Form -->
        <form v-else @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome Completo
            </label>
            <input
              v-model="registerForm.display_name"
              type="text"
              required
              placeholder="Ex: Ana Silva"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nome de Usuário (login)
            </label>
            <input
              v-model="registerForm.username"
              type="text"
              required
              autocomplete="username"
              placeholder="anasilva"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              E-mail
            </label>
            <input
              v-model="registerForm.email"
              type="email"
              required
              autocomplete="email"
              placeholder="ana@exemplo.com"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Senha (mínimo 8 caracteres com letras e números)
            </label>
            <input
              v-model="registerForm.password"
              type="password"
              required
              autocomplete="new-password"
              placeholder="••••••••"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <button
            type="submit"
            :disabled="authState.isLoading.value"
            class="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 min-h-touch disabled:opacity-50"
          >
            <span v-if="authState.isLoading.value" class="inline-block animate-spin mr-2">⏳</span>
            <span>{{ authState.isLoading.value ? 'Criando Conta...' : 'Cadastrar e Entrar' }}</span>
          </button>
        </form>
      </div>

      <!-- Quick Tips / Offline Notice -->
      <div class="text-center text-xs text-slate-400 dark:text-slate-500">
        <p>Dados isolados e armazenados com segurança no seu servidor local.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AlertCircle, CheckCircle2 } from 'lucide-vue-next';
import { authState, login, register } from '../services/auth.js';

const router = useRouter();
const route = useRoute();
const isRegister = ref(false);
const errorMsg = ref('');

const loginForm = reactive({
  login: '',
  password: '',
});

const registerForm = reactive({
  display_name: '',
  username: '',
  email: '',
  password: '',
});

async function handleLogin() {
  errorMsg.value = '';
  const success = await login(loginForm.login, loginForm.password);
  if (success) {
    router.push('/');
  }
}

async function handleRegister() {
  errorMsg.value = '';
  if (registerForm.password.length < 8) {
    errorMsg.value = 'A senha deve conter no mínimo 8 caracteres.';
    return;
  }
  const success = await register(registerForm);
  if (success) {
    router.push('/');
  }
}
</script>
