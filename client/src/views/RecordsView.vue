<template>
  <div class="space-y-6">
    <!-- View Header & Desktop Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-app-text-primary tracking-tight">Histórico de Horas</h2>
        <p class="text-xs sm:text-sm text-app-text-muted">Gerencie e visualize seus turnos extras</p>
      </div>

      <div class="flex items-center gap-3">
        <input
          v-model="selectedMonth"
          type="month"
          class="bg-app-surface border border-app-border text-xs sm:text-sm text-app-text-primary rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 min-h-touch shadow-sm cursor-pointer"
        />

        <button
          @click="openCreateModal"
          class="hidden sm:inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-sm transition active:scale-[0.98] min-h-touch cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Novo Registro</span>
        </button>
      </div>
    </div>

    <!-- Monthly Summary Banner -->
    <div class="p-5 rounded-3xl bg-app-surface border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
          <Clock class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs font-semibold text-app-text-muted uppercase tracking-wider block">Total do Mês Selecionado</span>
          <span class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">+{{ formatMinutes(monthlyTotalMinutes) }}</span>
        </div>
      </div>
      <div class="flex items-center gap-6 text-right sm:border-l sm:border-app-border sm:pl-6">
        <div>
          <span class="text-xs text-app-text-muted block">Registros</span>
          <span class="text-base sm:text-lg font-bold text-app-text-primary">{{ filteredRecords.length }}</span>
        </div>
        <div>
          <span class="text-xs text-app-text-muted block">Média por turno</span>
          <span class="text-base sm:text-lg font-bold text-app-text-primary">{{ averageDaily }}</span>
        </div>
      </div>
    </div>

    <!-- Record List -->
    <RecordList
      :records="filteredRecords"
      @edit="openEditModal"
      @delete="handleDelete"
    />

    <!-- Fixed Floating Action Button (FAB) for Mobile Ergonomics only -->
    <div class="sm:hidden fixed bottom-20 right-4 z-20">
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-5 rounded-full shadow-lg shadow-emerald-950/30 active:scale-95 transition min-h-touch"
        aria-label="Novo Registro"
      >
        <Plus class="w-5 h-5" />
        <span class="text-sm">Novo Registro</span>
      </button>
    </div>

    <!-- Record Modal -->
    <OvertimeFormModal
      :is-open="isModalOpen"
      :editing-record="selectedRecord"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Clock } from 'lucide-vue-next';
import { localDb, type LocalOvertimeRecord } from '../services/db.js';
import { syncManager } from '../services/sync.js';
import { getCurrentUserId } from '../services/auth.js';
import RecordList from '../components/records/RecordList.vue';
import OvertimeFormModal from '../components/records/OvertimeFormModal.vue';

const records = ref<LocalOvertimeRecord[]>([]);
const isModalOpen = ref(false);
const selectedRecord = ref<LocalOvertimeRecord | null>(null);

const getCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const selectedMonth = ref(getCurrentMonth());

const loadRecords = async () => {
  const userId = getCurrentUserId();
  records.value = await localDb.overtimeRecords.where('user_id').equals(userId).reverse().sortBy('record_date');
};

onMounted(async () => {
  await loadRecords();
  syncManager.triggerSync().then(() => loadRecords());
});

const filteredRecords = computed(() => {
  return records.value.filter((r) => r.record_date.startsWith(selectedMonth.value));
});

const monthlyTotalMinutes = computed(() => {
  return filteredRecords.value.reduce((acc, curr) => acc + (curr.net_overtime_minutes || 0), 0);
});

const averageDaily = computed(() => {
  if (filteredRecords.value.length === 0) return '0h';
  const avg = Math.round(monthlyTotalMinutes.value / filteredRecords.value.length);
  const hours = Math.floor(avg / 60);
  const mins = avg % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
});

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

const openCreateModal = () => {
  selectedRecord.value = null;
  isModalOpen.value = true;
};

const openEditModal = (rec: LocalOvertimeRecord) => {
  selectedRecord.value = rec;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedRecord.value = null;
};

const handleSave = async (formData: any) => {
  await syncManager.saveRecordLocally(formData);
  await loadRecords();
  closeModal();
};

const handleDelete = async (id: string) => {
  if (confirm('Tem certeza que deseja excluir este registro de hora extra?')) {
    await syncManager.deleteRecordLocally(id);
    await loadRecords();
  }
};
</script>
