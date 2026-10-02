<template>
  <div class="space-y-8">
    <!-- Feedback banner -->
    <div v-if="feedbackMessage" :class="feedbackIsError ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200'" class="p-4 rounded-xl border text-sm flex items-center justify-between">
      <span>{{ feedbackMessage }}</span>
      <button type="button" @click="feedbackMessage = null" class="p-1 text-app-text-muted hover:text-app-text-primary">✕</button>
    </div>

    <!-- Section 1: Active Sessions Monitoring -->
    <div class="bg-app-surface rounded-2xl border border-app-border p-5 space-y-4 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-app-border pb-4">
        <div>
          <h2 class="text-base font-bold text-app-text-primary flex items-center space-x-2">
            <Radio class="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Sessões Ativas no Sistema</span>
          </h2>
          <p class="text-xs text-app-text-muted mt-0.5">
            Visualize os logins conectados e revogue tokens em tempo real.
          </p>
        </div>
        <button
          type="button"
          @click="loadSessions"
          :disabled="loadingSessions"
          class="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text-secondary hover:bg-app-surface-elevated border border-app-border min-h-touch min-w-touch"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loadingSessions }" />
          <span>Atualizar</span>
        </button>
      </div>

      <!-- Sessions List -->
      <div v-if="loadingSessions" class="py-6 text-center text-app-text-muted text-xs">
        Carregando sessões...
      </div>
      <div v-else-if="sessions.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="p-4 rounded-xl border border-app-border bg-app-surface-elevated/40 space-y-2 flex flex-col justify-between"
        >
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-sm text-app-text-primary">{{ s.display_name }}</span>
              <span v-if="s.is_current_session" class="text-[10px] bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full">
                Sua Sessão Atual
              </span>
            </div>
            <p class="text-xs text-app-text-muted">@{{ s.username }} • IP: {{ s.ip_address || 'Desconhecido' }}</p>
            <p class="text-[11px] text-app-text-muted truncate" :title="s.user_agent || ''">
              Dispositivo: {{ s.user_agent ? formatUserAgent(s.user_agent) : 'Não informado' }}
            </p>
            <p class="text-[11px] text-app-text-muted">
              Última atividade: {{ formatDate(s.last_used_at) }}
            </p>
          </div>

          <div class="pt-2 flex justify-end">
            <button
              v-if="!s.is_current_session"
              type="button"
              @click="handleRevokeSession(s.id)"
              class="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 min-h-touch min-w-touch transition-colors"
            >
              <LogOut class="w-3.5 h-3.5" />
              <span>Revogar Sessão</span>
            </button>
            <span v-else class="text-xs text-app-text-muted italic py-1">Não revogável</span>
          </div>
        </div>
      </div>
      <div v-else class="py-6 text-center text-xs text-app-text-muted">
        Nenhuma sessão ativa encontrada.
      </div>
    </div>

    <!-- Section 2: Access & Security Audit Logs -->
    <div class="bg-app-surface rounded-2xl border border-app-border p-5 space-y-4 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-app-border pb-4">
        <div>
          <h2 class="text-base font-bold text-app-text-primary flex items-center space-x-2">
            <ShieldCheck class="w-4 h-4 text-brand-600" />
            <span>Logs de Auditoria de Acesso</span>
          </h2>
          <p class="text-xs text-app-text-muted mt-0.5">
            Registro cronológico de autenticações, alterações de conta e segurança.
          </p>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[200px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-muted" />
            <input
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Filtrar por usuário/detalhe..."
              class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-xs focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <select
            v-model="eventTypeFilter"
            @change="loadAuditLogs"
            class="px-3 py-1.5 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-xs focus:ring-2 focus:ring-brand-500 min-h-touch"
          >
            <option value="">Todos os eventos</option>
            <option value="login_success">Login Sucesso</option>
            <option value="login_failed">Login Falha</option>
            <option value="logout">Logout</option>
            <option value="user_created">Usuário Criado</option>
            <option value="user_updated">Usuário Editado</option>
            <option value="password_reset">Senha Redefinida</option>
            <option value="session_revoked">Sessão Revogada</option>
          </select>
        </div>
      </div>

      <!-- Logs Table (Desktop) / Cards (Mobile) -->
      <div v-if="loadingLogs" class="py-10 text-center text-xs text-app-text-muted">
        Carregando logs de auditoria...
      </div>
      <div v-else-if="auditLogs.length > 0" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-app-surface-elevated border-b border-app-border text-app-text-muted uppercase tracking-wider">
            <tr>
              <th class="px-4 py-2.5 font-semibold">Data / Hora</th>
              <th class="px-4 py-2.5 font-semibold">Evento</th>
              <th class="px-4 py-2.5 font-semibold">Usuário</th>
              <th class="px-4 py-2.5 font-semibold">IP</th>
              <th class="px-4 py-2.5 font-semibold">Dispositivo</th>
              <th class="px-4 py-2.5 font-semibold">Detalhes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-app-border text-app-text-primary">
            <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-app-surface-elevated/40 transition-colors">
              <td class="px-4 py-3 whitespace-nowrap text-app-text-secondary">
                {{ formatDate(log.created_at) }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <span
                  class="px-2 py-0.5 rounded-full font-semibold text-[11px]"
                  :class="getEventBadgeClass(log.event_type)"
                >
                  {{ formatEventType(log.event_type) }}
                </span>
              </td>
              <td class="px-4 py-3 font-semibold whitespace-nowrap">
                {{ log.username ? `@${log.username}` : 'Sistema / Anônimo' }}
              </td>
              <td class="px-4 py-3 text-app-text-muted font-mono whitespace-nowrap">
                {{ log.ip_address || '—' }}
              </td>
              <td class="px-4 py-3 text-app-text-secondary max-w-[200px] truncate" :title="log.user_agent || ''">
                {{ log.user_agent ? formatUserAgent(log.user_agent) : '—' }}
              </td>
              <td class="px-4 py-3 text-app-text-muted max-w-[250px] truncate" :title="log.details || ''">
                {{ log.details || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-10 text-center text-xs text-app-text-muted">
        Nenhum evento registrado encontrado com os filtros atuais.
      </div>

      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="flex items-center justify-between pt-4 border-t border-app-border text-xs">
        <span class="text-app-text-muted">
          Página {{ currentPage }} de {{ totalPages }} ({{ totalLogs }} eventos)
        </span>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="changePage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-2 rounded-xl border border-app-border text-app-text-secondary hover:bg-app-surface-elevated disabled:opacity-40 min-h-touch"
          >
            Anterior
          </button>
          <button
            type="button"
            @click="changePage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-3 py-2 rounded-xl border border-app-border text-app-text-secondary hover:bg-app-surface-elevated disabled:opacity-40 min-h-touch"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Radio,
  ShieldCheck,
  Search,
  LogOut,
  RefreshCw,
} from 'lucide-vue-next';
import {
  fetchAccessLogs,
  fetchActiveSessions,
  revokeSession,
  AdminActiveSessionDto,
  AccessAuditLogDto,
} from '../../services/admin.js';

const sessions = ref<AdminActiveSessionDto[]>([]);
const auditLogs = ref<AccessAuditLogDto[]>([]);
const loadingSessions = ref(false);
const loadingLogs = ref(false);

const searchQuery = ref('');
const eventTypeFilter = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const totalLogs = ref(0);

const feedbackMessage = ref<string | null>(null);
const feedbackIsError = ref(false);

let searchTimeout: any = null;

function onSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadAuditLogs();
  }, 400);
}

