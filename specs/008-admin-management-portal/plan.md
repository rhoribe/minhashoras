# Implementation Plan: Administrator Role & Management Portal

**Branch**: `008-admin-management-portal` | **Date**: 2026-10-02 | **Spec**: [specs/008-admin-management-portal/spec.md](spec.md)

**Input**: Feature specification from `specs/008-admin-management-portal/spec.md` ("crie um acesso administrador, que pode gerenciar tudo inclusive usarios , relatorios de uso , acessos etc")

---

## Summary

This feature introduces a comprehensive Administrator tier to Minhas Horas:
1. **Role-Based Access Control (RBAC)**: Distinguishes between `admin` and `user` roles. Automatically upgrades existing users to `admin` during database migration to prevent lockout.
2. **Administrative User Management**: Allows administrators to view, create, edit, activate/deactivate, delete users, and reset user passwords, with sole-admin lockout protection.
3. **Access Auditing & Session Monitoring**: Records authentication and administrative events in an `access_audit_logs` table, providing an administrative log viewer and active session termination capabilities.
4. **System-Wide Usage Reports & Analytics**: Consolidates overtime hours, compensations, net balances, and user contributions in a single dashboard and exportable CSV.
5. **Mobile-First Admin Portal**: Exposes a dedicated `/admin` view accessible via desktop navigation and mobile profile menu, with touch targets $\ge 44 \times 44\text{ px}$.

---

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 20+ (ESM modules)
**Primary Dependencies**:
- Backend: Fastify 4.x, better-sqlite3 11.x, uuid 9.x, @fastify/cors, argon2 / crypto
- Frontend: Vue 3.4, Vite 5.x, vue-router 4.x, Tailwind CSS 3.4, lucide-vue-next
**Storage**: SQLite 3 with WAL mode (`data/minhas_horas.db`)
**Testing**: Vitest 1.x (server unit & integration tests)
**Target Platform**: Linux server / ARM64 single-board computer (Raspberry Pi 4/5) and x86_64, Chromium/WebKit mobile & desktop browsers
**Project Type**: Two-tier web application (Fastify REST API server + Vue 3 PWA client)
**Performance Goals**:
- Admin usage report summary query executes in $< 50\text{ ms}$ for 50,000 entries
- Admin access log queries paginated in $< 20\text{ ms}$
- UI renders dashboard within 2 seconds
**Constraints**:
- Low idle memory footprint ($< 200\text{MB}$ baseline)
- Mobile-first touch targets $\ge 44 \times 44\text{ px}$ (Constitution Principle I)
- Zero administrative lockout (strict check preventing deletion/demotion of last active admin)
**Scale/Scope**:
- Multi-user administrative portal: 1 base view (`AdminView.vue`), 3 subcomponents/tabs (Users, Sessions/Audit, Reports), 1 new migration, 1 admin repository, 1 admin service, 1 admin route module

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Compliance Details |
|---|---|---|---|
| **I. Mobile-First & Cross-Platform PWA** | Touch targets $\ge 44 \times 44\text{ px}$, responsive layouts, zero disruption to PWA. | **PASS** | Admin UI uses responsive card views on mobile viewports ($< 768\text{px}$) and tables on desktop. All action buttons have `min-h-[44px]` and `min-w-[44px]`. |
| **II. Offline-First Operation & Sync** | Overtime entries must continue to function offline. | **PASS** | Administrative management requires an active server connection, but standard overtime tracking and local offline sync are untouched and remain 100% offline-first. |
| **III. Minimalist Architecture** | Single/two-tier topology, low memory footprint ($< 200\text{MB}$), YAGNI. | **PASS** | Simple two-role RBAC (`admin` / `user`) directly stored in SQLite without external auth providers, microservices, or complex permissions matrices. |
| **IV. Reliable Database Persistence** | ACID SQLite with WAL mode, automated migrations, strict integrity. | **PASS** | Migration `004_admin_and_roles.ts` adds columns with defaults, upgrades existing users, creates audit log table with indexed timestamps, runs inside transactions. |
| **V. Containerized Deployment** | Single `docker compose up -d` deployment, zero external cloud dependencies. | **PASS** | Everything runs within the existing Docker container image. No new daemon or service needed. |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-admin-management-portal/
├── spec.md              # Requirements and user stories
├── plan.md              # This implementation plan
├── research.md          # Technical research & decisions (Phase 0)
├── data-model.md        # Entities, schemas, DTOs & state transitions (Phase 1)
├── quickstart.md        # End-to-end verification scenarios (Phase 1)
├── contracts/           # API interface specifications (Phase 1)
│   └── admin-api-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Implementation tasks (Phase 2 - generated via /speckit-tasks)
```

### Source Code (concrete paths)

```text
server/
├── src/
│   ├── db/
│   │   ├── migrations/
│   │   │   └── 004_admin_and_roles.ts      # Add role/is_active to users, create access_audit_logs
│   │   └── migrate.ts
│   ├── repositories/
│   │   ├── user-repository.ts              # Extended for role, is_active, listUsers, sole admin check
│   │   ├── session-repository.ts           # Extended for listAllActiveSessions, deleteSessionById
│   │   └── admin-repository.ts             # Audit logs query, system-wide usage reports aggregation
│   ├── services/
│   │   ├── auth-service.ts                 # Audit log on login/logout, check user is_active
│   │   └── admin-service.ts                # User management, lockout guard, session revocation, report export
│   ├── routes/
│   │   ├── auth-routes.ts                  # Export requireAdmin hook, audit log on login/logout
│   │   └── admin-routes.ts                 # /api/v1/admin/* routes
│   └── index.ts                            # Register adminRoutes
└── tests/
    ├── admin-rbac.test.ts                  # Unit & integration tests for admin endpoints & 403 guard
    └── admin-reports.test.ts               # Unit & integration tests for aggregation & CSV export

client/
├── src/
│   ├── services/
│   │   ├── auth.ts                         # Update User interface with role, add isAdmin computed
│   │   └── admin.ts                        # Admin API client methods (users, sessions, logs, reports)
│   ├── views/
│   │   └── AdminView.vue                   # Unified Admin Portal view with 3 tabs
│   ├── components/
│   │   ├── admin/
│   │   │   ├── UserManagementTab.vue       # User list, create, edit, reset password modals
│   │   │   ├── AccessAuditingTab.vue       # Audit logs table/cards, active sessions, revoke session
│   │   │   └── UsageReportsTab.vue         # Metrics cards, user breakdown table, CSV export
│   │   └── layout/
│   │       ├── AppLayout.vue               # Add Admin link in user menu
│   │       └── DesktopSidebar.vue          # Add Administration nav link when isAdmin is true
│   └── main.ts                             # Register /admin route with admin route guard
```

---

## Complexity Tracking

> **Constitution Check has zero violations. No deviations require justification.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | *N/A* | *Standard lightweight architecture maintained* |
