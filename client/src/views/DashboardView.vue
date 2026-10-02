<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl sm:text-2xl font-extrabold text-app-text-primary tracking-tight">Painel de Horas</h2>
        <p class="text-xs sm:text-sm text-app-text-muted">Resumo do seu banco e atividades recentes</p>
      </div>
      <button
        @click="refreshDashboard"
        class="p-2.5 rounded-xl bg-app-surface hover:bg-app-surface-elevated text-app-text-secondary border border-app-border shadow-sm transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
        title="Atualizar"
        aria-label="Atualizar dados do painel"
      >
        <RotateCcw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
      </button>
    </div>

    <!-- Responsive Grid Layout: 12-column on desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Operational Column (col-span-7) -->
      <div class="lg:col-span-7 space-y-4">
        <!-- Limit Alert Banner (Warning / Exceeded) -->
        <LimitAlertBanner
          :is-warning="balance.isWarning"
          :is-exceeded="balance.isExceeded"
          :current-minutes="balance.netBalanceMinutes"
          :max-minutes="balance.maxPositiveLimitMinutes"
        />

        <!-- Main Balance Card -->
        <BalanceCard
          :positive-minutes="balance.totalPositiveMinutes"
          :negative-minutes="balance.totalNegativeMinutes"
          :net-minutes="balance.netBalanceMinutes"
          :projected-minutes="balance.projectedBalanceMinutes"
          :max-minutes="balance.maxPositiveLimitMinutes"
        />

        <!-- Quick Actions -->
        <div class="grid grid-cols-2 gap-3">
          <button
            @click="isRecordModalOpen = true"
            class="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition min-h-touch cursor-pointer"
          >
            <PlusCircle class="w-4 h-4" />
            <span>Registrar Horas</span>
          </button>
          <router-link
            to="/compensations"
            class="p-3.5 rounded-2xl bg-app-surface hover:bg-app-surface-elevated text-app-text-primary border border-app-border shadow-sm flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm transition active:scale-[0.98] min-h-touch"
          >
            <CalendarCheck2 class="w-4 h-4 text-amber-500" />
            <span>Compensações</span>
          </router-link>
        </div>
      </div>

      <!-- Right History Column (col-span-5) -->
      <div class="lg:col-span-5 space-y-4">
        <div class="p-4 sm:p-5 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs sm:text-sm font-bold text-app-text-muted uppercase tracking-wider">Últimos Registros</h3>
            <router-link to="/records" class="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:underline min-h-touch flex items-center">
              Ver todos →
            </router-link>
          </div>

          <div v-if="recentRecords.length === 0" class="p-6 text-center rounded-2xl border border-dashed border-app-border text-xs text-app-text-muted bg-app-bg/50">
            Nenhum turno registrado recentemente.
          </div>

          <div v-else class="space-y-2.5">
            <RecordCard
              v-for="rec in recentRecords"
              :key="rec.id"
              :record="rec"
              @edit="handleEdit"
              @delete="handleDelete"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Overtime Modal -->
    <OvertimeFormModal
      :is-open="isRecordModalOpen"
      :editing-record="editingRecord"
      @close="closeRecordModal"
      @save="handleSaveRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RotateCcw, PlusCircle, CalendarCheck2 } from 'lucide-vue-next';
import { localDb, type LocalOvertimeRecord } from '../services/db.js';
import { syncManager } from '../services/sync.js';
import { calculateLocalBalance, type LocalBalanceSummary } from '../services/balance-service.js';
import { getCurrentUserId } from '../services/auth.js';
import LimitAlertBanner from '../components/balance/LimitAlertBanner.vue';
import BalanceCard from '../components/balance/BalanceCard.vue';
import RecordCard from '../components/records/RecordCard.vue';
import OvertimeFormModal from '../components/records/OvertimeFormModal.vue';

const isRefreshing = ref(false);
const isRecordModalOpen = ref(false);
const editingRecord = ref<LocalOvertimeRecord | null>(null);

const balance = ref<LocalBalanceSummary>({
  totalPositiveMinutes: 0,
  totalNegativeMinutes: 0,
  netBalanceMinutes: 0,
  projectedBalanceMinutes: 0,
  isWarning: false,
  isExceeded: false,
  maxPositiveLimitMinutes: 2400,
  maxNegativeLimitMinutes: -600,
  warningThresholdPercentage: 80,
});

const recentRecords = ref<LocalOvertimeRecord[]>([]);

const loadData = async () => {
  const currentUserId = getCurrentUserId();
  balance.value = await calculateLocalBalance();
  const allRecords = await localDb.overtimeRecords.where('user_id').equals(currentUserId).reverse().sortBy('record_date');
  recentRecords.value = allRecords.slice(0, 3);
};

const refreshDashboard = async () => {
  isRefreshing.value = true;
  await syncManager.triggerSync();
  await loadData();
  isRefreshing.value = false;
};

onMounted(async () => {
  await loadData();
  refreshDashboard();
});

const closeRecordModal = () => {
  isRecordModalOpen.value = false;
  editingRecord.value = null;
};

const handleEdit = (record: LocalOvertimeRecord) => {
  editingRecord.value = record;
  isRecordModalOpen.value = true;
};

const handleDelete = async (id: string) => {
  if (confirm('Deseja excluir este registro?')) {
    await syncManager.deleteRecordLocally(id);
    await loadData();
  }
};

const handleSaveRecord = async (formData: any) => {
  await syncManager.saveRecordLocally(formData);
  await loadData();
  closeRecordModal();
};
</script>
