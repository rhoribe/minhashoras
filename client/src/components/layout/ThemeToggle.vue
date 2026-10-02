<template>
  <div class="inline-flex items-center p-1 rounded-xl bg-slate-200 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/60 shadow-inner">
    <button
      type="button"
      @click="setTheme('light')"
      class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-touch transition-all duration-150"
      :class="themeState.currentTheme.value === 'light' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      title="Modo Claro"
      aria-label="Ativar Modo Claro"
    >
      <Sun class="w-4 h-4" />
      <span class="hidden sm:inline">Claro</span>
    </button>

    <button
      type="button"
      @click="setTheme('dark')"
      class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-touch transition-all duration-150"
      :class="themeState.currentTheme.value === 'dark' ? 'bg-slate-900 text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      title="Modo Escuro"
      aria-label="Ativar Modo Escuro"
    >
      <Moon class="w-4 h-4" />
      <span class="hidden sm:inline">Escuro</span>
    </button>

    <button
      type="button"
      @click="setTheme('system')"
      class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-touch transition-all duration-150"
      :class="themeState.currentTheme.value === 'system' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      title="Seguir Sistema"
      aria-label="Ativar Modo Automático do Sistema"
    >
      <Laptop class="w-4 h-4" />
      <span class="hidden sm:inline">Auto</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Sun, Moon, Laptop } from 'lucide-vue-next';
import { themeState, setTheme } from '../../services/theme.js';
</script>
