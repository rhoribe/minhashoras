<!--
Sync Impact Report:
- Version change: Uninitialized -> 1.0.0
- Principles defined:
  * I. Mobile-First & Cross-Platform PWA
  * II. Offline-First Operation & Deterministic Sync
  * III. Minimalist Architecture & Resource Efficiency
  * IV. Reliable & Lightweight Database Persistence
  * V. Containerized Single-Node Deployment (Docker & Compose)
- Added sections:
  * Platform & Hardware Constraints (Raspberry Pi execution, flash wear mitigation, memory bounds)
  * Development, Testing & Verification Gates (Offline behavior verification, multi-arch build validation)
- Removed sections: None
- Follow-up TODOs: None
-->

# Minhas Horas Constitution

## Core Principles

### I. Mobile-First & Cross-Platform PWA
- The application user interface MUST prioritize mobile viewport ergonomics (touch targets >= 44x44px, bottom-oriented primary navigation, fluid responsive layouts) while gracefully scaling to desktop screens.
- Progressive Web App (PWA) standards MUST be strictly followed: valid Web App Manifest (`manifest.json`), service worker lifecycle management, and platform metadata for iOS (Safari mobile web app tags, apple-touch-icons) and Android (Chrome install prompts).
- Interactions MUST exhibit near-instant responsiveness, minimizing input latency and avoiding disruptive full-page reloads.
- *Rationale*: Overtime hours are recorded on personal mobile devices immediately following shifts; swift, frictionless mobile access is critical to adoption.

### II. Offline-First Operation & Deterministic Sync
- Core user operations—specifically recording overtime hours, viewing historical logs, and editing drafts—MUST function without an active internet connection.
- Client-side storage (e.g., IndexedDB) MUST serve as the local source of truth during offline or high-latency network states.
- Synchronization with the server database MUST trigger automatically upon connectivity restoration. Sync protocols MUST be idempotent, deterministic, and prevent silent data loss or overwrite.
- The interface MUST provide explicit visual cues regarding connection status and data sync state (e.g., "Offline - Saved locally", "Syncing", "Synced").
- *Rationale*: Shift workers and remote employees cannot depend on uninterrupted cellular or Wi-Fi connectivity at the time of entry.

### III. Minimalist Architecture & Resource Efficiency
- The system MUST maintain a simple architectural topology (single-tier or lightweight two-tier) without microservice orchestration, external message queues, or high-overhead enterprise runtimes.
- Components MUST be selected for low idle memory footprint (< 200MB baseline) and minimal background CPU consumption to accommodate resource-constrained single-board computers (Raspberry Pi).
- Code abstractions MUST adhere to YAGNI (You Aren't Gonna Need It); maintainable, cohesive, and direct solutions MUST take precedence over speculative flexibility.
- *Rationale*: The deployment environment is constrained to home-lab or edge hardware where compute and RAM must remain available for other services.

### IV. Reliable & Lightweight Database Persistence
- All overtime records, time intervals, and metadata MUST be durably stored in an ACID-compliant, lightweight relational database (such as SQLite with WAL mode or a lightweight PostgreSQL container).
- Database migrations MUST be automated, version-controlled, idempotent, and run during container startup before application traffic is served.
- Schema definitions MUST enforce strict data integrity, preventing invalid timestamps, negative durations, and conflicting interval submissions.
- *Rationale*: Overtime records represent labor time and compensation; data corruption or calculation discrepancies cannot be tolerated.

### V. Containerized Single-Node Deployment (Docker & Compose)
- The production stack MUST run reliably via a standard `docker compose up -d` workflow without requiring external cloud dependencies.
- Container images MUST support multi-architecture compilation, explicitly targeting `linux/arm64` (Raspberry Pi 3/4/5) and `linux/amd64`.
- Dockerfiles MUST use minimal base images (e.g., Alpine or distroless), incorporate unprivileged users, and implement container healthchecks for automated orchestrator monitoring.
- All persistent data (database files, uploads, logs) MUST reside in explicitly declared Docker named volumes or bind mounts.
- *Rationale*: Self-hosting on a Raspberry Pi demands deterministic deployments, easy updates, and isolated dependencies.

## Platform & Hardware Constraints
- **Target Node**: Single-board computers running Linux on ARM64 (e.g., Raspberry Pi 4/5) with Docker and Docker Compose.
- **Flash Storage Longevity**: Write patterns SHOULD minimize unnecessary disk thrashing to protect MicroSD cards and flash media from premature wear.
- **Resource Reservations**: Compose configurations SHOULD declare memory limits to prevent out-of-memory (OOM) kernel panics on the host node.
- **TLS & Network Boundary**: Production exposure MUST support reverse-proxy deployment (e.g., Caddy, Traefik, or Nginx) with HTTPS termination, which is mandatory for PWA Service Worker operation.

## Development, Testing & Verification Gates
- **Offline & Sync Verification**: Features involving state transitions MUST include automated or reproducible manual test scenarios verifying offline entry, queuing, and clean recovery upon reconnection.
- **Cross-Platform Mobile Testing**: Service worker behavior, offline caching, and PWA installation MUST be validated on iOS (WebKit) and Android (Chromium).
- **Container Build Validation**: CI and release procedures MUST verify that container images build and pass healthchecks on target architectures (`arm64` and `amd64`).
- **Data Integrity Gates**: Automated migration tests MUST verify backward and forward schema compatibility without data loss.

## Governance
- **Authority**: This Constitution supersedes all ad-hoc conventions. Any proposed architectural changes, added libraries, or design patterns MUST adhere to the principles outlined here.
- **Amendment Process**: Amendments require:
  1. Clear justification addressing resource impact on Raspberry Pi hardware and offline capabilities.
  2. A documented update to this file with an appropriate version increment.
  3. Alignment updates across active specs and plans.
- **Versioning Policy**: Semantic versioning (MAJOR.MINOR.PATCH) governs this document:
  - **MAJOR**: Fundamental changes to architecture (e.g., abandoning offline-first, migrating to distributed cloud microservices).
  - **MINOR**: Adding new principles, mandatory development gates, or expanded hardware constraints.
  - **PATCH**: Clarifications, non-substantive rewording, and documentation fixes.
- **Compliance Review**: All future Spec Kit artifacts (`spec.md`, `plan.md`, `tasks.md`) MUST verify compliance against this Constitution.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
