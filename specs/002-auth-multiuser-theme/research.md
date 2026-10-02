# Research & Technology Decisions: Authentication, Multi-User Support & Impeccable Theming

**Feature Branch**: `002-auth-multiuser-theme`
**Date**: 2026-10-01

## 1. Authentication & Cryptography Strategy

### Decision
Use Node.js native `crypto` module (`scryptSync` / `randomBytes`) for secure password hashing and salting, combined with database-persisted bearer session tokens (`user_sessions` table in SQLite).

### Rationale
- **Zero External Dependencies**: Adheres to Constitution Principle III (Minimalist Architecture & Resource Efficiency) by avoiding heavy external binaries (like native `bcrypt` or `argon2`) that complicate multi-arch compilation (`arm64` and `amd64`) on Raspberry Pi.
- **Hardware Efficiency**: `crypto.scrypt` is NIST/OWASP approved and provides excellent protection against GPU/ASIC brute-force with tunable memory and CPU cost parameters suitable for low-power single-board computers.
- **Revocable Sessions**: Storing sessions in SQLite allows instant invalidation upon explicit logout, multi-device tracking, and clean session lifecycle management without external caches (Redis).
- **Fastify Hook**: A lightweight preHandler hook extracts and validates the Bearer token, binding `request.userId` to incoming requests.

### Alternatives Considered
- *Native `bcrypt` / `argon2`*: Rejected due to native build toolchain dependencies on ARM64 Alpine Docker containers and potential memory spikes during compilation.
- *Stateless JWT with client-only storage*: Rejected because instant session revocation (logout, security invalidation) requires either token blocklists or short lifetimes that break offline-first PWA usage patterns.

---

## 2. Adaptive Dark/Light Mode & Impeccable Design Theming

### Decision
Implement a semantic design token system leveraging Tailwind CSS `class` mode combined with CSS custom properties (variables) and an inline head bootstrapper script to completely eliminate Flash of Unstyled Content (FOUC).

### Rationale
- **WCAG AA Compliance**: By defining semantic tokens (`--color-surface`, `--color-bg`, `--color-text-primary`, `--color-text-secondary`, `--color-border`), contrast ratios can be strictly calibrated to >= 4.5:1 for body copy and >= 3.0:1 for borders/interactive components in both light and dark themes.
- **Ergonomics & Touch Targets**: Incorporates the Impeccable skill standards: minimum 44x44px touch targets on mobile viewports, clear focus-visible rings for accessibility, tactile active states (`active:scale-[0.98]`), and smooth transitions (`transition-colors duration-200`).
- **Zero-FOUC Architecture**: A 10-line blocking script inside `client/index.html` inspects `localStorage.getItem('minhas_horas_theme')` and `window.matchMedia('(prefers-color-scheme: dark)')` before stylesheet parsing, instantly setting or removing the `.dark` class on `<html>`.
- **Three Mode Choices**: Users can explicitly select "Claro" (Light), "Escuro" (Dark), or "Automático" (System).

### Alternatives Considered
- *Single-theme with automatic inversion*: Rejected as CSS `invert()` filters degrade image quality, distort brand colors, and fail accessibility contrast audits.
- *Runtime CSS-in-JS theming*: Rejected due to high runtime overhead and bundle size penalties incompatible with mobile PWA performance.

---

## 3. Multi-User Tenancy & Data Partitioning

### Decision
Enforce strict tenant separation by indexing and filtering all database queries on `user_id` on both server (SQLite) and client (Dexie IndexedDB v2).

### Rationale
- **Strict Data Isolation**: Every overtime record, compensation item, balance calculation, and time bank limit record includes a mandatory `user_id` foreign key. Repositories and API routes reject any unauthenticated or mismatched operations.
- **Client IndexedDB Partitioning (Dexie v2)**: The Dexie schema is bumped to version 2, adding index on `user_id` across `overtimeRecords`, `compensations`, and `syncQueue`. The client state manager and queries filter specifically by `activeUser.id`.
- **Offline Multi-User Continuity**: If internet connectivity is lost, the currently authenticated user can continue working without hindrance. Multi-user switching requires network access to authenticate credentials for users whose session has not been cached on device.

### Alternatives Considered
- *Separate SQLite database per user*: Rejected because managing multiple SQLite connections, transactions, and migration files on a Raspberry Pi adds file descriptor complexity and flash wear without significant architectural benefit.
- *Local storage clear on every logout*: Adopted for sensitive tokens and in-memory caches, but historical records in IndexedDB are partitioned by `user_id` so subsequent logins by the same user do not require a slow full re-fetch.

---

## 4. Offline Session Lifecycle & PWA Sync Compatibility

### Decision
Cache the current active user session profile in client storage alongside the sync queue. Requests queued while offline carry the active `user_id`. When reconnected, the sync engine dispatches requests with the stored bearer token.

### Rationale
- **Constitution Principle II Alignment**: Users must never be locked out of recording time entries during shifts due to spotty cell service.
- **Deterministic Token Expiration Handling**: If a session expires while the device is offline, offline changes remain safely buffered in the local sync queue until connectivity is restored and the user re-authenticates.
