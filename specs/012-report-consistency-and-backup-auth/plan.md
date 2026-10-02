# Implementation Plan: Report Consistency and Backup Authentication

**Branch**: `012-report-consistency-and-backup-auth` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-report-consistency-and-backup-auth/spec.md`

## Summary

This plan resolves data inconsistency in overtime reports and authentication token failures during on-demand administrative backups.
1. Fix report consistency and data isolation: Enforce `authenticate` preHandler in `server/src/routes/reports.ts` (retiring `'default_user'` fallback), transmit `getAuthHeader()` in `client/src/services/client-report-generator.ts`, scope offline Dexie queries strictly by `getCurrentUserId()`, and trigger fresh sync on `ReportsView.vue` preview initialization.
2. Fix backup authentication failures: Attach `getAuthHeader()` across all backup management endpoints in `client/src/services/backup-api.ts` so administrative authorization headers are sent on manual backup triggers, schedule saves, status checks, downloads, and restores.

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 20+ LTS, Vue 3 Composition API)
**Primary Dependencies**: Fastify 4.x, Vue 3, Vue Router 4, Tailwind CSS, Lucide Vue Next, Dexie (IndexedDB), jsPDF, ExcelJS
**Storage**: SQLite (with WAL mode) on server, Dexie IndexedDB client-side
**Testing**: Vitest with `@fastify` test injector and client mocking
**Target Platform**: Linux ARM64 (Raspberry Pi 4/5) and AMD64 (PWA Chromium/WebKit)
**Project Type**: Two-tier Web Application / PWA (`client/` + `server/`)
**Performance Goals**: Report preview refresh < 300ms; on-demand backup initiation < 1s
**Constraints**: Zero cross-user data leakage, offline-capable reports, mobile touch targets >= 44x44px
**Scale/Scope**: Multi-user single-node deployment, 0% authentication token errors on admin operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I: Mobile-First & Cross-Platform PWA**: PASS. Touch targets remain >= 44x44px; responsive two-column grid on desktop, single-column on mobile.
- **Principle II: Offline-First Operation & Deterministic Sync**: PASS. Offline report generation preserves user scoping via local IndexedDB with `getCurrentUserId()`. Online report generation uses synchronized server state.
- **Principle III: Minimalist Architecture & Resource Efficiency**: PASS. No added heavy libraries or microservices. Leverages existing Fastify preHandler and client auth utilities.
- **Principle IV: Reliable & Lightweight Database Persistence**: PASS. Database transactions and integrity enforced in SQLite and Dexie. Strict user ID partitioning.
- **Principle V: Containerized Single-Node Deployment (Docker & Compose)**: PASS. No external cloud dependencies introduced.

## Project Structure

### Documentation (this feature)

```text
specs/012-report-consistency-and-backup-auth/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan
├── research.md          # Phase 0 decisions & findings
├── data-model.md        # Data entities & schema rules
├── quickstart.md        # Verification & test guide
├── contracts/           # API contracts
│   ├── reports-api.md
│   └── backups-api.md
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code Layout

```text
client/
├── src/
│   ├── services/
│   │   ├── auth.ts                     # Auth state & getAuthHeader()
│   │   ├── backup-api.ts               # Backup API client (attach getAuthHeader())
│   │   ├── client-report-generator.ts  # Export generator (attach getAuthHeader(), filter offline user)
│   │   └── sync.ts                     # Offline/online sync manager
│   └── views/
│       ├── ReportsView.vue             # Reports preview & sync trigger
│       └── SettingsView.vue            # Backup UI & error handling
server/
├── src/
│   ├── routes/
│   │   ├── auth-routes.ts              # authenticate & requireAdmin hooks
│   │   ├── backup-routes.ts            # requireAdmin protected backup endpoints
│   │   └── reports.ts                  # Enforce authenticate hook, user scoping
│   └── repositories/
│       └── records-repository.ts       # User-isolated queries
└── tests/
    ├── reports.test.ts                 # Tests verifying report authentication and user isolation
    └── backup-auth.test.ts             # Tests verifying admin authentication on backup endpoints
```

**Structure Decision**: Standard client/server repository structure. All changes are surgically targeted to authentication headers, route hooks, and query user filters.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | Standard direct patterns followed    |
