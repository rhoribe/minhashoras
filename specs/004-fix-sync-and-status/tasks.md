# Tasks: Sincronização Confiável e Status Online/Offline

**Input**: Design documents from `/specs/004-fix-sync-and-status/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Test tasks are included per acceptance scenarios and verification requirements defined in [spec.md](./spec.md) and [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend client**: `client/src/`, `client/`
- **Backend server**: `server/src/`, `server/`
- **Tests**: `server/tests/`, `tests/client/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definir tipos de contratos de sincronização e composable de estado de rede

- [X] T001 [P] Update contract types in `server/src/services/sync-service.ts` to include `deleted_record_ids?: string[]` and `deleted_compensation_ids?: string[]` in `SyncBatchPayload` and `applied_deleted_record_ids: string[]`, `applied_deleted_compensation_ids: string[]` in `SyncBatchResult` per `specs/004-fix-sync-and-status/contracts/sync-contract.md`
- [X] T002 [P] Create network status composable `client/src/composables/useNetworkStatus.ts` exposing `isOnline`, `isSyncing`, `pendingCount`, `lastSyncTime`, `syncNow`, and `refreshPendingCount` per `specs/004-fix-sync-and-status/contracts/ui-network-status-contract.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Habilitar processamento de exclusões em lote no servidor e testes de contrato de sincronização

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Update `server/src/services/sync-service.ts` to process `deleted_record_ids` and `deleted_compensation_ids` within the SQLite transaction (`recordsRepository.delete(id, userId)` and `compensationsRepository.delete(id, userId)`), returning `applied_deleted_record_ids` and `applied_deleted_compensation_ids`
- [X] T004 [P] Update contract tests in `server/tests/contract/sync.test.ts` to verify deletion and edit batch sync payloads with assertions on `applied_deleted_record_ids` and updated record fields

**Checkpoint**: Foundation ready - backend can process deletions and updates in batch transactions, and contract tests validate the schema. User story implementation can now begin.

---

## Phase 3: User Story 1 - Sincronização Confiável de Exclusões de Registros (Priority: P1) 🎯 MVP

**Goal**: Garantir que exclusões efetuadas no cliente sejam enviadas ao servidor na sincronização e nunca reapareçam ao buscar dados do servidor.

**Independent Test**: Criar um registro, sincronizar, excluir localmente, disparar sincronização e executar `pullFromServer()`. Verificar que o registro permanece excluído e não ressurge no histórico do usuário per Scenario 1 em `quickstart.md`.

### Implementation for User Story 1

- [X] T005 [US1] Update `client/src/services/sync.ts` in `triggerSync()` to extract items with action `'delete'` from `localDb.syncQueue` and send them in `deleted_record_ids` and `deleted_compensation_ids` to `POST /api/v1/sync`
- [X] T006 [US1] Update `client/src/services/sync.ts` to remove successfully applied deletion items from `localDb.syncQueue` only after server confirms via `applied_deleted_record_ids` and `applied_deleted_compensation_ids`
- [X] T007 [US1] Update `client/src/services/sync.ts` in `pullFromServer()` to prevent resurrecting deleted records: exclude any server records whose IDs exist in the local pending deletion queue, and remove local records with `sync_status === 'synced'` that are absent in the active server response
- [X] T008 [P] [US1] Create automated integration test in `tests/client/sync-deletion.test.ts` verifying that deleting a record locally, syncing with mock/server, and pulling updates does not restore the deleted record per Scenario 1 em `quickstart.md`

**Checkpoint**: User Story 1 (MVP) concluída. Exclusões de registros e compensações propagam para o servidor de forma idempotente e definitiva sem ressuscitar dados.

---

## Phase 4: User Story 2 - Sincronização Confiável de Edições e Alterações (Priority: P1)

**Goal**: Garantir que alterações e edições de registros feitas pelo usuário sejam preservadas, propagadas ao servidor e não sejam sobrescritas por versões antigas.

**Independent Test**: Alterar um registro existente, sincronizar com o servidor e verificar que os dados editados persistem após recarregar e executar `pullFromServer()` per Scenario 2 em `quickstart.md`.

### Implementation for User Story 2

- [X] T009 [US2] Fix `recordsRepository.upsert` in `server/src/repositories/records-repository.ts` to compare client timestamps (`incoming.client_updated_at` vs `existing.client_updated_at`), evitando falsas rejeições de conflito por atraso de relógio
- [X] T010 [US2] Update `server/src/services/sync-service.ts` to only include record IDs in `applied_record_ids` if no conflict occurred, preventing the client from mistakenly marking conflicted/rejected updates as synced
- [X] T011 [US2] Update `saveRecordLocally` in `client/src/services/sync.ts` to preserve existing `created_at` timestamp when editing an existing record and set `sync_status = 'pending'`, and update `pullFromServer()` to never overwrite records whose local `sync_status` is `'pending'`
- [X] T012 [P] [US2] Create automated integration test in `tests/client/sync-edit.test.ts` verifying that updating a record's hours or break duration persists locally, syncs to server, and is not overwritten by server pull per Scenario 2 em `quickstart.md`

**Checkpoint**: User Story 2 concluída. Edições de registros são aplicadas com sucesso pelo servidor e preservadas no cliente sem reversões.

---

## Phase 5: User Story 3 - Visibilidade Clara do Status de Conectividade e Sincronização (Priority: P2)

**Goal**: Exibir de forma consistente e visível o status Online/Offline e o progresso de sincronização em celulares e computadores.

**Independent Test**: Desconectar e reconectar a rede do dispositivo, verificando que o badge de status e o banner informativo atualizam imediatamente entre "Online" e "Offline", indicando dados pendentes per Scenario 3 em `quickstart.md`.

### Implementation for User Story 3

- [X] T013 [P] [US3] Create `client/src/components/layout/ConnectionStatusBadge.vue` to display online/offline/syncing status with pulsing dot and pending count tooltip per `specs/004-fix-sync-and-status/contracts/ui-network-status-contract.md`
- [X] T014 [P] [US3] Create `client/src/components/layout/OfflineNotificationBanner.vue` displaying contextual notification and retry sync button when `!isOnline` per `specs/004-fix-sync-and-status/contracts/ui-network-status-contract.md`
- [X] T015 [US3] Refactor `client/src/components/layout/AppLayout.vue` and `client/src/components/layout/DesktopSidebar.vue` to integrate `ConnectionStatusBadge.vue` and `OfflineNotificationBanner.vue` using shared `useNetworkStatus` composable
- [X] T016 [P] [US3] Create unit/component test in `tests/client/network-status.test.ts` testing online/offline status transitions and pending queue updates per Scenario 3 em `quickstart.md`

**Checkpoint**: User Story 3 concluída. O aplicativo informa com clareza seu estado de conectividade (Online/Offline) e o status das operações pendentes em qualquer tela e plataforma.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes visuais transversais e validação final da suíte completa

- [X] T017 [P] Update record status badges in `client/src/components/records/RecordList.vue` to show pending sync indicator for un-synced/edited records
- [X] T018 Run quickstart validation test suite via `npm test` verifying that all contract and quickstart test scenarios pass without regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - inicia imediatamente
- **Foundational (Phase 2)**: Depende da conclusão do Setup (Phase 1) - BLOQUEIA todas as histórias de usuário
- **User Stories (Phase 3+)**: Dependem da conclusão da Fase Fundacional
  - US1 (Exclusões) e US2 (Edições) implementadas e validadas
  - US3 (Status Online/Offline) implementada e validada
- **Polish (Phase 6)**: Concluída com a suíte de testes 100% aprovada

### Parallel Opportunities

- T001 e T002 foram executadas em paralelo.
- T004 foi executada e validada contra T003.
- T008 e T012 foram executadas em paralelo.
- T013 e T014 foram criadas e integradas via T015.
- T016 e T017 foram concluídas e validadas por T018.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluídas Phase 1 (Setup) e Phase 2 (Foundational).
2. Concluída Phase 3 (User Story 1 - Sincronização de Exclusões).
3. Validada de forma independente com testes de exclusão.
4. Demonstrado que registros excluídos nunca ressuscitam.

### Incremental Delivery

1. Setup + Foundational concluídos.
2. US1 entregue: Exclusões funcionam de forma confiável e definitiva (MVP).
3. US2 entregue: Edições de turnos e cálculos líquidos propagam sem perda de dados.
4. US3 entregue: Indicador unificado Online/Offline visível em todos os tamanhos de tela.
5. Polish: Badges visuais por item e suíte de testes 100% verde (65/65 testes aprovados).
