# Phase 0: Technical Research & Architectural Decisions

**Feature**: Overtime Management & Time Bank System (`001-overtime-management`)  
**Date**: 2026-10-01  
**Target Platform**: Linux ARM64 (Raspberry Pi) / Docker & Docker Compose  

---

## 1. Architectural Topology & Runtime Selection

### Decision
A unified lightweight single-process container architecture:
- **Backend & Static Host**: Node.js 20 LTS (or 22) with **Fastify** and TypeScript.
- **Frontend SPA / PWA**: **Vue 3** (Composition API) + **Vite** + **Tailwind CSS** + **vite-plugin-pwa**.
- **Containerization**: Single multi-stage Dockerfile producing a minimal Alpine-based container image that serves the pre-compiled PWA static assets and exposes the `/api/v1` REST endpoints.
- **Reverse Proxy**: Optional Caddy or Nginx in `docker-compose.yml` for automated HTTPS/TLS termination (essential for PWA service worker operation on local/domain networks).

### Rationale
- **Resource Footprint**: Fastify + SQLite on Node.js Alpine runs under 45-60MB idle RAM, far below the 200MB ceiling mandated by Principle III of the Constitution.
- **Architectural Simplicity**: Avoids separate frontend container and backend container orchestration overhead. A single application container simplifies `docker-compose.yml`, backup scripts, and Raspberry Pi deployments.
- **PWA Tooling**: `vite-plugin-pwa` offers zero-config Workbox integration, web manifest generation, offline precaching of the app shell, and automatic service worker registration for both iOS and Android.

### Alternatives Considered
- **FastAPI (Python) + PostgreSQL container**: Requires running two separate daemons (Python Uvicorn ~80MB + Postgres ~120MB = 200MB+ total). Higher baseline memory, slower container cold start on Raspberry Pi SD cards. Rejected in favor of SQLite + Fastify.
- **Go / Rust backend**: Lower memory, but requires dual-language toolchain and complex build pipelines compared to unified TypeScript across client and server.
- **Next.js / Nuxt Fullstack**: High runtime memory overhead (>150MB baseline) and unnecessary SSR complexity for an offline-first PWA where the UI must run client-side without server rendering.

---

## 2. Persistence Engine & Flash Storage Protection

### Decision
- **Database Engine**: **SQLite 3** via **better-sqlite3** with Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) and `PRAGMA synchronous = NORMAL;`.
- **Data Location**: Dedicated named volume or host bind-mount (`/data/minhashoras.db`).
- **Migration Strategy**: Lightweight schema migrations executed synchronously on server boot before listening to traffic.

### Rationale
- **Zero Server Overhead**: Embedded in-process database, requiring zero additional ports, processes, or memory allocations.
- **Constitution Compliance**: Principle IV (Reliable & Lightweight Database Persistence) and Platform Constraints explicitly address SD card / flash storage longevity. WAL mode with `synchronous = NORMAL` provides full ACID guarantees against power loss while batching disk writes and eliminating excessive fsync thrashing on Raspberry Pi microSD storage.
- **Portability**: Backing up the entire database requires only snapshotting or copying the single `.db` file (with `VACUUM INTO` or sqlite3 backup API).

### Alternatives Considered
- **PostgreSQL in Docker**: Robust, but consumes ~80-150MB dedicated memory and requires TCP socket overhead. Rejected as overkill for single-user/small-team overtime tracking on a single-node Raspberry Pi.

---

## 3. Offline-First Architecture & Synchronization Protocol

### Decision
- **Client-Side Storage**: **Dexie.js** (IndexedDB wrapper) maintaining local stores for:
  - `overtime_records` (with `sync_status`: `'synced' | 'pending' | 'conflict'`)
  - `compensations` (with `sync_status`)
  - `settings`
- **Sync Pattern**: Idempotent batch sync via `POST /api/v1/sync`.
  - Every entity generated client-side receives a UUIDv4 and a `client_updated_at` ISO timestamp.
  - When connection is active, changes are dispatched immediately.
  - When disconnected, Service Worker and client-side interceptors queue operations locally in Dexie.js.
  - On `window.addEventListener('online')` and service worker background sync events, the client pushes queued changes to `/api/v1/sync`.
  - The server processes entries within a database transaction, resolves potential conflicts using a deterministic timestamp policy (last-write-wins with server timestamp stamping), updates balances, and returns the reconciled entity state.

