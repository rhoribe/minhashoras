<template>
  <!-- Install prompt banner if installable -->
  <div
    v-if="showBanner && !isInstalled"
    class="mx-4 mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-800/80 shadow-lg flex items-center justify-between z-20"
  >
    <div class="flex items-center gap-2.5">
      <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
        MH
      </div>
      <div>
        <h4 class="text-xs font-bold text-white">Instalar o Aplicativo</h4>
        <p class="text-[11px] text-slate-300">Acesso rápido e suporte offline direto no seu celular</p>
      </div>
    </div>
    <div class="flex items-center gap-1.5">
      <button
        @click="triggerInstall"
        class="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/50 transition active:scale-95 min-h-touch flex items-center justify-center cursor-pointer"
      >
        Instalar
      </button>
      <button
        @click="dismiss"
        class="w-11 h-11 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 flex items-center justify-center transition cursor-pointer"
        aria-label="Fechar banner de instalação"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>

  <!-- iOS Step-by-Step Instructions Modal -->
  <div v-if="showIosModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <Download class="w-4 h-4 text-emerald-400" />
          Como instalar no iPhone / iPad (iOS)
        </h3>
        <button
          @click="showIosModal = false"
          class="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white rounded-lg cursor-pointer"
          aria-label="Fechar instruções"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-3 text-xs text-slate-300">
        <div class="flex items-start gap-3 p-2.5 rounded-xl bg-slate-850 border border-slate-800">
          <span class="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
          <p>No navegador Safari, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com uma seta para cima na barra inferior).</p>
        </div>
        <div class="flex items-start gap-3 p-2.5 rounded-xl bg-slate-850 border border-slate-800">
          <span class="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
          <p>Role para baixo nas opções e selecione <strong>Adicionar à Tela de Início</strong>.</p>
        </div>
        <div class="flex items-start gap-3 p-2.5 rounded-xl bg-slate-850 border border-slate-800">
          <span class="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
          <p>Toque em <strong>Adicionar</strong> no canto superior direito para concluir. O app funcionará em tela cheia!</p>
        </div>
      </div>

      <button
        @click="showIosModal = false"
        class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition min-h-touch cursor-pointer"
      >
        Entendi
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Download, X } from 'lucide-vue-next';

const DISMISSED_STORAGE_KEY = 'minhas_horas_install_dismissed';

const deferredPrompt = ref<any>(null);
const showBanner = ref(false);
const showIosModal = ref(false);
const isInstalled = ref(false);

const isIos = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

const isInStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

onMounted(() => {
  isInstalled.value = isInStandaloneMode();

  // If already running in standalone mode, do not show install prompt
  if (isInstalled.value) {
    showBanner.value = false;
    return;
  }

  const dismissed = sessionStorage.getItem(DISMISSED_STORAGE_KEY);

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt.value = e;
    if (!dismissed) {
      showBanner.value = true;
    }
  });

  window.addEventListener('appinstalled', () => {
    isInstalled.value = true;
    showBanner.value = false;
    deferredPrompt.value = null;
  });

  // If on iOS and not yet in standalone mode, show install banner
  if (isIos() && !isInstalled.value && !dismissed) {
    showBanner.value = true;
  }
});

const triggerInstall = async () => {
  if (deferredPrompt.value) {
    try {
      deferredPrompt.value.prompt();
      const choice = await deferredPrompt.value.userChoice;
      if (choice && choice.outcome === 'accepted') {
        showBanner.value = false;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    deferredPrompt.value = null;
  } else if (isIos()) {
    showIosModal.value = true;
  }
};

const dismiss = () => {
  showBanner.value = false;
  try {
    sessionStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
  } catch {}
};
</script>