async function loadSessions() {
  loadingSessions.value = true;
  try {
    sessions.value = await fetchActiveSessions();
  } catch (err: any) {
    feedbackMessage.value = err.message || 'Falha ao carregar sessões ativas.';
    feedbackIsError.value = true;
  } finally {
    loadingSessions.value = false;
  }
}

async function loadAuditLogs() {
  loadingLogs.value = true;
  try {
    const res = await fetchAccessLogs({
      page: currentPage.value,
      limit: 20,
      search: searchQuery.value.trim() || undefined,
      event_type: eventTypeFilter.value || undefined,
    });
    auditLogs.value = res.logs;
    currentPage.value = res.pagination.page;
    totalPages.value = res.pagination.total_pages;
    totalLogs.value = res.pagination.total;
  } catch (err: any) {
    feedbackMessage.value = err.message || 'Falha ao carregar logs de auditoria.';
    feedbackIsError.value = true;
  } finally {
    loadingLogs.value = false;
  }
}

async function handleRevokeSession(sessionId: string) {
  if (!confirm('Deseja realmente revogar esta sessão? O usuário precisará fazer login novamente.')) {
    return;
  }

  try {
    await revokeSession(sessionId);
    feedbackMessage.value = 'Sessão revogada com sucesso.';
    feedbackIsError.value = false;
    await loadSessions();
    await loadAuditLogs();
  } catch (err: any) {
    feedbackMessage.value = err.message || 'Falha ao revogar sessão.';
    feedbackIsError.value = true;
  }
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadAuditLogs();
}

function formatDate(isoString: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUserAgent(ua: string): string {
  if (ua.includes('Android')) return 'Android Mobile';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Safari';
  if (ua.includes('Chrome')) return 'Chrome Desktop';
  if (ua.includes('Firefox')) return 'Firefox Desktop';
  if (ua.includes('Safari')) return 'Safari Desktop';
  return ua.substring(0, 30);
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    login_success: 'Login Sucesso',
    login_failed: 'Login Falhou',
    logout: 'Logout',
    session_revoked: 'Sessão Revogada',
    user_created: 'Usuário Criado',
    user_updated: 'Usuário Editado',
    password_reset: 'Senha Redefinida',
    user_deleted: 'Usuário Excluído',
  };
  return map[type] || type;
}

function getEventBadgeClass(type: string): string {
  if (type === 'login_success') return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300';
  if (type === 'login_failed' || type === 'user_deleted') return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300';
  if (type === 'session_revoked' || type === 'password_reset') return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300';
  if (type === 'user_created' || type === 'user_updated') return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300';
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
}

onMounted(() => {
  loadSessions();
  loadAuditLogs();
});
</script>
