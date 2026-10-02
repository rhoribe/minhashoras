# Implementation Plan: Sincronização Confiável e Status Online/Offline

**Branch**: `004-fix-sync-and-status` | **Date**: 2026-10-02 | **Spec**: [specs/004-fix-sync-and-status/spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-fix-sync-and-status/spec.md`

## Summary

Corrigir e aprimorar a arquitetura de sincronização do aplicativo Minhas Horas para garantir a consistência das operações de exclusão e edição de registros, e restaurar a visibilidade de status de conectividade (Online/Offline) e sincronização na interface. O plano contempla:
1. Suporte a IDs excluídos (`deleted_record_ids` e `deleted_compensation_ids`) no payload de `/api/v1/sync` e na fila do IndexedDB, garantindo que registros excluídos nunca ressuscitem em sincronizações ou chamadas de `pullFromServer`.
2. Resolução determinística de edições/atualizações (Last-Write-Wins baseado no carimbo do cliente `client_updated_at`), preservando dados recentes e evitando rejeições indevidas de conflito.
3. Criação de um composable e componentes de status de rede (`useNetworkStatus`, `ConnectionStatusBadge`, `OfflineNotificationBanner`), garantindo visibilidade clara do estado online/offline tanto em dispositivos móveis quanto em desktops, com feedback de operações pendentes.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 22+ (ES Modules)

**Primary Dependencies**: Fastify 4.28.1, `better-sqlite3` 11.8.1, Vue 3.5.13 (Composition API / `<script setup>`), `vue-router` 4.5.0, `dexie` 4.0.11, Tailwind CSS 3.4.17, `lucide-vue-next` 0.475.0, `vite-plugin-pwa` 0.21.1

**Storage**: SQLite 3 (WAL mode) no servidor via `better-sqlite3`; IndexedDB via Dexie v2 no cliente para cache e fila de mutações offline

**Testing**: Vitest 3.0.7 (Unit, Contract, Integration tests)

**Target Platform**: Mobile-first PWA (iOS WebKit / Android Chromium) + Desktop Web, self-hosted Docker no Raspberry Pi 4/5 (ARM64/AMD64)

**Project Type**: Two-tier Web Application (Fastify REST API server + Vite Vue 3 PWA client)

**Performance Goals**:
- Ciclo de sincronização de lote executado em < 100ms no servidor
- Atualização visual imediata (< 100ms) de mutações no cliente
- Detecção e transição de status online/offline em < 500ms

**Constraints**:
- Cumprimento rigoroso do Princípio II da Constituição (Offline-First Operation & Deterministic Sync)
- Nenhuma dependência externa adicional de npm necessária para gerenciamento de rede (utilizar eventos nativos do navegador)
- Compatibilidade retroativa com esquemas de banco e migrations existentes

**Scale/Scope**:
- Ambientes mono ou multiusuário (1 - 50 usuários por instância)
- Histórico típico de milhares de turnos de trabalho por usuário sem perda de performance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação / Restrição | Status | Notas |
| :--- | :--- | :---: | :--- |
| **I. Mobile-First & Cross-Platform PWA** | Elementos visíveis no mobile, touch targets >= 44x44px | **PASS** | Status de conectividade visível tanto no topo mobile quanto na barra lateral desktop; banners com margens acessíveis. |
| **II. Offline-First & Deterministic Sync** | Gravação offline garantida, protocolo determinístico e idempotente | **PASS** | Soluciona diretamente a falha de exclusão e edição; introduz confirmação por IDs e proteção contra ressurreição. |
| **III. Minimalist Architecture** | Baixo consumo de memória (< 200MB), sem runtimes pesados | **PASS** | Utiliza transação atômica existente no SQLite e composable nativo leve no Vue sem bibliotecas adicionais. |
| **IV. Reliable DB Persistence** | Transações ACID no SQLite, integridade de timestamps e saldos | **PASS** | Exclusões e atualizações ocorrem dentro de `db.transaction`, recalculando saldos de banco de horas imediatamente. |
| **V. Containerized Deployment** | Compatível com Docker e multi-arch `arm64`/`amd64` | **PASS** | Nenhuma dependência de sistema adicional; executa transparentemente em containers Alpine ARM64. |

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-sync-and-status/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 technology decisions & architecture
├── data-model.md        # Phase 1 data entities and relationship schemas
├── quickstart.md        # Phase 1 verification scenarios and run guide
├── contracts/           # Phase 1 API and interface contracts
│   ├── sync-contract.md
│   └── ui-network-status-contract.md
└── checklists/
    └── requirements.md
```

### Source Code (repository layout)

```text
client/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.vue                 # Adiciona ConnectionStatusBadge e OfflineNotificationBanner
│   │   │   ├── DesktopSidebar.vue            # Atualiza status badge compartilhado
│   │   │   ├── ConnectionStatusBadge.vue     # Componente unificado de status online/offline/sync
│   │   │   └── OfflineNotificationBanner.vue # Banner informativo de operação offline
│   │   └── records/
│   │       └── RecordList.vue                # Exibe badges de sincronizado / pendente por item
│   ├── composables/
│   │   └── useNetworkStatus.ts               # Composable reativo global de conectividade e fila
│   ├── services/
│   │   ├── db.ts                             # Tipos e esquemas Dexie
│   │   └── sync.ts                           # Correção do envio de exclusões e reconciliação em pull
│   └── views/
│       ├── RecordsView.vue
│       └── CompensationsView.vue
server/
├── src/
│   ├── repositories/
│   │   ├── records-repository.ts             # Comparação LWW corrigida e exclusão atômica
│   │   └── compensations-repository.ts       # Exclusão e reconciliação atômica
│   ├── routes/
│   │   └── sync.ts                           # Rota Fastify de sincronização em lote
│   └── services/
│       └── sync-service.ts                   # Processamento de deleted_record_ids e conflitos corrigidos
tests/
└── server/
    └── tests/
        └── contract/
            └── sync.test.ts                  # Testes automatizados de exclusão e edição via sync
```
