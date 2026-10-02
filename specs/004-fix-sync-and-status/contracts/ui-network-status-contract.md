# Contract: UI Network & Sync Status Interface

**Feature Branch**: `004-fix-sync-and-status`
**Domain**: Frontend Web / PWA Client Composables & Components

## 1. Composable: `useNetworkStatus()`

### Interface TypeScript
```typescript
export interface NetworkStatus {
  /** Indica se o navegador possui conectividade com a rede */
  isOnline: Ref<boolean>;
  /** Indica se uma requisição de sincronização está em processamento */
  isSyncing: Ref<boolean>;
  /** Quantidade total de operações pendentes na fila local */
  pendingCount: Ref<number>;
  /** Timestamp da última sincronização com sucesso */
  lastSyncTime: Ref<Date | null>;
  /** Força o disparo manual da rotina de sincronização */
  syncNow: () => Promise<void>;
  /** Atualiza a contagem de itens pendentes no IndexedDB */
  refreshPendingCount: () => Promise<number>;
}
```

### Comportamento & Eventos
- Ouve `window.addEventListener('online')`:
  - Atualiza `isOnline.value = true`.
  - Dispara automaticamente `syncNow()`.
- Ouve `window.addEventListener('offline')`:
  - Atualiza `isOnline.value = false`.
  - Atualiza `refreshPendingCount()`.

---

## 2. Componentes de Apresentação

### Componente: `ConnectionStatusBadge.vue`
Exibido no cabeçalho mobile (`AppLayout.vue`) e na barra lateral desktop (`DesktopSidebar.vue`).

| Estado | Indicador Visual | Rótulo de Texto | Tooltip / Acessibilidade |
| :--- | :--- | :--- | :--- |
| **Online & Sincronizado** | Ponto verde pulsante suave | `Online` | "Conectado e dados sincronizados" |
| **Sincronizando** | Ícone giratório / ponto azul pulsante | `Sincronizando...` | "Sincronizando dados com o servidor" |
| **Offline (sem pendências)** | Ponto âmbar | `Offline` | "Modo offline - salvando localmente" |
| **Offline (com pendências)** | Ponto âmbar + contador (`N`) | `Offline (N)` | "N alterações pendentes de sincronização" |

### Componente: `OfflineNotificationBanner.vue`
Exibido de forma elegante e discreta no topo da área principal de conteúdo (`<main>` em `AppLayout.vue`) quando `!isOnline`.

- **Estilo**: Barra compacta com fundo âmbar/dourado suave, bordas arredondadas e contraste AA.
- **Mensagem**: *"Você está offline. Novos registros, edições e exclusões são salvos localmente e serão sincronizados automaticamente assim que você reconectar."*
- **Ações**: Botão discreto para tentar reconectar / sincronizar agora.
