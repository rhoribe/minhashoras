<template>
  <div class="space-y-6">
    <!-- Header & Desktop Toolbar -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-app-text-primary tracking-tight">Compensações</h2>
        <p class="text-xs sm:text-sm text-app-text-muted">Pré-agende folgas e abata horas do seu banco</p>
      </div>

      <button
        @click="isModalOpen = true"
        class="hidden sm:inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition active:scale-[0.98] min-h-touch cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Pré-Agendar</span>
      </button>
    </div>

    <!-- Responsive Layout: 12-column grid on desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Statistics & Info Column (col-span-5) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Summary Box -->
        <div class="p-5 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-app-text-muted uppercase tracking-wider block">Total Agendado Pendente</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {{ pendingCount }} pendente(s)
            </span>
          </div>

          <div>
            <span class="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">-{{ formatMinutes(totalPendingMinutes) }}</span>
            <p class="text-xs text-app-text-muted mt-1">Horas reservadas para compensação futura</p>
          </div>

          <div class="pt-3 border-t border-app-border flex items-center justify-between text-xs text-app-text-muted">
            <span>Já realizadas:</span>
            <span class="font-bold text-app-text-primary">{{ completedCount }} compensação(ões)</span>
          </div>
        </div>

        <!-- Informational Card -->
        <div class="p-5 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-2 text-xs text-app-text-muted">
          <h4 class="font-bold text-app-text-primary text-xs uppercase tracking-wider">Como funciona o pré-agendamento</h4>
          <p>
            Ao agendar uma compensação, as horas são projetadas no seu saldo mas só serão deduzidas efetivamente do banco após a conclusão.
          </p>
        </div>
      </div>

      <!-- Right Schedule List Column (col-span-7) -->
      <div class="lg:col-span-7 space-y-4">
        <ScheduleList
          :compensations="compensations"
          @complete="handleComplete"
          @cancel="handleCancel"
        />
      </div>
    </div>

    <!-- Floating Action Button for Mobile Viewports only -->
    <div class="sm:hidden fixed bottom-20 right-4 z-20">
      <button
        @click="isModalOpen = true"
        class="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-5 rounded-full shadow-lg shadow-amber-950/30 active:scale-95 transition min-h-touch"
        aria-label="Pré-Agendar"
      >
        <Plus class="w-5 h-5" />
        <span class="text-sm">Pré-Agendar</span>
      </button>
    </div>

    <!-- Modal -->
    <CompensationModal
      :is-open="isModalOpen"
      @close="isModalOpen = false"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus } from 'lucide-vue-next';
import { localDb, type LocalCompensationSchedule } from '../services/db.js';
import { syncManager } from '../services/sync.js';
import { getCurrentUserId } from '../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import ScheduleList from '../components/compensations/ScheduleList.vue';
import CompensationModal from '../components/compensations/CompensationModal.vue';

const compensations = ref<LocalCompensationSchedule[]>([]);
const isModalOpen = ref(false);

const loadCompensations = async () => {
  const userId = getCurrentUserId();
  compensations.value = await localDb.compensations.where('user_id').equals(userId).reverse().sortBy('planned_date');
};

onMounted(async () => {
  await loadCompensations();
  syncManager.triggerSync().then(() => loadCompensations());
});

const totalPendingMinutes = computed(() => {
  return compensations.value
    .filter(c => c.status === 'Scheduled')
    .reduce((acc, curr) => acc + (curr.scheduled_minutes || 0), 0);
});

const pendingCount = computed(() => compensations.value.filter(c => c.status === 'Scheduled').length);
const completedCount = computed(() => compensations.value.filter(c => c.status === 'Completed').length);

const formatMinutes = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const handleSave = async (formData: any) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const userId = getCurrentUserId();

  const item: LocalCompensationSchedule = {
    id,
    user_id: userId,
    planned_date: formData.planned_date,
    scheduled_minutes: formData.scheduled_minutes,
    actual_minutes: null,
    status: 'Scheduled',
    notes: formData.notes,
    sync_status: 'pending',
    client_updated_at: now,
    created_at: now,
    updated_at: now,
  };

  await localDb.compensations.put(item);
  await localDb.syncQueue.add({
    user_id: userId,
    entityType: 'compensation_schedule',
    entityId: id,
    action: 'insert',
    payload: item,
    enqueuedAt: now,
  });

  await loadCompensations();
  isModalOpen.value = false;
  if (navigator.onLine) {
    syncManager.triggerSync();
  }
};

const handleComplete = async (item: LocalCompensationSchedule) => {
  const now = new Date().toISOString();
  const userId = getCurrentUserId();

  const updated: LocalCompensationSchedule = {
    ...item,
    status: 'Completed',
    actual_minutes: item.scheduled_minutes,
    sync_status: 'pending',
    client_updated_at: now,
    updated_at: now,
  };

  await localDb.compensations.put(updated);
  await localDb.syncQueue.add({
    user_id: userId,
    entityType: 'compensation_schedule',
    entityId: item.id,
    action: 'update',
    payload: updated,
    enqueuedAt: now,
  });

  await loadCompensations();
  if (navigator.onLine) {
    syncManager.triggerSync();
  }
};

const handleCancel = async (id: string) => {
  if (confirm('Deseja cancelar esta compensação agendada?')) {
    const item = await localDb.compensations.get(id);
    if (!item) return;

    const now = new Date().toISOString();
    const userId = getCurrentUserId();

    const updated: LocalCompensationSchedule = {
      ...item,
      status: 'Cancelled',
      sync_status: 'pending',
      client_updated_at: now,
      updated_at: now,
    };

    await localDb.compensations.put(updated);
    await localDb.syncQueue.add({
      user_id: userId,
      entityType: 'compensation_schedule',
      entityId: id,
      action: 'update',
      payload: updated,
      enqueuedAt: now,
    });

    await loadCompensations();
    if (navigator.onLine) {
      syncManager.triggerSync();
    }
  }
};
</script>
