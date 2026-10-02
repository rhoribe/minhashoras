# Research & Architecture Decisions: Sincronização Confiável e Status Online/Offline

**Feature Branch**: `004-fix-sync-and-status`
**Date**: 2026-10-02
**Spec**: [spec.md](./spec.md)

## Decision 1: Protocolo de Sincronização de Exclusões e Prevenção de Ressurreição

### Contexto & Problema
Atualmente, quando o usuário clica em excluir um registro no cliente (`syncManager.deleteRecordLocally`), o registro é apagado do IndexedDB local e um item com ação `delete` é colocado na tabela `syncQueue`. No entanto:
1. O método `triggerSync()` apenas busca registros existentes com status `pending` na tabela `overtimeRecords` (e `compensations`). O item excluído não está mais lá.
2. O endpoint `/api/v1/sync` não recebe nenhuma lista de IDs excluídos.
3. Ao término do sync, a fila `syncQueue` inteira é apagada sem que as exclusões tenham sido enviadas ao servidor.
4. Logo em seguida, `pullFromServer()` faz um `GET /api/v1/records` do servidor (onde o registro ainda existe) e reinsere o registro excluído de volta no IndexedDB local do usuário.

### Decisão
1. **Extensão do Payload de Sincronização em Lote (`POST /api/v1/sync`)**:
   - Adicionar os campos opcionais `deleted_record_ids?: string[]` e `deleted_compensation_ids?: string[]` ao contrato de `/api/v1/sync`.
   - No servidor, dentro da transação atômica SQLite, executar `recordsRepository.delete(id, userId)` e `compensationsRepository.delete(id, userId)` para cada ID recebido.
   - Retornar `applied_deleted_record_ids: string[]` e `applied_deleted_compensation_ids: string[]` na resposta para confirmação explícita.
2. **Ciclo de Vida de Exclusão no Cliente**:
   - Manter a operação de exclusão pendente na fila (`syncQueue`) até que o servidor confirme o recebimento e processamento.
   - Durante `triggerSync()`, extrair os IDs pendentes com ação `'delete'` e incluí-los no payload enviado ao servidor.
   - Remover da fila local de exclusões apenas após confirmação no resultado (`applied_deleted_record_ids`).
3. **Reconciliação e Purga em `pullFromServer()`**:
   - Ao buscar os registros ativos do servidor via `GET /api/v1/records`, verificar contra a fila de exclusões locais: **nunca** reinserir registros cujo ID esteja pendente de exclusão na fila local.
   - Para registros locais que já possuam status `synced`, se eles não estiverem presentes na lista ativa retornada pelo servidor (indicando que foram excluídos no servidor ou em outro dispositivo), removê-los do IndexedDB local.

### Alternativas Consideradas
- **Soft Delete com colunas `deleted_at` / `is_deleted`**:
  - *Avaliação*: Exigiria nova migração SQLite, alteração em todas as queries e views do servidor (`WHERE deleted_at IS NULL`), e aumentaria o consumo de armazenamento flash no Raspberry Pi.
  - *Rejeição*: Como o aplicativo tem foco em privacidade do trabalhador e simplicidade operacional (Princípio III & IV), exclusão direta com protocolo de IDs sincronizados é mais rápida, limpa e economiza armazenamento em cartões MicroSD.

---

## Decision 2: Resolução Determinística de Edições/Alterações e Correção de Conflitos

### Contexto & Problema
Quando um usuário edita um registro existente:
1. No cliente, `saveRecordLocally` sobrescrevia o campo `created_at` com o carimbo atual, descaracterizando o histórico do registro original.
2. No servidor, `recordsRepository.upsert` comparava `incoming.client_updated_at` com `existing.updated_at` (carimbo do servidor da gravação anterior). Se o relógio do cliente estivesse ligeiramente atrasado em relação ao servidor ou no mesmo segundo, o servidor marcava como `conflict: true` (`server_version_newer`).
3. No manipulador `sync-service.ts`, mesmo com `conflict: true`, o ID era adicionado a `applied_record_ids` e o registro **não** era atualizado no banco.
4. O cliente, ao receber seu ID em `applied_record_ids`, marcava localmente o registro como `synced`.
5. Logo após, `pullFromServer()` buscava os registros do servidor (que ainda continham os valores antigos pré-edição) e sobrescrevia os dados editados pelo usuário, fazendo com que a alteração fosse perdida.

