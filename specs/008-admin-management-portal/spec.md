# Feature Specification: Administrator Role & Management Portal

**Feature Branch**: `008-admin-management-portal`

**Created**: 2026-10-02

**Status**: Ready

**Input**: User description: "crie um acesso administrador, que pode gerenciar tudo inclusive usarios , relatorios de uso , acessos etc"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator Role & User Management (Priority: P1) 🎯 MVP

As an administrator, I want to access a dedicated administration area to view, create, edit, and deactivate user accounts, so that I can onboard team members, manage credentials, and control access permissions across the system.

**Why this priority**: Role-based access control and user lifecycle management are the foundation of any multi-user administrative system. Without the ability to designate administrators and manage user accounts, team oversight is impossible.

**Independent Test**: Can be fully tested by authenticating as an administrator, navigating to the Admin area, creating a new user with a specified role, modifying an existing user's details, resetting their password, and verifying that standard users cannot access these capabilities.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they navigate to the Admin Portal, **Then** they see an overview of all registered accounts including display name, username, email, role, status, and registration date.
2. **Given** an administrator in the User Management view, **When** they submit a form to create a new user with username, email, initial password, and role, **Then** the account is created, appears in the user list, and can immediately authenticate.
3. **Given** an administrator editing a user, **When** they update the user's role (promote to Administrator or demote to Standard User), **Then** the permission changes take effect immediately on subsequent requests.
4. **Given** an administrator editing a user, **When** they request a password reset, **Then** a new temporary or administrator-defined password is saved and the user can log in with the new credential.
5. **Given** an administrator attempting to delete or demote their own account while being the sole administrator in the system, **Then** the system rejects the operation with a clear error preventing administrative lockout.
6. **Given** a standard (non-admin) authenticated user, **When** they attempt to access any administrative route or endpoint, **Then** access is denied with an explicit 403 Forbidden status and redirection to the standard application view.

---

### User Story 2 - Access Auditing & Session Monitoring (Priority: P2)

As an administrator, I want to inspect access logs and active sessions across all users, including sign-in timestamps, IP addresses, and device/browser details, so that I can maintain security oversight, audit system activity, and terminate suspicious or abandoned sessions.

**Why this priority**: Security compliance and accountability require administrators to see who accessed the system and from where. In self-hosted or organizational contexts, tracking login history provides vital operational visibility.

**Independent Test**: Can be tested by performing logins from different browsers or test accounts, opening the Admin Access Logs view, and verifying that all login events and active sessions are chronologically recorded with IP address, client device information, and active status, with the option to revoke active sessions.

**Acceptance Scenarios**:

1. **Given** users have signed in to the application, **When** an administrator opens the Access Audit view, **Then** a chronological list of recent access events is displayed showing timestamp, username, IP address, user agent/device, and session status (active vs expired/revoked).
2. **Given** an administrator reviewing active sessions, **When** they select an active session and click "Revogar Sessão", **Then** that session is immediately invalidated and the targeted user is required to authenticate again on their next request.
3. **Given** an administrator searching for specific user activity, **When** they filter access logs by username or date range, **Then** only matching access events are displayed.

---

### User Story 3 - System-Wide Usage Reports & Analytics (Priority: P3)

As an administrator or manager, I want to view consolidated usage reports and metrics across all users—including total tracked overtime hours, balance surpluses, active contributors, and monthly activity trends—so that I can understand workload distribution and export management summaries.

**Why this priority**: Aggregated operational insights enable team leaders to evaluate overtime distribution, spot burnout risks, and prepare corporate compensation or payroll reports.

**Independent Test**: Can be tested by recording entries across multiple user accounts and viewing the Admin Usage Reports dashboard. The metrics must accurately reflect the sum and distribution of all entries across the platform, with filtering by date range and an option to export summary reports.

**Acceptance Scenarios**:

1. **Given** multiple users have recorded time entries and compensations, **When** an administrator opens the Usage Reports view, **Then** aggregate metrics are displayed: total overtime hours, total compensation hours, net platform balance, active users count, and monthly submission trends.
2. **Given** an administrator viewing usage reports, **When** they select a user breakdown tab, **Then** they see a per-user comparison showing individual total hours, last submission date, and current balance status.
3. **Given** an administrator reviewing a filtered report period, **When** they click "Exportar Relatório Consolidado", **Then** the system generates a downloadable summary document (CSV/PDF) containing the aggregated figures and user breakdown.

---

### Edge Cases

