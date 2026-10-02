# Implementation Plan: Overtime Management & Time Bank System

**Branch**: `001-overtime-management` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-overtime-management/spec.md`

## Summary

Build a mobile-first, offline-first Progressive Web Application (PWA) and lightweight REST service for tracking overtime shifts (entry/exit times, midnight rollover), calculating positive/negative time bank balances, configuring threshold limit alerts, pre-scheduling compensations, and exporting multi-format reports (CSV, Excel XLSX, PDF). The system is architected for low resource consumption (<60MB RAM) to run on a single-node Raspberry Pi under Docker Compose using Node.js/Fastify, SQLite with WAL mode, and Vue 3 + Dexie.js for client-side persistence.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS  

**Primary Dependencies**:
- *Backend*: Fastify, `@fastify/static`, `better-sqlite3`, `exceljs`, `pdfkit`
- *Frontend*: Vue 3 (Composition API), Vite, Tailwind CSS, `vite-plugin-pwa`, `dexie`, `lucide-vue-next`

**Storage**:
- *Server*: SQLite 3 with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and `PRAGMA synchronous = NORMAL;` mounted on a Docker volume (`/data/minhashoras.db`)
- *Client*: IndexedDB via Dexie.js (`minhashoras_db`) for local offline-first operation and sync queuing

**Testing**: Vitest for unit tests (time math, midnight interval handling, balance aggregation) and contract/integration tests  

**Target Platform**: Linux ARM64 (Raspberry Pi 3/4/5) and Linux AMD64 running Docker Engine & Docker Compose  

**Project Type**: Fullstack Web Application (PWA client + embedded REST API serving pre-built assets from a single lightweight container)  

**Performance Goals**:
- PWA First Contentful Paint: < 1.5s
- Local API response latency: < 15ms p95
- Memory footprint: < 60MB RSS idle on ARM64 Raspberry Pi
- Report generation: < 2s for 12 months of historical records

**Constraints**:
- Strict offline capability: Complete record creation, editing, and local calculation without network connectivity
- Flash storage protection: Batched writes and WAL journal mode to prevent Raspberry Pi microSD card wear
- Touch ergonomics: Bottom navigation bar, minimum 44x44px touch targets, mobile viewport optimizations for iOS Safari and Android Chrome

**Scale/Scope**:
- Single-user / small-team personal tracking (up to 10,000 records over multiple years)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Requirement | Plan Status | Design Verification |
|------------------------|-------------|-------------|---------------------|
| **I. Mobile-First & Cross-Platform PWA** | Mobile touch ergonomics, Web Manifest, iOS & Android standalone install | **PASS** | Vue 3 + Tailwind mobile-first responsive layout with bottom navigation, `vite-plugin-pwa` manifest and service worker configuration. |
| **II. Offline-First Operation & Deterministic Sync** | Full offline capability, local IndexedDB, automatic idempotent sync | **PASS** | Dexie.js client mirror, client UUIDv4 generation, `/api/v1/sync` batch endpoint with timestamp reconciliation and optimistic UI updates. |
| **III. Minimalist Architecture & Resource Efficiency** | < 200MB memory ceiling, single-node simplicity, no heavy microservices | **PASS** | Fastify + SQLite in a single Alpine container (~40-50MB RAM total), zero external brokers or heavy runtime dependencies. |
| **IV. Reliable & Lightweight Database Persistence** | ACID compliance, idempotent migrations, flash storage wear protection | **PASS** | SQLite 3 with WAL mode, `synchronous = NORMAL`, automated boot migrations, strict interval validation. |
| **V. Containerized Single-Node Deployment** | Single `docker compose up -d`, multi-arch ARM64/AMD64 support, named volumes | **PASS** | Multi-stage Dockerfile targeting `linux/arm64` and `linux/amd64`, volume persistence for `/data`, compose healthcheck. |

*Gate Evaluation*: All principles pass without exceptions or compromises.

## Project Structure

### Documentation (this feature)

```text
specs/001-overtime-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-spec.yaml    # OpenAPI 3.1 specification
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code Layout

```text
docker-compose.yml
Dockerfile
package.json
tsconfig.json

server/
├── src/
│   ├── db/
│   │   ├── connection.ts       # better-sqlite3 with WAL pragmas
│   │   └── migrations/         # idempotent schema setup
│   ├── routes/
│   │   ├── records.ts          # CRUD for overtime records
│   │   ├── balance.ts          # aggregate balance ledger
│   │   ├── compensations.ts    # pre-scheduled compensations
│   │   ├── sync.ts             # offline batch synchronization
│   │   └── reports.ts          # CSV, XLSX, and PDF exports
│   ├── services/
│   │   ├── balance-calculator.ts
│   │   ├── sync-service.ts
│   │   └── report-generator.ts # ExcelJS and PDFKit stream generation
│   └── index.ts                # Fastify server & static asset host
└── tests/
    ├── unit/                   # calculation math & interval tests
    └── contract/               # Fastify inject API contract tests

client/
├── public/
│   ├── manifest.webmanifest    # PWA install metadata
│   └── icons/                  # PWA touch icons (192, 512, apple-touch)
├── src/
│   ├── components/
│   │   ├── layout/             # BottomNav, AppHeader, SyncBadge
│   │   ├── records/            # OvertimeFormModal, RecordList, RecordCard
│   │   ├── balance/            # BalanceCard, LimitAlertBanner
│   │   └── compensations/      # CompensationModal, ScheduleList
│   ├── views/
│   │   ├── DashboardView.vue
│   │   ├── RecordsView.vue
│   │   ├── CompensationsView.vue
│   │   ├── ReportsView.vue
│   │   └── SettingsView.vue
│   ├── services/
│   │   ├── db.ts               # Dexie.js local database & models
│   │   ├── sync.ts             # Offline queue manager & network listeners
│   │   └── notifications.ts   # Web Notifications & local alerts
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts              # Vite + vite-plugin-pwa
└── tailwind.config.js          # Mobile ergonomics & touch utilities
```

**Structure Decision**: A unified monorepo containing `server/` and `client/` built together into a single ultra-lightweight Docker image. The Node/Fastify server serves the static pre-compiled client assets in production while handling `/api/v1` routes, eliminating any need for complex inter-container networking or separate frontend proxies.

## Complexity Tracking

*No violations or unjustified complexity detected. All components adhere strictly to the Constitution.*