### Decisão
1. **Comparação Consistente de Versões**:
   - Comparar `incoming.client_updated_at` com `existing.client_updated_at` (em vez do relógio do servidor `updated_at`).
   - Caso `new Date(incoming.client_updated_at) >= new Date(existing.client_updated_at)`, a atualização é aplicada normalmente com sucesso.
   - Se for uma inserção ou edição deliberada do próprio usuário, a alteração é executada no banco SQLite e `applied_record_ids` inclui o ID.
2. **Tratamento Rigoroso de Conflitos**:
   - Se houver conflito real (versão do servidor mais recente que a do cliente), o ID **não** deve constar em `applied_record_ids` como bem-sucedido.
3. **Preservação de Dados no Cliente**:
   - Em `saveRecordLocally`, se o registro já existe localmente, preservar o `created_at` original.
   - Em `pullFromServer()`, se um registro local estiver com `sync_status === 'pending'`, **nunca** sobrescrevê-lo com dados antigos vindos do servidor.

### Alternativas Consideradas
- **Vector Clocks ou CRDTs completos**:
  - *Avaliação*: Excessivamente complexo para o escopo e violaria o Princípio III (Minimalist Architecture / YAGNI).
  - *Decisão*: Last-Write-Wins baseado no carimbo `client_updated_at` do usuário atende perfeitamente ao perfil de uso individual do Minhas Horas com zero sobrecarga.

---

## Decision 3: Estado Reativo Global de Rede e Status Online/Offline na Interface

### Contexto & Problema
O usuário relatou: *"tambem quero que volte a ter o status no app informando quando ele esta online e offline"*.
Atualmente:
1. `isOnline` é um `ref` duplicado de forma isolada dentro de `AppLayout.vue` e `DesktopSidebar.vue`.
2. Em telas desktop ou quando o menu mobile está oculto, o badge pode não ser percebido, e não há indicação clara do status do sync (se há itens pendentes na fila local ou sincronização ocorrendo).
3. Não há um banner contextual de alerta quando o app entra em modo offline informando que a gravação é segura localmente.

### Decisão
1. **Composable Reativo Centralizado (`useNetworkStatus`)**:
   - Localizado em `client/src/composables/useNetworkStatus.ts` (ou serviço compartilhado).
   - Mantém estado reativo único:
     - `isOnline`: boolean, reagindo a `window.addEventListener('online')` e `'offline'`.
     - `isSyncing`: boolean, emitido pelo `SyncManager` durante ciclos de sincronização.
     - `hasPendingSync`: boolean / `pendingCount`: contagem de registros/compensações pendentes localmente.
2. **Componente Visual de Conectividade (`ConnectionStatusBar.vue`)**:
   - Um componente unificado presente no layout principal (`AppLayout.vue`), garantindo visibilidade em mobile e desktop.
   - Apresenta:
     - Em modo online: Badge verde discreto ("Online") com indicador de sincronizado.
     - Durante sincronização: Ícone giratório / pulse âmbar/azul ("Sincronizando...").
     - Em modo offline: Badge âmbar/laranja visível ("Offline - Salvando localmente") e banner superior informativo não invasivo quando a conexão cair ou houver itens na fila.
3. **Disparo Imediato ao Reconectar**:
   - O listener de `online` dispara imediatamente `syncManager.triggerSync()`, transitando visualmente de "Offline" -> "Sincronizando..." -> "Online (Sincronizado)".

### Alternativas Consideradas
- **Uso de bibliotecas externas (ex: @vueuse/core)**:
  - *Avaliação*: Adiciona dependência externa para algo nativo.
  - *Decisão*: Implementação nativa limpa com `<script setup>` e eventos de navegador padrão (`window.addEventListener`), sem impacto no bundle final.
