<template>
  <div class="space-y-6">
    <!-- Header info banner -->
    <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 flex items-start space-x-3">
      <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
      <div class="text-sm text-app-text-primary">
        <h3 class="font-semibold text-amber-700 dark:text-amber-400">Manutenção do Sistema & Zona Crítica</h3>
        <p class="mt-1 text-app-text-muted">
          As operações nesta seção realizam alterações estruturais irreversíveis no armazenamento do servidor e no cache local dos dispositivos.
        </p>
      </div>
    </div>

    <!-- Danger Zone Card -->
    <div class="bg-app-card border border-red-500/30 rounded-xl p-5 sm:p-6 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-border pb-5">
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            <Trash2 class="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 class="text-lg font-bold text-app-text-primary">Restauração de Fábrica (Factory Reset)</h2>
          </div>
          <p class="text-sm text-app-text-muted">
            Apaga todos os registros de horas extras, compensações, histórico de acessos e usuários secundários para reiniciar o uso do sistema do zero.
          </p>
        </div>
      </div>

      <!-- Detail checks & options -->
      <div class="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-3">
        <div class="text-sm font-medium text-app-text-primary">O que acontece durante a restauração:</div>
        <ul class="text-xs sm:text-sm text-app-text-muted space-y-1.5 list-disc list-inside">
          <li>Exclusão permanente de todos os lançamentos de horas extras e compensações.</li>
          <li>Exclusão de todos os usuários comuns (o administrador atual é preservado com saldo zerado).</li>
          <li>Encerramento imediato de todas as sessões ativas no servidor.</li>
          <li>Limpeza completa do banco de dados local (IndexedDB) e cache de sincronização no navegador.</li>
        </ul>

        <div class="pt-2 border-t border-red-500/20">
          <label class="flex items-center space-x-3 cursor-pointer select-none py-1">
            <input
              type="checkbox"
              v-model="deleteBackups"
              class="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-app-border bg-app-bg cursor-pointer"
            />
            <span class="text-sm font-medium text-app-text-primary">
              Excluir também todos os arquivos de backup gerados no servidor
            </span>
          </label>
        </div>
      </div>

      <!-- Trigger Action -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div class="text-xs text-app-text-muted">
          Requer confirmação em duas etapas com digitação de palavra-chave.
        </div>
        <button
          type="button"
          @click="openConfirmModal"
          class="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm transition-colors min-h-touch"
        >
          <RotateCcw class="w-4 h-4" />
          <span>Zerar Todos os Dados</span>
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div class="bg-app-card border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-app-text-primary">Tem certeza absoluta?</h3>
            <p class="text-sm text-app-text-muted mt-1">
              Esta ação é <span class="font-bold text-red-600 dark:text-red-400">permanente e irreversível</span>. Todos os dados operacionais serão apagados sem possibilidade de recuperação direta.
            </p>
          </div>
        </div>

        <div class="bg-app-bg border border-app-border rounded-lg p-3 text-xs text-app-text-muted space-y-1">
          <div>• Base de dados: <span class="font-semibold text-app-text-primary">Todos os registros e compensações</span></div>
          <div>• Backups do servidor: <span class="font-semibold" :class="deleteBackups ? 'text-red-600' : 'text-app-text-primary'">{{ deleteBackups ? 'Serão excluídos do disco' : 'Serão mantidos' }}</span></div>
          <div>• Sua conta de admin: <span class="font-semibold text-green-600 dark:text-green-400">Preservada (saldo zerado)</span></div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-app-text-primary">
            Para confirmar, digite <span class="text-red-600 dark:text-red-400 tracking-wider">ZERAR</span> abaixo:
          </label>
          <input
            type="text"
            v-model="confirmationInput"
            placeholder="Digite ZERAR"
            class="w-full px-3.5 py-2.5 bg-app-bg border border-app-border rounded-lg text-app-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono tracking-widest min-h-touch uppercase"
            @keyup.enter="handleResetConfirm"
          />
        </div>

        <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-600 dark:text-red-400">
          {{ errorMessage }}
        </div>

        <div class="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            @click="closeModal"
            :disabled="isResetting"
            class="px-4 py-2.5 border border-app-border hover:bg-app-bg text-app-text-primary text-sm font-medium rounded-lg transition-colors min-h-touch disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleResetConfirm"
            :disabled="isResetting || confirmationInput.trim().toUpperCase() !== 'ZERAR'"
            class="inline-flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors min-h-touch"
          >
            <Loader2 v-if="isResetting" class="w-4 h-4 animate-spin" />
            <span>{{ isResetting ? 'Zerando sistema...' : 'Sim, Apagar Tudo' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, Trash2, RotateCcw, Loader2 } from 'lucide-vue-next';
import { executeSystemReset } from '../../services/admin.js';
import { clearAllLocalData } from '../../services/db.js';
import { logout } from '../../services/auth.js';

const router = useRouter();
const deleteBackups = ref(true);
const showModal = ref(false);
const confirmationInput = ref('');
const isResetting = ref(false);
const errorMessage = ref('');

function openConfirmModal() {
  confirmationInput.value = '';
  errorMessage.value = '';
  showModal.value = true;
}

function closeModal() {
  if (isResetting.value) return;
  showModal.value = false;
  confirmationInput.value = '';
  errorMessage.value = '';
}

async function handleResetConfirm() {
  if (confirmationInput.value.trim().toUpperCase() !== 'ZERAR') {
    errorMessage.value = "Por favor, digite exatamente 'ZERAR' para confirmar.";
    return;
  }

  isResetting.value = true;
  errorMessage.value = '';

  try {
    await executeSystemReset({
      confirmation: confirmationInput.value.trim().toUpperCase(),
      deleteBackups: deleteBackups.value,
    });

    // Clear client-side local IndexedDB and localStorage
    await clearAllLocalData();
    localStorage.clear();
    await logout();

    // Redirect to login with reset parameter
    showModal.value = false;
    router.push({ path: '/login', query: { reset: 'success' } });
  } catch (err: any) {
    errorMessage.value = err.message || 'Erro ao executar restauração de fábrica.';
  } finally {
    isResetting.value = false;
  }
}
</script>
