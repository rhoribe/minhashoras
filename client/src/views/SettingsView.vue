<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-xl sm:text-2xl font-extrabold text-app-text-primary tracking-tight">Configurações</h2>
      <p class="text-xs sm:text-sm text-app-text-muted">Defina os limites, tema e preferências do seu banco de horas</p>
    </div>

    <!-- Alert Message -->
    <div v-if="saveSuccess" class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm">
      <CheckCircle2 class="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>Configurações salvas com sucesso!</span>
    </div>

    <form @submit.prevent="saveSettings">
      <!-- Responsive 2-column layout on desktop (>= 1024px) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Left Column: User Profile & Limits -->
        <div class="space-y-6">
          <!-- Section: User Account (Multi-User) -->
          <div v-if="authState.isAuthenticated.value" class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
            <h3 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <UserIcon class="w-4 h-4" />
              Sua Conta
            </h3>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-base font-bold text-app-text-primary">{{ authState.displayName.value }}</p>
                <p class="text-xs text-app-text-muted">@{{ authState.user.value?.username }} • {{ authState.user.value?.email }}</p>
              </div>
              <button
                type="button"
                @click="handleLogout"
                class="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 min-h-touch min-w-touch transition-colors cursor-pointer"
              >
                Sair
              </button>
            </div>

            <!-- Alert for Personal Operations (Backup / Reset) -->
            <div
              v-if="personalBackupMessage"
              :class="[
                'p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2.5 shadow-sm border',
                personalBackupMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <CheckCircle2 v-if="personalBackupMessage.type === 'success'" class="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <AlertCircle v-else class="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{{ personalBackupMessage.text }}</span>
              </div>
            </div>

            <!-- Actions Row: Alterar Senha & Baixar Meu Backup Pessoal -->
            <div class="pt-3 border-t border-app-border grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="openChangePasswordModal"
                class="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-app-text-primary text-xs font-semibold border border-app-border flex items-center justify-center gap-2 min-h-touch min-w-touch transition-colors cursor-pointer"
              >
                <KeyRound class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Alterar Senha
              </button>

              <button
                type="button"
                @click="handleDownloadPersonalBackup"
                :disabled="isDownloadingPersonalBackup"
                class="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-2 min-h-touch min-w-touch transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw v-if="isDownloadingPersonalBackup" class="w-4 h-4 animate-spin" />
                <Download v-else class="w-4 h-4" />
                <span>{{ isDownloadingPersonalBackup ? 'Exportando...' : 'Backup Pessoal (JSON)' }}</span>
              </button>
            </div>

            <!-- Danger Zone: Zerar Registros e Excluir Conta -->
            <div class="pt-4 border-t border-app-border space-y-3">
              <h4 class="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Zona de Gerenciamento de Dados
              </h4>

              <!-- Zerar Meus Registros -->
              <div class="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 class="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <RotateCcw class="w-3.5 h-3.5" />
                    Zerar Meus Registros
                  </h5>
                  <p class="text-[11px] text-app-text-muted mt-0.5">
                    Apaga apenas suas horas e compensações, zerando o saldo. Mantém sua conta intacta.
                  </p>
                </div>
                <button
                  type="button"
                  @click="openResetRecordsModal"
                  class="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold min-h-touch min-w-touch transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  Zerar Registros
                </button>
              </div>

              <!-- Excluir Minha Conta -->
              <div class="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 class="text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
                    <Trash2 class="w-3.5 h-3.5" />
                    Excluir Minha Conta
                  </h5>
                  <p class="text-[11px] text-app-text-muted mt-0.5">
                    Apaga permanentemente seu usuário, horas extras e dados deste dispositivo.
                  </p>
                </div>
                <button
                  type="button"
                  @click="openDeleteAccountModal"
                  class="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold min-h-touch min-w-touch transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  Excluir Dados
                </button>
              </div>
            </div>
          </div>

          <!-- Section: Safety Limits -->
          <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-5">
            <h3 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert class="w-4 h-4" />
              Limites de Segurança do Banco
            </h3>

            <!-- Max Positive Limit -->
            <div>
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
                Limite Máximo Positivo (horas de teto)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="positiveHours"
                  type="number"
                  min="1"
                  max="200"
                  required
                  class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
                />
                <span class="text-xs text-app-text-muted font-medium whitespace-nowrap">horas</span>
              </div>
              <span class="text-[11px] text-app-text-muted mt-1 block">Equivale a +{{ positiveHours * 60 }} minutos acumuláveis.</span>
            </div>

            <!-- Max Negative Limit -->
            <div>
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
                Limite Máximo Negativo (tolerância de débito)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="negativeHours"
                  type="number"
                  min="0"
                  max="100"
                  required
                  class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
                />
                <span class="text-xs text-app-text-muted font-medium whitespace-nowrap">horas</span>
              </div>
              <span class="text-[11px] text-app-text-muted mt-1 block">Limite tolerado de déficit: -{{ negativeHours * 60 }} minutos.</span>
            </div>

            <!-- Warning Threshold Percentage -->
            <div>
              <div class="flex justify-between items-center mb-1.5">
                <label class="text-xs font-semibold text-app-text-primary">
                  Gatilho de Alerta Preventivo
                </label>
                <span class="text-xs font-bold text-amber-600 dark:text-amber-400">{{ warningPercentage }}% do limite</span>
              </div>
              <input
                v-model.number="warningPercentage"
                type="range"
                min="50"
                max="95"
                step="5"
                class="w-full accent-emerald-500 cursor-pointer"
              />
              <span class="text-[11px] text-app-text-muted mt-1 block">
                Um alerta será exibido assim que você acumular {{ Math.round((positiveHours * warningPercentage) / 100) }} horas extras.
              </span>
            </div>
          </div>
        </div>

        <!-- Right Column: Appearance, Notifications & Action -->
        <div class="space-y-6">
          <!-- Section: Appearance & Theming -->
          <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
            <h3 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Palette class="w-4 h-4" />
              Aparência do Aplicativo
            </h3>
            <p class="text-xs text-app-text-muted">
              Alterne entre temas claro, escuro ou automático do dispositivo
            </p>
            <div class="pt-1">
              <ThemeToggle />
            </div>
          </div>

          <!-- Section: Notifications & Reminders -->
          <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
            <h3 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Bell class="w-4 h-4" />
              Notificações e Lembretes
            </h3>

            <!-- Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm font-semibold text-app-text-primary block">Ativar Notificações</span>
                <span class="text-xs text-app-text-muted">Avisos de limite e lembretes diários</span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer min-h-touch">
                <input v-model="notificationsEnabled" type="checkbox" class="sr-only peer" />
                <div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <!-- Reminder Time -->
            <div v-if="notificationsEnabled">
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">Horário do Lembrete Diário</label>
              <input
                v-model="reminderTime"
                type="time"
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isSaving"
            class="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition active:scale-[0.98] min-h-touch cursor-pointer"
          >
            {{ isSaving ? 'Salvando...' : 'Salvar Configurações' }}
          </button>
        </div>
      </div>
    </form>

    <!-- Section: Backup & External Data Export (Feature 005 - Admin Only) -->
    <div v-if="authState.isAdmin.value" class="mt-8 pt-8 border-t border-app-border space-y-6">
      <div>
        <h3 class="text-lg sm:text-xl font-bold text-app-text-primary tracking-tight flex items-center gap-2">
          <HardDrive class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Backup & Exportação de Dados
        </h3>
        <p class="text-xs sm:text-sm text-app-text-muted">
          Exporte snapshots consistentes da base SQLite para volumes externos e programe rotinas automáticas com retenção
        </p>
      </div>

      <!-- Offline Sync Notice (Constitution Principle II) -->
      <div class="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-sm">
        <AlertCircle class="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <span class="font-semibold block mb-0.5">Aviso sobre Sincronização:</span>
          <span>O backup exporta os dados consolidados no servidor central. Se você realizou apontamentos offline neste navegador, certifique-se de sincronizá-los antes de efetuar o backup para que constem no arquivo.</span>
        </div>
      </div>

      <!-- Alert for Backup Operations -->
      <div v-if="backupMessage" :class="[
        'p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-2.5 shadow-sm border',
        backupMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
      ]">
        <div class="flex items-center gap-2.5">
          <CheckCircle2 v-if="backupMessage.type === 'success'" class="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <AlertCircle v-else class="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
          <span>{{ backupMessage.text }}</span>
        </div>
        <button
          v-if="backupMessage.downloadId"
          type="button"
          @click="handleDownloadBackup(backupMessage.downloadId)"
          class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 min-h-touch flex items-center gap-1.5"
        >
          <Download class="w-3.5 h-3.5" />
          Baixar Agora
        </button>
      </div>

      <!-- Grid: Manual Export & Schedule Routine -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <!-- Card 1: Disparo Manual sob Demanda (US2) -->
        <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
          <h4 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Download class="w-4 h-4" />
            Disparo Manual sob Demanda
          </h4>
          <p class="text-xs text-app-text-muted">
            Gera imediatamente uma cópia consistente compactada (.sqlite.gz) com verificação de integridade e hash SHA-256.
          </p>

          <div class="p-3.5 rounded-2xl bg-app-bg border border-app-border space-y-2 text-xs">
            <div class="flex justify-between items-center text-app-text-muted">
              <span>Status do Mecanismo:</span>
              <span class="font-semibold" :class="backupStatus?.isRunning ? 'text-amber-500' : 'text-emerald-500'">
                {{ backupStatus?.isRunning ? 'Executando backup...' : 'Ocioso (Pronto)' }}
              </span>
            </div>
            <div class="flex justify-between items-center text-app-text-muted">
              <span>Diretório de Armazenamento:</span>
              <span class="font-mono text-[11px] text-app-text-primary truncate max-w-[200px]" :title="backupStatus?.backupDirectory">
                {{ backupStatus?.backupDirectory || '/backups' }}
              </span>
            </div>
          </div>

          <button
            type="button"
            @click="handleManualBackup"
            :disabled="isBackingUp || backupStatus?.isRunning"
            class="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition active:scale-[0.98] min-h-touch cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw v-if="isBackingUp" class="w-4 h-4 animate-spin" />
            <Download v-else class="w-4 h-4" />
            <span>{{ isBackingUp ? 'Gerando backup consistente...' : 'Fazer Backup Agora' }}</span>
          </button>
        </div>

        <!-- Card 2: Rotina Programada e Retenção (US1 & US3) -->
        <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-5">
          <h4 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Clock class="w-4 h-4" />
            Rotina Automática & Retenção
          </h4>

          <!-- Enabled Toggle -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm font-semibold text-app-text-primary block">Ativar Backup Automático</span>
              <span class="text-xs text-app-text-muted">Execução autônoma em segundo plano</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer min-h-touch">
              <input v-model="scheduleForm.enabled" type="checkbox" class="sr-only peer" />
              <div class="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div v-if="scheduleForm.enabled" class="space-y-4 pt-1">
            <!-- Frequency Selector -->
            <div>
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">Frequência</label>
              <select
                v-model="scheduleForm.frequency"
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
              >
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>

            <!-- Time of Day -->
            <div>
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">Horário da Execução</label>
              <input
                v-model="scheduleForm.timeOfDay"
                type="time"
                required
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
              />
            </div>

            <!-- Day of Week (Weekly) -->
            <div v-if="scheduleForm.frequency === 'weekly'">
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">Dia da Semana</label>
              <select
                v-model.number="scheduleForm.dayOfWeek"
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
              >
                <option :value="0">Domingo</option>
                <option :value="1">Segunda-feira</option>
                <option :value="2">Terça-feira</option>
                <option :value="3">Quarta-feira</option>
                <option :value="4">Quinta-feira</option>
                <option :value="5">Sexta-feira</option>
                <option :value="6">Sábado</option>
              </select>
            </div>

            <!-- Day of Month (Monthly) -->
            <div v-if="scheduleForm.frequency === 'monthly'">
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">Dia do Mês (1 a 31)</label>
              <input
                v-model.number="scheduleForm.dayOfMonth"
                type="number"
                min="1"
                max="31"
                required
                class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
              />
            </div>

            <!-- Retention Count -->
            <div>
              <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
                Política de Retenção (cópias mantidas no disco)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="scheduleForm.retentionCount"
                  type="number"
                  min="1"
                  max="100"
                  required
                  class="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2.5 text-app-text-primary text-sm focus:outline-none focus:border-emerald-500 min-h-touch"
                />
                <span class="text-xs text-app-text-muted font-medium whitespace-nowrap">arquivos</span>
              </div>
              <span class="text-[11px] text-app-text-muted mt-1 block">
                Arquivos mais antigos além de {{ scheduleForm.retentionCount }} cópias serão expurgados automaticamente após cada execução bem-sucedida.
              </span>
            </div>

            <!-- Next Run Preview -->
            <div v-if="currentSchedule?.nextRunAt" class="text-xs text-app-text-muted flex items-center gap-1.5">
              <Calendar class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Próxima execução: <strong class="text-app-text-primary">{{ formatDate(currentSchedule.nextRunAt) }}</strong></span>
            </div>
          </div>

          <button
            type="button"
            @click="handleSaveSchedule"
            :disabled="isSavingSchedule"
            class="w-full py-3 px-4 rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs transition active:scale-[0.98] min-h-touch cursor-pointer"
          >
            {{ isSavingSchedule ? 'Salvando rotina...' : 'Salvar Rotina de Backup' }}
          </button>
        </div>
      </div>

      <!-- Card 3: Histórico de Execuções e Integridade (US4) -->
      <div class="p-5 sm:p-6 rounded-3xl bg-app-surface border border-app-border shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck class="w-4 h-4" />
            Histórico de Backups e Auditoria
          </h4>
          <button
            type="button"
            @click="loadBackupHistory"
            :disabled="isLoadingHistory"
            class="p-2 rounded-xl text-app-text-muted hover:text-app-text-primary hover:bg-app-bg transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Atualizar histórico"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoadingHistory }" />
          </button>

        </div>

        <div v-if="backupRuns.length === 0" class="text-center py-8 text-xs text-app-text-muted">
          Nenhuma execução de backup registrada até o momento.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="run in backupRuns"
            :key="run.id"
            class="p-3.5 sm:p-4 rounded-2xl bg-app-bg border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-app-text-primary">
                  {{ formatDate(run.startedAt) }}
                </span>
                <span :class="[
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  run.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                  run.status === 'purged' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                  run.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                ]">
                  {{ run.status === 'completed' ? 'Sucesso' : run.status === 'purged' ? 'Expurgado' : run.status === 'failed' ? 'Falha' : 'Em andamento' }}
                </span>
                <span class="text-[11px] text-app-text-muted capitalize">
                  ({{ run.triggerType === 'automated' ? 'Automático' : 'Manual' }})
                </span>
              </div>

              <div class="text-[11px] text-app-text-muted flex items-center gap-3 flex-wrap">
                <span v-if="run.fileSizeBytes">Tamanho: <strong class="text-app-text-primary">{{ formatBytes(run.fileSizeBytes) }}</strong></span>
                <span v-if="run.recordsCount !== null">Registros: <strong class="text-app-text-primary">{{ run.recordsCount }}</strong></span>
                <span v-if="run.checksumSha256" class="font-mono text-[10px] truncate max-w-[220px]" :title="'SHA-256: ' + run.checksumSha256">
                  SHA-256: {{ run.checksumSha256.substring(0, 12) }}...
                </span>
              </div>

              <div v-if="run.errorMessage" class="text-red-500 dark:text-red-400 text-[11px]">
                Erro: {{ run.errorMessage }}
              </div>
            </div>

            <div class="sm:self-center shrink-0 flex items-center gap-2">
              <button
                v-if="run.status === 'completed'"
                type="button"
                @click="handleDownloadBackup(run.id, run.fileName || undefined)"
                class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-app-text-primary font-semibold text-xs flex items-center justify-center gap-1.5 min-h-touch min-w-[70px] cursor-pointer shadow-xs transition"
                title="Baixar arquivo de backup"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Baixar</span>
              </button>

              <button
                v-if="run.status === 'completed'"
                type="button"
                @click="openRestoreModal(run)"
                :disabled="isRestoring || isBackingUp"
                class="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 min-h-touch min-w-[80px] cursor-pointer shadow-xs transition"
                title="Restaurar banco de dados a partir deste backup"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Restaurar</span>
              </button>

              <span v-else-if="run.status === 'purged'" class="text-[11px] text-app-text-muted italic">
                Arquivo removido por retenção
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmação de Restauração (US3) -->
    <div
      v-if="restoreModalTarget"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        class="bg-app-surface border border-app-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-modal-title"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <div class="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/80">
              <AlertTriangle class="w-6 h-6 shrink-0" />
            </div>
            <h3 id="restore-modal-title" class="font-bold text-base text-app-text-primary">
              Restaurar Banco de Dados
            </h3>
          </div>
          <button
            type="button"
            @click="closeRestoreModal"
            :disabled="isRestoring"
            class="p-2 rounded-xl text-app-text-muted hover:text-app-text-primary hover:bg-app-bg transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs text-app-text-muted leading-relaxed">
          <p>
            Você está prestes a restaurar os dados do sistema a partir do backup selecionado:
          </p>
          <div class="p-3.5 rounded-2xl bg-app-bg border border-app-border space-y-1.5 font-mono text-[11px] text-app-text-primary">
            <div><strong>Data:</strong> {{ formatDate(restoreModalTarget.startedAt) }}</div>
            <div class="truncate"><strong>Arquivo:</strong> {{ restoreModalTarget.fileName || 'backup.sqlite.gz' }}</div>
            <div v-if="restoreModalTarget.recordsCount !== null"><strong>Registros:</strong> {{ restoreModalTarget.recordsCount }}</div>
            <div v-if="restoreModalTarget.fileSizeBytes"><strong>Tamanho:</strong> {{ formatBytes(restoreModalTarget.fileSizeBytes) }}</div>
          </div>

          <div class="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 space-y-1.5">
            <p class="font-semibold flex items-center gap-1.5">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>Aviso Importante:</span>
            </p>
            <ul class="list-disc list-inside space-y-1 text-[11px]">
              <li>Todos os dados posteriores a este backup serão substituídos pelo conteúdo deste arquivo.</li>
              <li>Um backup de segurança do estado atual será criado automaticamente antes da restauração.</li>
              <li>Certifique-se de sincronizar eventuais apontamentos offline deste dispositivo antes de continuar.</li>
            </ul>
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            @click="closeRestoreModal"
            :disabled="isRestoring"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-app-border hover:bg-app-bg text-app-text-primary font-semibold text-xs transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleConfirmRestore"
            :disabled="isRestoring"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition min-h-touch min-w-touch flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw v-if="isRestoring" class="w-4 h-4 animate-spin" />
            <RotateCcw v-else class="w-4 h-4" />
            <span>{{ isRestoring ? 'Restaurando banco...' : 'Confirmar Restauração' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmação de Exclusão de Conta (US3) -->
    <div
      v-if="showDeleteAccountModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        class="bg-app-surface border border-red-200 dark:border-red-900/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-modal-title"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 text-red-600 dark:text-red-400">
            <div class="p-2 rounded-2xl bg-red-100 dark:bg-red-950/80">
              <AlertTriangle class="w-6 h-6 shrink-0" />
            </div>
            <h3 id="delete-account-modal-title" class="font-bold text-base text-app-text-primary">
              Excluir Minha Conta Definitivamente
            </h3>
          </div>
          <button
            type="button"
            @click="closeDeleteAccountModal"
            :disabled="isDeletingAccount"
            class="p-2 rounded-xl text-app-text-muted hover:text-app-text-primary hover:bg-app-bg transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error Banner inside modal -->
        <div
          v-if="deleteAccountError"
          class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ deleteAccountError }}</span>
        </div>

        <div class="space-y-3 text-xs text-app-text-muted leading-relaxed">
          <p>
            Você está prestes a excluir a conta <strong class="text-app-text-primary">@{{ authState.user.value?.username }}</strong>.
          </p>

          <div class="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-300 space-y-2">
            <p class="font-semibold flex items-center gap-1.5">
              <AlertCircle class="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>Atenção: Ação Permanente e Irreversível</span>
            </p>
            <ul class="list-disc list-inside space-y-1 text-[11px]">
              <li>Todos os seus registros de horas extras serão apagados do servidor.</li>
              <li>Todas as suas compensações e limites programados serão apagados.</li>
              <li>O banco de dados local armazenado neste navegador será limpo.</li>
              <li>Sua sessão será encerrada e sua conta deixará de existir.</li>
            </ul>
          </div>

          <label class="flex items-start gap-2.5 p-3 rounded-2xl bg-app-bg border border-app-border cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="deleteAccountConfirmed"
              class="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-app-border"
            />
            <span class="text-xs text-app-text-primary font-medium">
              Tenho certeza de que desejo apagar minha conta e todos os meus dados definitivamente.
            </span>
          </label>
        </div>

        <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            @click="closeDeleteAccountModal"
            :disabled="isDeletingAccount"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-app-border hover:bg-app-bg text-app-text-primary font-semibold text-xs transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleConfirmDeleteAccount"
            :disabled="!deleteAccountConfirmed || isDeletingAccount"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-red-600/30 transition min-h-touch min-w-touch flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw v-if="isDeletingAccount" class="w-4 h-4 animate-spin" />
            <Trash2 v-else class="w-4 h-4" />
            <span>{{ isDeletingAccount ? 'Excluindo todos os dados...' : 'Confirmar Exclusão' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Alterar Senha (Feature 011 - US2) -->
    <div
      v-if="showChangePasswordModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        class="bg-app-surface border border-app-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-modal-title"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <div class="p-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80">
              <KeyRound class="w-6 h-6 shrink-0" />
            </div>
            <h3 id="change-password-modal-title" class="font-bold text-base text-app-text-primary">
              Alterar Senha
            </h3>
          </div>
          <button
            type="button"
            @click="closeChangePasswordModal"
            :disabled="isChangingPassword"
            class="p-2 rounded-xl text-app-text-muted hover:text-app-text-primary hover:bg-app-bg transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error Banner inside modal -->
        <div
          v-if="changePasswordError"
          class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ changePasswordError }}</span>
        </div>

        <!-- Success Banner inside modal -->
        <div
          v-if="changePasswordSuccess"
          class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start space-x-2"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ changePasswordSuccess }}</span>
        </div>

        <form @submit.prevent="handleSubmitChangePassword" class="space-y-4">
          <!-- Current Password -->
          <div>
            <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
              Senha Atual
            </label>
            <div class="relative">
              <input
                v-model="changePasswordCurrent"
                :type="showPasswordCurrent ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Informe sua senha atual"
                class="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-bg text-app-text-primary placeholder-app-text-muted focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors pr-10 text-sm"
              />
              <button
                type="button"
                @click="showPasswordCurrent = !showPasswordCurrent"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-app-text-muted hover:text-app-text-primary min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
                :title="showPasswordCurrent ? 'Ocultar' : 'Exibir'"
              >
                <EyeOff v-if="showPasswordCurrent" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
              Nova Senha
            </label>
            <div class="relative">
              <input
                v-model="changePasswordNew"
                :type="showPasswordNew ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="Mínimo 8 caracteres (letras e números)"
                class="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-bg text-app-text-primary placeholder-app-text-muted focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors pr-10 text-sm"
              />
              <button
                type="button"
                @click="showPasswordNew = !showPasswordNew"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-app-text-muted hover:text-app-text-primary min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
                :title="showPasswordNew ? 'Ocultar' : 'Exibir'"
              >
                <EyeOff v-if="showPasswordNew" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>

            <!-- Password Requirements Badges -->
            <div class="mt-2 space-y-1 text-[11px]">
              <div class="flex items-center gap-1.5" :class="changePasswordNew.length >= 8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-app-text-muted'">
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>Pelo menos 8 caracteres</span>
              </div>
              <div class="flex items-center gap-1.5" :class="/[A-Za-z]/.test(changePasswordNew) && /[0-9]/.test(changePasswordNew) ? 'text-emerald-600 dark:text-emerald-400' : 'text-app-text-muted'">
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>Contém letras e números</span>
              </div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
              Confirmar Nova Senha
            </label>
            <div class="relative">
              <input
                v-model="changePasswordConfirm"
                :type="showPasswordConfirm ? 'text' : 'password'"
                required
                autocomplete="new-password"
                placeholder="Repita a nova senha"
                class="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-bg text-app-text-primary placeholder-app-text-muted focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-touch transition-colors pr-10 text-sm"
              />
              <button
                type="button"
                @click="showPasswordConfirm = !showPasswordConfirm"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-app-text-muted hover:text-app-text-primary min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
                :title="showPasswordConfirm ? 'Ocultar' : 'Exibir'"
              >
                <EyeOff v-if="showPasswordConfirm" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <div v-if="changePasswordConfirm && changePasswordNew !== changePasswordConfirm" class="mt-1.5 text-[11px] text-red-500">
              As senhas não coincidem.
            </div>
          </div>

          <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              @click="closeChangePasswordModal"
              :disabled="isChangingPassword"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-app-border hover:bg-app-bg text-app-text-primary font-semibold text-xs transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="!isChangePasswordValid || isChangingPassword"
              class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition min-h-touch min-w-touch flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw v-if="isChangingPassword" class="w-4 h-4 animate-spin" />
              <KeyRound v-else class="w-4 h-4" />
              <span>{{ isChangingPassword ? 'Salvando...' : 'Atualizar Senha' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Confirmação de Zerar Registros (Feature 011 - US3) -->
    <div
      v-if="showResetRecordsModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        class="bg-app-surface border border-amber-200 dark:border-amber-900/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-records-modal-title"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <div class="p-2 rounded-2xl bg-amber-100 dark:bg-amber-950/80">
              <AlertTriangle class="w-6 h-6 shrink-0" />
            </div>
            <h3 id="reset-records-modal-title" class="font-bold text-base text-app-text-primary">
              Zerar Meus Registros
            </h3>
          </div>
          <button
            type="button"
            @click="closeResetRecordsModal"
            :disabled="isResettingRecords"
            class="p-2 rounded-xl text-app-text-muted hover:text-app-text-primary hover:bg-app-bg transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error Banner inside modal -->
        <div
          v-if="resetRecordsError"
          class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2"
        >
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{{ resetRecordsError }}</span>
        </div>

        <div class="space-y-3 text-xs text-app-text-muted leading-relaxed">
          <p>
            Você está prestes a zerar o histórico de horas da conta <strong class="text-app-text-primary">@{{ authState.user.value?.username }}</strong>.
          </p>

          <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 space-y-2">
            <p class="font-semibold flex items-center gap-1.5">
              <AlertCircle class="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>O que será alterado:</span>
            </p>
            <ul class="list-disc list-inside space-y-1 text-[11px]">
              <li>Todos os registros de horas extras serão permanentemente excluídos.</li>
              <li>Todas as compensações agendadas e concluídas serão removidas.</li>
              <li>Seu saldo líquido e projetado retornará a 0 horas.</li>
              <li><strong>Sua conta de usuário (@{{ authState.user.value?.username }}) e login NÃO serão afetados.</strong></li>
            </ul>
          </div>

          <div>
            <label class="block text-xs font-semibold text-app-text-primary mb-1.5">
              Digite <span class="font-mono text-amber-600 dark:text-amber-400 font-bold select-all">ZERAR-MEUS-REGISTROS</span> para confirmar:
            </label>
            <input
              v-model="resetRecordsConfirmation"
              type="text"
              placeholder="ZERAR-MEUS-REGISTROS"
              class="w-full px-3.5 py-2.5 rounded-xl border border-app-border bg-app-bg text-app-text-primary placeholder-app-text-muted focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-touch font-mono text-sm"
            />
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            @click="closeResetRecordsModal"
            :disabled="isResettingRecords"
            class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-app-border hover:bg-app-bg text-app-text-primary font-semibold text-xs transition min-h-touch min-w-touch flex items-center justify-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleConfirmResetRecords"
            :disabled="resetRecordsConfirmation !== 'ZERAR-MEUS-REGISTROS' || isResettingRecords"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-amber-600/30 transition min-h-touch min-w-touch flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw v-if="isResettingRecords" class="w-4 h-4 animate-spin" />
            <RotateCcw v-else class="w-4 h-4" />
            <span>{{ isResettingRecords ? 'Zerando registros...' : 'Zerar Registros' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  ShieldAlert,
  Bell,
  CheckCircle2,
  Palette,
  User as UserIcon,
  HardDrive,
  Download,
  RefreshCw,
  Clock,
  Calendar,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  AlertTriangle,
  Trash2,
  X,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-vue-next';
import ThemeToggle from '../components/layout/ThemeToggle.vue';
import { notificationService } from '../services/notifications.js';
import { authState, getAuthHeader, logout, deleteSelfAccount, changePassword } from '../services/auth.js';
import { clearAllLocalData } from '../services/db.js';
import { exportPersonalBackup, resetPersonalRecords } from '../services/user-api.js';
import {
  getBackupSchedule,
  updateBackupSchedule,
  triggerManualBackup,
  getBackupStatus,
  getBackupHistory,
  downloadBackup,
  restoreBackup,
  BackupSchedule,
  BackupRun,
  BackupStatus,
} from '../services/backup-api.js';

const router = useRouter();
const positiveHours = ref(40);
const negativeHours = ref(10);
const warningPercentage = ref(80);
const notificationsEnabled = ref(true);
const reminderTime = ref('18:00');
const isSaving = ref(false);
const saveSuccess = ref(false);

// Backup State (Feature 005 & 007)
const backupStatus = ref<BackupStatus | null>(null);
const currentSchedule = ref<BackupSchedule | null>(null);
const backupRuns = ref<BackupRun[]>([]);
const isBackingUp = ref(false);
const isSavingSchedule = ref(false);
const isLoadingHistory = ref(false);
const isRestoring = ref(false);
const restoreModalTarget = ref<BackupRun | null>(null);
const backupMessage = ref<{ type: 'success' | 'error'; text: string; downloadId?: string } | null>(null);


const scheduleForm = ref<{
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  timeOfDay: string;
  dayOfWeek: number;
  dayOfMonth: number;
  retentionCount: number;
}>({
  enabled: false,
  frequency: 'daily',
  timeOfDay: '02:00',
  dayOfWeek: 0,
  dayOfMonth: 1,
  retentionCount: 7,
});

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

async function loadBackupScheduleData() {
  try {
    const schedule = await getBackupSchedule();
    currentSchedule.value = schedule;
    scheduleForm.value = {
      enabled: schedule.enabled,
      frequency: schedule.frequency,
      timeOfDay: schedule.timeOfDay || '02:00',
      dayOfWeek: schedule.dayOfWeek !== null && schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 0,
      dayOfMonth: schedule.dayOfMonth !== null && schedule.dayOfMonth !== undefined ? schedule.dayOfMonth : 1,
      retentionCount: schedule.retentionCount || 7,
    };
  } catch (err: any) {
    console.warn('Could not load backup schedule:', err);
  }
}

async function loadBackupStatusData() {
  try {
    backupStatus.value = await getBackupStatus();
  } catch (err: any) {
    console.warn('Could not load backup status:', err);
  }
}

async function loadBackupHistory() {
  isLoadingHistory.value = true;
  try {
    const data = await getBackupHistory(20, 0);
    backupRuns.value = data.runs;
  } catch (err: any) {
    console.warn('Could not load backup history:', err);
  } finally {
    isLoadingHistory.value = false;
  }
}

function openRestoreModal(run: BackupRun) {
  restoreModalTarget.value = run;
}

function closeRestoreModal() {
  if (isRestoring.value) return;
  restoreModalTarget.value = null;
}

async function handleConfirmRestore() {
  if (!restoreModalTarget.value) return;
  const target = restoreModalTarget.value;
  isRestoring.value = true;
  backupMessage.value = null;
  try {
    const result = await restoreBackup(target.id);
    closeRestoreModal();
    backupMessage.value = {
      type: 'success',
      text: `Banco de dados restaurado com sucesso para o estado de ${formatDate(target.startedAt)}!`,
    };
    await Promise.all([loadBackupStatusData(), loadBackupHistory()]);
  } catch (err: any) {
    backupMessage.value = {
      type: 'error',
      text: err.message || 'Falha ao restaurar banco de dados',
    };
  } finally {
    isRestoring.value = false;
  }
}


async function handleManualBackup() {
  if (isBackingUp.value || backupStatus.value?.isRunning) return;
  isBackingUp.value = true;
  backupMessage.value = null;
  try {
    const run = await triggerManualBackup();
    backupMessage.value = {
      type: 'success',
      text: `Backup gerado com sucesso! Arquivo: ${run.fileName || 'backup.sqlite.gz'}`,
      downloadId: run.id,
    };
    await Promise.all([loadBackupStatusData(), loadBackupHistory()]);
  } catch (err: any) {
    backupMessage.value = {
      type: 'error',
      text: err.message || 'Falha ao gerar backup manual',
    };
  } finally {
    isBackingUp.value = false;
  }
}

async function handleSaveSchedule() {
  isSavingSchedule.value = true;
  backupMessage.value = null;
  try {
    const updated = await updateBackupSchedule({
      enabled: scheduleForm.value.enabled,
      frequency: scheduleForm.value.frequency,
      timeOfDay: scheduleForm.value.timeOfDay,
      dayOfWeek: scheduleForm.value.frequency === 'weekly' ? scheduleForm.value.dayOfWeek : null,
      dayOfMonth: scheduleForm.value.frequency === 'monthly' ? scheduleForm.value.dayOfMonth : null,
      retentionCount: scheduleForm.value.retentionCount,
    });
    currentSchedule.value = updated;
    backupMessage.value = {
      type: 'success',
      text: 'Rotina de backup atualizada com sucesso!',
    };
    setTimeout(() => {
      if (backupMessage.value?.type === 'success' && !backupMessage.value.downloadId) {
        backupMessage.value = null;
      }
    }, 4000);
  } catch (err: any) {
    backupMessage.value = {
      type: 'error',
      text: err.message || 'Falha ao salvar rotina de backup',
    };
  } finally {
    isSavingSchedule.value = false;
  }
}

async function handleDownloadBackup(id: string, fileName?: string) {
  try {
    await downloadBackup(id, fileName);
  } catch (err: any) {
    alert(err.message || 'Erro ao realizar download do backup');
  }
}

// User Self-Service Deletion (Feature 010 - US3)
const isDeletingAccount = ref(false);
const showDeleteAccountModal = ref(false);
const deleteAccountConfirmed = ref(false);
const deleteAccountError = ref('');

function openDeleteAccountModal() {
  deleteAccountError.value = '';
  deleteAccountConfirmed.value = false;
  showDeleteAccountModal.value = true;
}

function closeDeleteAccountModal() {
  if (isDeletingAccount.value) return;
  showDeleteAccountModal.value = false;
  deleteAccountConfirmed.value = false;
  deleteAccountError.value = '';
}

async function handleConfirmDeleteAccount() {
  deleteAccountError.value = '';
  isDeletingAccount.value = true;
  try {
    const res = await deleteSelfAccount();
    if (res.success) {
      showDeleteAccountModal.value = false;
      await clearAllLocalData();
      router.push('/login');
    } else {
      deleteAccountError.value = res.message || 'Falha ao excluir a conta.';
    }
  } catch (err: any) {
    deleteAccountError.value = err.message || 'Erro inesperado ao excluir a conta.';
  } finally {
    isDeletingAccount.value = false;
  }
}

// Personal Data Backup (Feature 011 - US1)
const isDownloadingPersonalBackup = ref(false);
const personalBackupMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

async function handleDownloadPersonalBackup() {
  isDownloadingPersonalBackup.value = true;
  personalBackupMessage.value = null;
  try {
    await exportPersonalBackup();
    personalBackupMessage.value = {
      type: 'success',
      text: 'Backup pessoal baixado com sucesso!',
    };
    setTimeout(() => {
      if (personalBackupMessage.value?.type === 'success') {
        personalBackupMessage.value = null;
      }
    }, 4000);
  } catch (err: any) {
    personalBackupMessage.value = {
      type: 'error',
      text: err.message || 'Erro ao baixar backup pessoal.',
    };
  } finally {
    isDownloadingPersonalBackup.value = false;
  }
}

// Voluntary Self-Service Password Change (Feature 011 - US2)
const showChangePasswordModal = ref(false);
const changePasswordCurrent = ref('');
const changePasswordNew = ref('');
const changePasswordConfirm = ref('');
const showPasswordCurrent = ref(false);
const showPasswordNew = ref(false);
const showPasswordConfirm = ref(false);
const isChangingPassword = ref(false);
const changePasswordError = ref('');
const changePasswordSuccess = ref('');

const isChangePasswordValid = computed(() => {
  return (
    changePasswordCurrent.value.length > 0 &&
    changePasswordNew.value.length >= 8 &&
    /[A-Za-z]/.test(changePasswordNew.value) &&
    /[0-9]/.test(changePasswordNew.value) &&
    changePasswordNew.value === changePasswordConfirm.value
  );
});

function openChangePasswordModal() {
  changePasswordCurrent.value = '';
  changePasswordNew.value = '';
  changePasswordConfirm.value = '';
  changePasswordError.value = '';
  changePasswordSuccess.value = '';
  showPasswordCurrent.value = false;
  showPasswordNew.value = false;
  showPasswordConfirm.value = false;
  showChangePasswordModal.value = true;
}

function closeChangePasswordModal() {
  if (isChangingPassword.value) return;
  showChangePasswordModal.value = false;
  changePasswordError.value = '';
  changePasswordSuccess.value = '';
}

async function handleSubmitChangePassword() {
  if (!isChangePasswordValid.value) return;
  isChangingPassword.value = true;
  changePasswordError.value = '';
  changePasswordSuccess.value = '';

  try {
    const res = await changePassword(changePasswordNew.value, changePasswordCurrent.value);
    if (res.success) {
      changePasswordSuccess.value = 'Senha atualizada com sucesso!';
      setTimeout(() => {
        closeChangePasswordModal();
      }, 1500);
    } else {
      changePasswordError.value = res.message || 'Falha ao atualizar a senha.';
    }
  } catch (err: any) {
    changePasswordError.value = err.message || 'Erro inesperado ao atualizar a senha.';
  } finally {
    isChangingPassword.value = false;
  }
}

// Personal Records Reset (Feature 011 - US3)
const showResetRecordsModal = ref(false);
const resetRecordsConfirmation = ref('');
const isResettingRecords = ref(false);
const resetRecordsError = ref('');

function openResetRecordsModal() {
  resetRecordsConfirmation.value = '';
  resetRecordsError.value = '';
  showResetRecordsModal.value = true;
}

function closeResetRecordsModal() {
  if (isResettingRecords.value) return;
  showResetRecordsModal.value = false;
  resetRecordsConfirmation.value = '';
  resetRecordsError.value = '';
}

async function handleConfirmResetRecords() {
  if (resetRecordsConfirmation.value !== 'ZERAR-MEUS-REGISTROS') return;
  isResettingRecords.value = true;
  resetRecordsError.value = '';

  try {
    const userId = authState.user.value?.id || '';
    const res = await resetPersonalRecords(userId);
    if (res.success) {
      closeResetRecordsModal();
      personalBackupMessage.value = {
        type: 'success',
        text: `Registros zerados com sucesso! (${res.purgedRecordsCount} horas extras e ${res.purgedCompensationsCount} compensações limpas).`,
      };
      setTimeout(() => {
        if (personalBackupMessage.value?.type === 'success') {
          personalBackupMessage.value = null;
        }
      }, 5000);
    }
  } catch (err: any) {
    resetRecordsError.value = err.message || 'Erro ao zerar registros.';
  } finally {
    isResettingRecords.value = false;
  }
}

watch(notificationsEnabled, async (enabled) => {
  if (enabled) {
    const granted = await notificationService.requestPermission();
    if (!granted) {
      notificationsEnabled.value = false;
    }
  }
});

async function handleLogout() {
  await logout();
  router.push('/login');
}

const loadSettings = async () => {
  try {
    const res = await fetch('/api/v1/settings', {
      headers: getAuthHeader(),
    });
    if (res.ok) {
      const data = await res.json();
      positiveHours.value = Math.round(data.max_positive_limit_minutes / 60);
      negativeHours.value = Math.round(Math.abs(data.max_negative_limit_minutes) / 60);
      warningPercentage.value = data.warning_threshold_percentage;
      notificationsEnabled.value = data.notifications_enabled === 1 || data.notifications_enabled === true;
      reminderTime.value = data.daily_reminder_time || '18:00';
    }
  } catch (err) {
    console.warn('Could not load settings from server, using local defaults.');
  }
};

onMounted(() => {
  loadSettings();
  if (authState.isAdmin.value) {
    loadBackupScheduleData();
    loadBackupStatusData();
    loadBackupHistory();
  }
});

const saveSettings = async () => {
  isSaving.value = true;
  saveSuccess.value = false;
  try {
    const payload = {
      max_positive_limit_minutes: positiveHours.value * 60,
      max_negative_limit_minutes: -1 * Math.abs(negativeHours.value * 60),
      warning_threshold_percentage: warningPercentage.value,
      notifications_enabled: notificationsEnabled.value,
      daily_reminder_time: reminderTime.value,
    };

    const res = await fetch('/api/v1/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      saveSuccess.value = true;
      setTimeout(() => (saveSuccess.value = false), 4000);
    }
  } catch (err) {
    alert('Erro ao salvar configurações');
  } finally {
    isSaving.value = false;
  }
};
</script>