### Rationale
- Complies strictly with Constitution Principle II (Offline-First Operation & Deterministic Sync).
- Avoids UI locking: The user creates an entry, it renders in the UI immediately (<50ms), and sync happens asynchronously in the background.

### Alternatives Considered
- **CouchDB / PouchDB**: Mature sync protocol, but CouchDB is heavy (Erlang VM ~200MB+) and does not fit Raspberry Pi simplicity goals.
- **CRDTs (Automerge / Yjs)**: Unnecessary computational overhead for simple scalar time records (start time, end time, duration). Last-write-wins with idempotent upserts is completely sufficient.

---

## 4. Multi-Format Report Generation (XLS, CSV, PDF)

### Decision
- **CSV**: Lightweight RFC 4180 streaming directly generated on server or client using standard delimiter escaping.
- **XLS (Excel)**: Generated via **ExcelJS** on the backend (`/api/v1/reports/export.xlsx`), producing real `.xlsx` files with formatted column headers, date formats, and calculated sum formulas.
- **PDF**: Generated server-side using **PDFKit** or client-side with **jsPDF + jspdf-autotable**. Client-side generation ensures reports can even be created when offline from local Dexie.js cache! Server-side endpoint provides formal server-stamped PDF.

### Rationale
- ExcelJS and jsPDF are lightweight, pure JavaScript libraries with zero dependency on headless Chromium or external binaries (e.g. avoiding heavy Puppeteer/Playwright which consumes >300MB RAM and often fails on ARM64 Raspberry Pi).
- Both offline (client-generated) and online (server-generated) workflows are supported.

### Alternatives Considered
- **Puppeteer / Chrome Headless for PDF**: Disqualified due to massive RAM usage (>300MB) and poor reliability on ARM64 Linux without desktop libraries installed.
- **HTML Table copy to .xls**: Primitive pseudo-Excel that triggers security warnings in modern Excel versions. Real `.xlsx` via ExcelJS is clean and professional.

---

## 5. Mobile Ergonomics & PWA Notification Strategy

### Decision
- **Layout & Gestures**: Bottom navigation bar (Tabs: Dashboard/Balance, Records/Timeline, Schedule/Compensation, Reports/Settings), high-contrast touch targets (>48px), and bottom-sheet drawers for record creation.
- **PWA Manifest & iOS Compatibility**:
  - `manifest.webmanifest` configured with `display: "standalone"`, `theme_color: "#1e293b"`, `background_color: "#0f172a"`.
  - iOS-specific `<meta name="apple-mobile-web-app-capable" content="yes">`, custom touch icons, and viewport padding (`env(safe-area-inset-bottom)`) for modern notch/home-bar iPhones.
- **Notifications**:
  - In-app toast/banner alerts for real-time threshold proximity (80% and 100%).
  - Web Notifications API (`Notification.requestPermission()`) for system-level notifications when threshold breaches or upcoming scheduled compensations occur.

### Rationale
- Guarantees seamless native-like experience on both Android (Chrome) and iOS (Safari 16.4+) without App Store publication overhead.

---

## 6. Summary of Resolved Technical Decisions

| Dimension | Selected Technology | Constitution Compliance |
|-----------|---------------------|-------------------------|
| **Frontend Framework** | Vue 3 + Vite + Tailwind CSS | High performance, lightweight bundle (<80KB gzip), mobile-first touch UI |
| **Offline Cache** | Dexie.js (IndexedDB) + Workbox PWA | Full offline entry & queueing; zero data loss |
| **Backend API** | Fastify (Node.js 20 LTS, TypeScript) | Ultra-fast (<15ms response), low memory (~40MB RSS) |
| **Database** | SQLite 3 (better-sqlite3) with WAL mode | Zero daemon overhead, embedded ACID, flash media wear protection |
| **Reporting Engine** | ExcelJS (XLSX) + Native CSV + jsPDF/PDFKit | Pure JS, no headless browser, lightweight, multi-format |
| **Deployment** | Docker & Docker Compose (Alpine base) | Single-command deployment, native ARM64 & AMD64 support |