- **Sole Administrator Protection**: The system must strictly disallow deleting or demoting the last active administrator, ensuring at least one administrator account remains functional at all times.
- **Self-Account Deactivation**: An administrator cannot deactivate or ban their own currently active account from the admin console.
- **Duplicate User Credentials**: Attempting to create or edit a user with a username or email address that already belongs to another account must be rejected with a user-friendly validation error.
- **Session Revocation Concurrency**: When an admin revokes another user's active session while that user is in the middle of drafting an overtime entry offline, the client must preserve the local draft and prompt re-authentication before synchronizing.
- **Large Access Log Volumes**: The access logs view must implement pagination (e.g. 25/50 items per page) to prevent memory bloating and ensure snappy rendering on low-power mobile devices.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support distinct user roles: `admin` (Administrator) and `user` (Standard User).
- **FR-002**: System MUST guarantee that the initial existing user or first registered account is assigned the `admin` role by default.
- **FR-003**: System MUST restrict all administrative views, operations, and management endpoints to authenticated users with the `admin` role.
- **FR-004**: System MUST display an administrative navigation item and portal only to users possessing the `admin` role.
- **FR-005**: System MUST provide an administrative user management view listing all registered accounts with username, email, display name, role, registration date, and active status.
- **FR-006**: Administrators MUST be able to create new user accounts directly with username, email, display name, temporary password, and assigned role.
- **FR-007**: Administrators MUST be able to update existing user profiles, including modifying display name, email, and promoting or demoting roles between `user` and `admin`.
- **FR-008**: Administrators MUST be able to reset any user's password to a new administrator-specified credential.
- **FR-009**: Administrators MUST be able to deactivate or delete user accounts, with the strict restriction that the last remaining administrator account cannot be deactivated or deleted.
- **FR-010**: System MUST record access audit entries for user authentication events, capturing user reference, timestamp, IP address, user agent description, and session identifier.
- **FR-011**: System MUST provide an administrative access log view with pagination and search/filtering capabilities by username and date range.
- **FR-012**: Administrators MUST be able to view currently active sessions and revoke any individual active session or all sessions for a specific user.
- **FR-013**: System MUST provide an administrative usage report dashboard showing aggregate metrics: total registered users, active contributors in selected period, total overtime hours, total compensation hours, and net system balance.
- **FR-014**: System MUST provide a per-user breakdown within the usage report detailing hours logged, entries count, and balance status.
- **FR-015**: System MUST allow exporting consolidated administrative reports to a downloadable format (CSV and printable/PDF summary).
- **FR-016**: All interactive buttons, navigation links, and form controls across the administration portal MUST satisfy the mobile touch target minimum of 44x44px.

### Key Entities

- **User**: Represents a registered system member. Extended attributes include identifier, username, email, display name, hashed credential, role (`admin` | `user`), active status (active | deactivated), creation timestamp, and last login timestamp.
- **UserSession**: Represents an active authentication token. Attributes include session identifier, user reference, token hash, user agent, IP address, creation timestamp, last used timestamp, expiration timestamp, and revocation status.
- **AccessAuditLog**: Represents a recorded access or administrative event. Attributes include log identifier, user reference, event type (login, logout, session_revoked, user_created, role_changed, password_reset), IP address, user agent, timestamp, and event metadata.
- **UsageReportSummary**: Aggregated statistical model representing system-wide labor metrics over a specified date range.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of administrative endpoints reject requests from unauthenticated or non-admin users with an explicit 403 Forbidden status.
- **SC-002**: Administrators can complete new user creation and assign roles in under 30 seconds via the management interface.
- **SC-003**: System-wide usage reports load and render aggregated statistics in under 2 seconds for systems with up to 50 users and 50,000 entries.
- **SC-004**: Zero administrative lockouts: 100% of attempts to delete, deactivate, or demote the sole remaining administrator are blocked by safety validation.
- **SC-005**: Access logs capture 100% of user authentication and session creation events with IP and device metadata.
- **SC-006**: All interactive elements in the Admin Portal strictly comply with the 44x44px mobile touch target ergonomics standard.

## Assumptions

- **Role Simplicity**: A two-role hierarchy (`admin` and `user`) is sufficient for current organizational requirements without requiring complex granular permission matrices.
- **Initial Setup**: In single-user or legacy installations where users already exist without an explicit role, all existing users or the primary account are safely migrated to have the `admin` role to ensure uninterrupted access.
- **Data Scope for Reports**: Aggregated usage reports compile statistics from all non-deleted overtime and compensation records across the central database.
- **Privacy & Compliance**: Administrators have legitimate operational access to view work hour logs, entry notes, and user access records for business and operational oversight.
- **Offline Mode for Admins**: Administrative functions (user creation, role modification, global logs) require online connectivity to the central server, while normal overtime recording remains fully functional offline.
