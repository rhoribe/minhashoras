# Implementation Plan: Mecanismo de Backup Externo e Rotinas Programáveis

**Branch**: `005-external-data-backup` | **Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-external-data-backup/spec.md`

## Summary

Implementação de um mecanismo robusto, eficiente e seguro para backup de dados da aplicação Minhas Horas com suporte a rotinas programáveis (diárias, semanais e mensais) e disparo manual sob demanda. A solução utiliza a API de backup online nativa do `better-sqlite3` para extrair snapshots consistentes e não bloqueantes do banco em modo WAL, compacta o arquivo gerado via streams nativos do Node.js (`node:zlib`) com cálculo de checksum SHA-256 (`node:crypto`), grava o artefato em volume de armazenamento externo (`/backups`), aplica política configurável de retenção automática para evitar esgotamento de disco e expõe endpoints protegidos e interface responsiva no PWA (Mobile-First).

## Technical Context

**Language/Version**: TypeScript 5.7+ / Node.js 22 LTS  
**Primary Dependencies**: Fastify 4.28, better-sqlite3 11.8, Vue 3.5, lucide-vue-next, bibliotecas nativas `node:zlib`, `node:crypto` e `node:fs/promises` (0 dependências externas pesadas adicionadas)  
**Storage**: SQLite 3 (WAL mode, integridade referencial ativa), persistência externa em volume Docker `/backups` ou diretório host configurável via `BACKUP_DIR`  
**Testing**: Vitest 3.0 (testes unitários e de integração de serviços de backup, retenção e rotas)  
**Target Platform**: Linux ARM64 (Raspberry Pi 3/4/5) e Linux AMD64 em Docker Compose; navegadores modernos mobile e desktop  
**Project Type**: Full-stack Web Application (Fastify REST backend + Vue 3 PWA frontend)  
**Performance Goals**:
- Disparo da rotina programada em menos de 60 segundos do horário estipulado
- Degradação de latência em operações concorrentes de ponto < 500ms durante o snapshot
- Consumo de memória adicional do processo durante o backup < 20MB de RAM (streaming gzip)  
**Constraints**:
- Princípio Constitucional III: Limite estrito de memória do container (< 200MB baseline, limite Compose 150MB)
- Sem uso de filas pesadas externas (proibição de Redis, Celery, BullMQ ou daemons corporativos)
- Minimização de ciclos de escrita no armazenamento flash / MicroSD através de compressão e retenção rígida  
**Scale/Scope**: Instâncias locais e de pequenos times (1-10 usuários), dezenas de milhares de registros de horas, artefatos compactados tipicamente < 5MB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio Constitucional | Verificação de Conformidade | Status |
|---|---|---|
| **I. Mobile-First & Cross-Platform PWA** | Controles de agendamento e acionamento de backup integrados em `SettingsView.vue` com botões e campos respeitando alvos de toque >= 44x44px, layout fluido responsivo e feedback visual de progresso. | ✅ Aprovado |
| **II. Offline-First Operation & Deterministic Sync** | Operação de backup executada no servidor central; interface apresenta aviso explicativo de que registros offline mantidos em cache local do navegador devem ser sincronizados previamente para constarem na exportação. | ✅ Aprovado |
| **III. Minimalist Architecture & Resource Efficiency** | Agendador in-process no Node.js via `setInterval` a cada 60s; compressão por streaming sem carregar arquivos inteiros em memória; sem microserviços ou mensageria externa. | ✅ Aprovado |
| **IV. Reliable & Lightweight Database Persistence** | Utilização da API de backup online nativa do SQLite para garantir snapshot ACID consistente; verificação de integridade estrutural e hash SHA-256; migrations idempotentes. | ✅ Aprovado |
| **V. Containerized Single-Node Deployment** | Volume externo declarado no `docker-compose.yml` (`minhashoras-backups:/backups`); suporte multi-arch ARM64/AMD64; mitigação de desgaste de flash via retenção automática. | ✅ Aprovado |

## Project Structure

### Documentation (this feature)

```text
specs/005-external-data-backup/
├── spec.md              # Especificação de requisitos e cenários
├── plan.md              # Este plano de implementação
├── research.md          # Decisões de pesquisa técnica (Phase 0)
├── data-model.md        # Esquema relacional e transições de estado (Phase 1)
├── quickstart.md        # Guia prático de teste e validação (Phase 1)
├── contracts/           # Contratos de interface da API (Phase 1)
│   └── backups-api.yaml # Especificação OpenAPI 3.0 dos endpoints
└── checklists/
    └── requirements.md  # Checklist de validação de qualidade da especificação
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── db/
│   │   └── migrations/
│   │       └── 003_backup_system.ts       # DDL das tabelas backup_schedules e backup_runs
│   ├── repositories/
│   │   └── backup-repository.ts           # Consultas e persistência de rotinas e execuções
│   ├── services/
│   │   ├── backup-service.ts              # Snapshot SQLite, compressão gzip, checksum e retenção
│   │   └── backup-scheduler.ts            # Agendador in-process executado em background
│   ├── routes/
│   │   └── backup-routes.ts               # Endpoints REST Fastify para backup
│   └── index.ts                           # Registro das rotas e inicialização do scheduler
└── tests/
    └── backup.test.ts                     # Testes de serviço, integridade e rotas

client/
├── src/
│   ├── services/
│   │   └── backup-api.ts                  # Cliente de comunicação com os endpoints de backup
│   └── views/
│       └── SettingsView.vue               # UI de configuração da rotina, disparo manual e histórico

docker-compose.yml                         # Mapeamento do volume /backups para persistência externa
```

**Structure Decision**: A feature se integra naturalmente à topologia existente monorepo (Fastify + Vue 3), preservando a modularidade de rotas, repositórios e serviços já utilizada para `records`, `settings` e `sync`.

## Complexity Tracking

> Nenhuma violação constitucional identificada. A arquitetura mantém estrita fidelidade aos princípios de baixo consumo, ausência de serviços externos e compatibilidade com nós ARM64.
