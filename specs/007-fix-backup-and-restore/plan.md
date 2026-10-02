# Implementation Plan: Fix On-Demand Backup and Add Database Restore

**Branch**: `007-fix-backup-and-restore` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-fix-backup-and-restore/spec.md`

## Summary

This feature resolves the on-demand backup failure ("body cannot be empty" caused by Fastify payload negotiation when `Content-Type: application/json` is sent without a body) and delivers a complete, safe database restore workflow. 
The technical approach includes:
1. Client-side and server-side payload handling alignment for `POST /api/v1/backups/export`.
2. Real-time automatic history refresh in `SettingsView.vue`.
3. An ACID-compliant, crash-resilient restore engine in `BackupService` leveraging SQLite's native Online Backup API on decompressed and verified backup archives.
4. An automatic pre-restore safety snapshot to guarantee rollback capability.
5. An accessible mobile-first confirmation modal (>= 44x44px touch targets) adhering to Constitution Principles I, III, and IV.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Fastify 5.x, better-sqlite3 11.x, Vue 3, Tailwind CSS, Lucide Vue Next  
**Storage**: SQLite 3 in WAL mode (`journal_mode = WAL`, `synchronous = NORMAL`) with automated gzip archives stored in `/backups` (configurable via `BACKUP_DIR`)  
**Testing**: Vitest 2.x for unit, integration, and endpoint tests  
**Target Platform**: Linux single-node server (ARM64 / AMD64 Docker container), modern PWA mobile/desktop browsers  
**Project Type**: Full-stack web application & PWA (Vue SPA + Fastify REST API)  
**Performance Goals**: Manual backup trigger < 500ms; restore execution < 5s for databases with up to 100k records; UI history reload < 1s  
**Constraints**: Zero external message queues or worker processes (< 200MB memory baseline); all interactive touch targets >= 44x44px; atomic restore rollback safety  
**Scale/Scope**: Single-node home-lab / edge deployments (Raspberry Pi 4/5) and desktop/mobile environments  

## Constitution Check

*GATE: Evaluated against Minhas Horas Constitution (v1.0.0)*

| Principle | Requirement | Status | Design Evaluation & Notes |
|-----------|-------------|:------:|---------------------------|
| **I. Mobile-First & Cross-Platform PWA** | Touch targets >= 44x44px, responsive layouts, no full-page reloads | **PASS** | "Baixar" and "Restaurar" buttons, modal triggers, and confirm/cancel controls strictly enforce `min-h-touch min-w-touch` (>= 44x44px). Dynamic refresh replaces page reloads. |
| **II. Offline-First Operation & Deterministic Sync** | Offline data protection, clear sync cues | **PASS** | Restore operates on the central server database. The confirmation dialog explicitly warns users about pending local offline changes to prevent unintended overwrite. |
| **III. Minimalist Architecture & Resource Efficiency** | < 200MB baseline, no heavy queues/services, YAGNI | **PASS** | Decompression and restore stream directly in-process via Node `zlib` and `better-sqlite3`. No external workers or heavy queues introduced. |
| **IV. Reliable & Lightweight Database Persistence** | ACID compliance, WAL mode, integrity checks, data safety | **PASS** | Target backup is verified using SHA-256 and `PRAGMA integrity_check` before application. An automatic pre-restore snapshot is saved before touching live database pages. |
| **V. Containerized Single-Node Deployment** | Multi-arch Docker compatibility, standard volumes | **PASS** | Operates cleanly within existing `/data` and `/backups` volume mounts without altering Docker configuration or host dependencies. |

*Gate outcome: All constitutional gates PASS with zero violations.*

## Project Structure

### Documentation (this feature)

```text
specs/007-fix-backup-and-restore/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical research & architectural decisions
├── data-model.md        # Entities, DTOs, and state transitions
├── contracts/           # API contracts for backup & restore endpoints
│   └── backup-api-contract.md
├── quickstart.md        # End-to-end validation guide
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 task breakdown (created by /speckit-tasks)
```

### Source Code Layout (repository root)

```text
server/
├── src/
│   ├── routes/
│   │   └── backup-routes.ts      # Update export endpoint; add POST /backups/:id/restore
│   ├── services/
│   │   └── backup-service.ts     # Implement restoreBackup, pre-restore snapshot, verification
│   ├── repositories/
│   │   └── backup-repository.ts  # Add restore helpers if required
│   └── types/
│       └── backup.ts             # Type definitions for restore results
client/
├── src/
│   ├── services/
│   │   └── backup-api.ts         # Fix empty body issue; add restoreBackup API client call
│   └── views/
│       └── SettingsView.vue      # Add Restore button, confirmation modal, real-time list refresh
tests/
└── backup.test.ts                # Unit and integration tests for backup fix and restore flow
```

**Structure Decision**: Standard two-tier TypeScript project (`server/` + `client/`), extending existing backup modules without creating new architectural layers or external dependencies.

## Complexity Tracking

> **No constitutional violations identified. Section intentionally left blank.**
