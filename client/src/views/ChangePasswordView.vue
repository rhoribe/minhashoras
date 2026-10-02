<template>
  <div class="min-h-full flex flex-col justify-center items-center px-4 py-8 sm:py-16">
    <div class="w-full max-w-md mx-auto space-y-6">
      <!-- App Brand Header -->
      <div class="text-center space-y-2">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl font-black shadow-lg">
          <KeyRound class="w-8 h-8" />
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-app-primary">
          Primeiro Acesso
        </h1>
        <p class="text-sm text-app-text-muted">
          Defina uma nova senha segura para prosseguir
        </p>
      </div>

      <!-- Card Container -->
      <div class="bg-app-surface rounded-3xl border border-app-border shadow-2xl overflow-hidden p-6 sm:p-8 transition-colors duration-200">
        <!-- Security Advisory Notice -->
        <div class="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-start space-x-2.5">
          <ShieldAlert class="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Por motivos de segurança, a senha padrão inicial deve ser substituída antes de acessar as funcionalidades do sistema.
          </span>
        </div>

        <!-- Error Feedback Banner -->
        <div
          v-if="errorMessage || authState.error.value"
          class="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ errorMessage || authState.error.value }}</span>
        </div>

        <!-- Success Feedback Banner -->
        <div
          v-if="successMessage"
          class="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-2"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nova Senha
            </label>
            <div class="relative">
              <input
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="No mínimo 8 caracteres com letras e números"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors pr-10"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 min-w-touch min-h-touch flex items-center justify-center rounded-lg"
                title="Alternar visibilidade"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirmar Nova Senha
            </label>
            <input
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              placeholder="Digite a nova senha novamente"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors"
            />
          </div>

          <!-- Password Requirements Checklist -->
          <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 text-xs border border-slate-200/60 dark:border-slate-800">
            <div class="flex items-center space-x-2" :class="hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
              <Check v-if="hasMinLength" class="w-3.5 h-3.5" />
              <X v-else class="w-3.5 h-3.5 text-slate-400" />
              <span>Mínimo de 8 caracteres</span>
            </div>
            <div class="flex items-center space-x-2" :class="hasLetterAndNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
              <Check v-if="hasLetterAndNumber" class="w-3.5 h-3.5" />
              <X v-else class="w-3.5 h-3.5 text-slate-400" />
              <span>Pelo menos uma letra e um número</span>
            </div>
            <div class="flex items-center space-x-2" :class="passwordsMatch && confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'">
              <Check v-if="passwordsMatch && confirmPassword" class="w-3.5 h-3.5" />
              <X v-else class="w-3.5 h-3.5 text-slate-400" />
              <span>Senhas idênticas</span>
            </div>
          </div>

          <button
            type="submit"
            :disabled="!isFormValid || authState.isLoading.value"
            class="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 min-h-touch disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="authState.isLoading.value" class="inline-block animate-spin mr-2">⏳</span>
            <span>{{ authState.isLoading.value ? 'Atualizando...' : 'Definir Senha e Continuar' }}</span>
          </button>

          <button
            type="button"
            @click="handleLogout"
            class="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all flex items-center justify-center min-h-touch"
          >
            Sair e Fazer Login Mais Tarde
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { KeyRound, ShieldAlert, AlertCircle, CheckCircle2, Check, X, Eye, EyeOff } from 'lucide-vue-next';
import { authState, changePassword, logout } from '../services/auth.js';

const router = useRouter();

const newPassword = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const hasMinLength = computed(() => newPassword.value.length >= 8);
const hasLetterAndNumber = computed(() => /[A-Za-z]/.test(newPassword.value) && /[0-9]/.test(newPassword.value));
const passwordsMatch = computed(() => newPassword.value === confirmPassword.value && newPassword.value.length > 0);

const isFormValid = computed(() => hasMinLength.value && hasLetterAndNumber.value && passwordsMatch.value);

async function handleSubmit() {
  errorMessage.value = '';
  successMessage.value = '';

  if (!isFormValid.value) {
    errorMessage.value = 'Por favor, cumpra todos os requisitos de senha.';
    return;
  }

  const result = await changePassword(newPassword.value);
  if (result.success) {
    successMessage.value = 'Senha alterada com sucesso! Redirecionando...';
    setTimeout(() => {
      router.push('/');
    }, 1200);
  } else {
    errorMessage.value = result.message || 'Falha ao atualizar senha.';
  }
}

async function handleLogout() {
  await logout();
  router.push('/login');
}
</script>
