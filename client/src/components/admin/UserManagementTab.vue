<template>
  <div class="space-y-6">
    <!-- Header / Controls Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nome, usuário ou e-mail..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-app-border bg-app-surface text-app-text-primary placeholder-app-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-touch"
        />
      </div>

      <!-- New User Action Button -->
      <button
        type="button"
        @click="openCreateModal"
        class="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all shadow-sm active:scale-95 min-h-touch min-w-touch"
      >
        <UserPlus class="w-4 h-4" />
        <span>Novo Usuário</span>
      </button>
    </div>

    <!-- Error / Success Alert -->
    <div v-if="feedbackMessage" :class="feedbackIsError ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200'" class="p-4 rounded-xl border text-sm flex items-center justify-between">
      <span>{{ feedbackMessage }}</span>
      <button type="button" @click="feedbackMessage = null" class="p-1 text-app-text-muted hover:text-app-text-primary">✕</button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center space-y-3 text-app-text-muted">
      <Loader2 class="w-8 h-8 animate-spin text-brand-600" />
      <p class="text-sm">Carregando usuários do sistema...</p>
    </div>

    <!-- Users Table (Desktop) / Cards (Mobile) -->
    <div v-else-if="filteredUsers.length > 0" class="bg-app-surface rounded-2xl border border-app-border overflow-hidden shadow-sm">
      <!-- Desktop Table (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-app-surface-elevated border-b border-app-border text-xs text-app-text-muted uppercase tracking-wider">
            <tr>
              <th class="px-5 py-3 font-semibold">Usuário</th>
              <th class="px-5 py-3 font-semibold">E-mail</th>
              <th class="px-5 py-3 font-semibold">Papel</th>
              <th class="px-5 py-3 font-semibold">Status</th>
              <th class="px-5 py-3 font-semibold text-center">Sessões</th>
              <th class="px-5 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-app-border text-app-text-primary">
            <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-app-surface-elevated/50 transition-colors">
              <td class="px-5 py-4">
                <div class="flex items-center space-x-3">
                  <div class="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {{ u.display_name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="font-bold text-app-text-primary">{{ u.display_name }}</p>
                    <p class="text-xs text-app-text-muted">@{{ u.username }}</p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 text-app-text-secondary">{{ u.email }}</td>
              <td class="px-5 py-4">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-semibold"
                  :class="u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
                >
                  {{ u.role === 'admin' ? 'Administrador' : 'Colaborador' }}
                </span>
              </td>
              <td class="px-5 py-4">
                <span
                  class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                  :class="u.is_active ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="u.is_active ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                  <span>{{ u.is_active ? 'Ativo' : 'Desativado' }}</span>
                </span>
              </td>
              <td class="px-5 py-4 text-center font-medium text-app-text-secondary">
                {{ u.active_sessions_count }}
              </td>
              <td class="px-5 py-4 text-right">
                <div class="flex items-center justify-end space-x-1">
                  <button
                    type="button"
                    @click="openEditModal(u)"
                    class="p-2.5 rounded-lg text-app-text-muted hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 min-h-touch min-w-touch transition-colors"
                    title="Editar Usuário"
                    aria-label="Editar Usuário"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    @click="openResetPasswordModal(u)"
                    class="p-2.5 rounded-lg text-app-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 min-h-touch min-w-touch transition-colors"
                    title="Redefinir Senha"
                    aria-label="Redefinir Senha"
                  >
                    <KeyRound class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    @click="confirmDeleteUser(u)"
                    class="p-2.5 rounded-lg text-app-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-touch min-w-touch transition-colors"
                    title="Excluir Usuário"
                    aria-label="Excluir Usuário"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards (< 768px) -->
      <div class="md:hidden divide-y divide-app-border">
        <div v-for="u in filteredUsers" :key="u.id" class="p-4 space-y-3">
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold text-sm flex items-center justify-center shrink-0">
                {{ u.display_name.substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <p class="font-bold text-app-text-primary text-base">{{ u.display_name }}</p>
                <p class="text-xs text-app-text-muted">@{{ u.username }} • {{ u.email }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 text-xs">
            <span
              class="px-2.5 py-1 rounded-full font-semibold"
              :class="u.role === 'admin' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'"
            >
              {{ u.role === 'admin' ? 'Administrador' : 'Colaborador' }}
            </span>
            <span
              class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-semibold"
              :class="u.is_active ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="u.is_active ? 'bg-emerald-500' : 'bg-rose-500'"></span>
              <span>{{ u.is_active ? 'Ativo' : 'Desativado' }}</span>
            </span>
            <span class="text-app-text-muted">
              {{ u.active_sessions_count }} {{ u.active_sessions_count === 1 ? 'sessão' : 'sessões' }}
            </span>
          </div>

          <!-- Mobile Action Row -->
          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-app-border">
            <button
              type="button"
              @click="openEditModal(u)"
              class="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-app-text-secondary hover:bg-app-surface-elevated min-h-touch transition-colors"
            >
              <Edit2 class="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              @click="openResetPasswordModal(u)"
              class="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 min-h-touch transition-colors"
            >
              <KeyRound class="w-3.5 h-3.5" />
              <span>Senha</span>
            </button>
            <button
              type="button"
              @click="confirmDeleteUser(u)"
              class="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-h-touch transition-colors"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty Search State -->
    <div v-else class="text-center py-12 bg-app-surface rounded-2xl border border-app-border space-y-3">
      <UserX class="w-10 h-10 text-app-text-muted mx-auto" />
      <p class="text-sm font-semibold text-app-text-primary">Nenhum usuário encontrado</p>
      <p class="text-xs text-app-text-muted">Tente ajustar os termos de pesquisa.</p>
    </div>

    <!-- Modal: Create User -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-app-surface border border-app-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-app-border pb-3">
          <h2 class="text-lg font-bold text-app-text-primary">Criar Novo Usuário</h2>
          <button type="button" @click="showCreateModal = false" class="p-2 text-app-text-muted hover:text-app-text-primary rounded-lg min-h-touch min-w-touch">✕</button>
        </div>

        <form @submit.prevent="handleCreateUser" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Nome de Exibição</label>
            <input
              v-model="createForm.display_name"
              type="text"
              required
              placeholder="Ex: Maria Silva"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Nome de Usuário</label>
            <input
              v-model="createForm.username"
              type="text"
              required
              placeholder="Ex: mariasilva"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">E-mail</label>
            <input
              v-model="createForm.email"
              type="email"
              required
              placeholder="Ex: maria@empresa.com"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Senha Inicial</label>
            <input
              v-model="createForm.password"
              type="password"
              required
              placeholder="Mínimo 8 caracteres com letras e números"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Papel / Nível de Acesso</label>
            <select
              v-model="createForm.role"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            >
              <option value="user">Colaborador (Usuário Comum)</option>
              <option value="admin">Administrador (Gestão Total)</option>
            </select>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-app-border">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2.5 rounded-xl text-app-text-secondary hover:bg-app-surface-elevated font-semibold text-sm min-h-touch"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all min-h-touch disabled:opacity-50"
            >
              {{ isSubmitting ? 'Salvando...' : 'Criar Conta' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Edit User -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-app-surface border border-app-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-app-border pb-3">
          <h2 class="text-lg font-bold text-app-text-primary">Editar Usuário</h2>
          <button type="button" @click="showEditModal = false" class="p-2 text-app-text-muted hover:text-app-text-primary rounded-lg min-h-touch min-w-touch">✕</button>
        </div>

        <form @submit.prevent="handleUpdateUser" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Nome de Exibição</label>
            <input
              v-model="editForm.display_name"
              type="text"
              required
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">E-mail</label>
            <input
              v-model="editForm.email"
              type="email"
              required
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Papel</label>
            <select
              v-model="editForm.role"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            >
              <option value="user">Colaborador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div class="flex items-center space-x-3 pt-2">
            <input
              id="isActiveCheck"
              v-model="editForm.is_active"
              type="checkbox"
              class="w-4 h-4 text-brand-600 rounded border-app-border focus:ring-brand-500"
            />
            <label for="isActiveCheck" class="text-sm font-semibold text-app-text-primary">Conta Ativa</label>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-app-border">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-4 py-2.5 rounded-xl text-app-text-secondary hover:bg-app-surface-elevated font-semibold text-sm min-h-touch"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all min-h-touch disabled:opacity-50"
            >
              {{ isSubmitting ? 'Salvando...' : 'Salvar Alterações' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Reset Password -->
    <div v-if="showResetModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-app-surface border border-app-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between border-b border-app-border pb-3">
          <h2 class="text-lg font-bold text-app-text-primary">Redefinir Senha</h2>
          <button type="button" @click="showResetModal = false" class="p-2 text-app-text-muted hover:text-app-text-primary rounded-lg min-h-touch min-w-touch">✕</button>
        </div>

        <p class="text-xs text-app-text-muted">
          Defina uma nova senha para <strong class="text-app-text-primary">{{ targetUser?.display_name }}</strong> (@{{ targetUser?.username }}). As sessões ativas deste usuário serão desconectadas.
        </p>

        <form @submit.prevent="handleResetPassword" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-semibold text-app-text-muted">Nova Senha</label>
            <input
              v-model="newPasswordInput"
              type="password"
              required
              placeholder="Mínimo 8 caracteres com letras e números"
              class="w-full px-3 py-2 rounded-xl border border-app-border bg-app-surface text-app-text-primary text-sm focus:ring-2 focus:ring-brand-500 min-h-touch"
            />
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-app-border">
            <button
              type="button"
              @click="showResetModal = false"
              class="px-4 py-2.5 rounded-xl text-app-text-secondary hover:bg-app-surface-elevated font-semibold text-sm min-h-touch"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all min-h-touch disabled:opacity-50"
            >
              {{ isSubmitting ? 'Redefinindo...' : 'Atualizar Senha' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Search,
  UserPlus,
  Edit2,
  KeyRound,
  Trash2,
  UserX,
  Loader2,
} from 'lucide-vue-next';
import {
  fetchUsers,
  createAdminUser,
  updateAdminUser,
  resetUserPassword,
  deleteAdminUser,
  AdminUserDto,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../services/admin.js';

const users = ref<AdminUserDto[]>([]);
const isLoading = ref(true);
const isSubmitting = ref(false);
const searchQuery = ref('');
const feedbackMessage = ref<string | null>(null);
const feedbackIsError = ref(false);

// Modals state
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showResetModal = ref(false);
const targetUser = ref<AdminUserDto | null>(null);

const createForm = ref<CreateUserRequest>({
  username: '',
  display_name: '',
  email: '',
  password: '',
  role: 'user',
});

const editForm = ref<UpdateUserRequest>({
  display_name: '',
  email: '',
  role: 'user',
  is_active: true,
});

const newPasswordInput = ref('');

const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return users.value;
  return users.value.filter(
    u =>
      u.username.toLowerCase().includes(query) ||
      u.display_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
  );
});

async function loadUsers() {
  isLoading.value = true;
  try {
    users.value = await fetchUsers();
  } catch (err: any) {
    feedbackMessage.value = err.message || 'Falha ao carregar usuários.';
    feedbackIsError.value = true;
  } finally {
    isLoading.value = false;
  }
}

function openCreateModal() {
  createForm.value = {
    username: '',
    display_name: '',
    email: '',
    password: '',
    role: 'user',
  };
  showCreateModal.value = true;
}

function openEditModal(u: AdminUserDto) {
  targetUser.value = u;
  editForm.value = {
    display_name: u.display_name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
  };
  showEditModal.value = true;
}

function openResetPasswordModal(u: AdminUserDto) {
  targetUser.value = u;
  newPasswordInput.value = '';
  showResetModal.value = true;
}

async function handleCreateUser() {
  isSubmitting.value = true;
  feedbackMessage.value = null;
  try {
    await createAdminUser(createForm.value);
    showCreateModal.value = false;
    feedbackMessage.value = 'Usuário criado com sucesso!';
    feedbackIsError.value = false;
    await loadUsers();
  } catch (err: any) {
    feedbackMessage.value = err.message;
    feedbackIsError.value = true;
  } finally {
    isSubmitting.value = false;
  }
}

async function handleUpdateUser() {
  if (!targetUser.value) return;
  isSubmitting.value = true;
  feedbackMessage.value = null;
  try {
    await updateAdminUser(targetUser.value.id, editForm.value);
    showEditModal.value = false;
    feedbackMessage.value = 'Usuário atualizado com sucesso!';
    feedbackIsError.value = false;
    await loadUsers();
  } catch (err: any) {
    feedbackMessage.value = err.message;
    feedbackIsError.value = true;
  } finally {
    isSubmitting.value = false;
  }
}

async function handleResetPassword() {
  if (!targetUser.value) return;
  isSubmitting.value = true;
  feedbackMessage.value = null;
  try {
    await resetUserPassword(targetUser.value.id, newPasswordInput.value);
    showResetModal.value = false;
    feedbackMessage.value = `Senha de @${targetUser.value.username} redefinida com sucesso!`;
    feedbackIsError.value = false;
  } catch (err: any) {
    feedbackMessage.value = err.message;
    feedbackIsError.value = true;
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDeleteUser(u: AdminUserDto) {
  if (!confirm(`Tem certeza que deseja remover o usuário @${u.username} (${u.display_name})? Esta ação não pode ser desfeita.`)) {
    return;
  }
  try {
    await deleteAdminUser(u.id);
    feedbackMessage.value = `Usuário @${u.username} excluído com sucesso.`;
    feedbackIsError.value = false;
    await loadUsers();
  } catch (err: any) {
    feedbackMessage.value = err.message;
    feedbackIsError.value = true;
  }
}

onMounted(() => {
  loadUsers();
});
</script>
