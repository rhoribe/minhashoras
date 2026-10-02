# Quickstart & Validation Guide: Sincronização Confiável e Status Online/Offline

**Feature Branch**: `004-fix-sync-and-status`
**Date**: 2026-10-02
**Spec**: [spec.md](./spec.md)
**Contracts**: [contracts/sync-contract.md](./contracts/sync-contract.md) | [contracts/ui-network-status-contract.md](./contracts/ui-network-status-contract.md)

Este guia descreve os cenários de teste automatizados e manuais para validar ponta a ponta a sincronização de exclusões, edições e o status de conectividade online/offline.

---

## 1. Pré-requisitos & Ambiente de Teste

- Node.js 22+ instalado
- Dependências instaladas via `npm install`
- Servidor e cliente compiláveis via `npm run build`

---

## 2. Cenários de Validação

### Cenário 1: Sincronização de Exclusão de Registro (P1)
**Objetivo**: Validar que a exclusão de um registro no cliente é propagada ao servidor e não reaparece após nova busca ou sincronização.

1. **Passos de Teste**:
   - Criar um registro de hora extra com ID `rec-del-test-1`.
   - Disparar sincronização para garantir que o registro existe no servidor.
   - Executar a exclusão do registro no cliente (`syncManager.deleteRecordLocally`).
   - Verificar que o registro foi removido do IndexedDB local.
   - Disparar `syncManager.triggerSync()`.
   - Executar `pullFromServer()`.
2. **Resultado Esperado**:
   - O payload de `/api/v1/sync` envia `deleted_record_ids: ['rec-del-test-1']`.
   - O servidor remove o registro do banco SQLite e responde com `applied_deleted_record_ids: ['rec-del-test-1']`.
   - `pullFromServer()` não reinsere o registro excluído.

---

### Cenário 2: Sincronização de Alteração/Edição de Registro (P1)
**Objetivo**: Validar que a edição de horários ou campos de um registro existente é aceita pelo servidor e não é sobrescrita por dados antigos.

1. **Passos de Teste**:
   - Criar um registro com horário `09:00` a `12:00` (180 min). Sincronizar.
   - Editar o registro para `09:00` a `13:00` (240 min).
   - Salvar a alteração no cliente (`syncManager.saveRecordLocally`).
   - Disparar `syncManager.triggerSync()`.
   - Executar `pullFromServer()`.
2. **Resultado Esperado**:
   - O servidor atualiza os campos do registro no SQLite via LWW (`client_updated_at`).
   - O ID é confirmado em `applied_record_ids`.
   - O saldo do banco de horas no servidor reflete 240 minutos (+4h).
   - O cliente mantém os dados atualizados (`13:00`) mesmo após o pull do servidor.

---

### Cenário 3: Transição de Status Online / Offline e Banner Informativo (P2)
**Objetivo**: Validar que o status visual de conectividade reflete com precisão as transições de rede e alterações pendentes.

1. **Passos de Teste**:
   - Abrir o aplicativo com conexão ativa: verificar badge "Online" no topo mobile e na sidebar desktop.
   - Desconectar a rede (ou disparar `window.dispatchEvent(new Event('offline'))`).
   - Criar um registro e excluir outro enquanto offline.
   - Verificar que o badge exibe "Offline" com contador de pendências e o banner informativo é exibido no topo.
   - Reconectar a rede (`window.dispatchEvent(new Event('online'))`).
2. **Resultado Esperado**:
   - O aplicativo entra em estado "Sincronizando..." automaticamente.
   - Os dados pendentes são enviados e confirmados pelo servidor.
   - O badge transita para "Online" e o banner de offline desaparece.

---

## 3. Comandos de Execução dos Testes Automatizados

Executar a suíte de testes com vitest:

```bash
# Executar todos os testes de contrato e integração
npm test

# Executar especificamente o teste de sincronização
npx vitest run server/tests/contract/sync.test.ts
```
