# Feature Specification: Default Admin Bootstrap with Mandatory Password Change & User Self-Service Deletion

**Feature Branch**: `010-admin-setup-and-user-self-delete`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "corrija criei um unico usario admin, com um senha padrao admin123 que deve ser trocada no primeiro acesso, cada usuario que se cadastrar nao pode ter acesso de administrador , mas pode apagar os seus proprios dados , como conta e registros"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Default Admin Bootstrap & Mandatory First-Access Password Change (Priority: P1) 🎯 MVP

When a new instance is deployed or initialized, there is a known, predictable administrative user (`admin`) with a temporary default password (`admin123`). When the administrator logs into this account for the first time, the application detects that the password must be updated before any other operation is permitted. The administrator is guided to a mandatory password change screen. Until a new, secure password is created and confirmed, all other screens and APIs remain inaccessible. Once changed, the flag is cleared and the administrator is granted full access to the application.

**Why this priority**: Solves the initial administrative bootstrap problem securely: provides an immediate, standard entry point while strictly enforcing that default credentials cannot remain in use.

**Independent Test**: Log in with `admin` / `admin123`, verify that the system forces a password change and blocks navigating to the main dashboard. Set a new password, verify successful update, and confirm normal access is now enabled.

**Acceptance Scenarios**:

1. **Given** a newly deployed or reset system with default admin credentials, **When** the administrator authenticates with `admin` and `admin123`, **Then** the application flags the session as requiring password change and presents the mandatory password change interface.
2. **Given** a user requiring password change, **When** they attempt to browse to `/`, `/admin`, or query operational APIs, **Then** access is blocked until the password is changed.
3. **Given** the mandatory password change screen, **When** the administrator provides a valid new password meeting security criteria, **Then** the password is updated, the requirement flag is cleared, and the administrator is directed to the application dashboard.

---

### User Story 2 - Standard User Self-Registration Policy & Privilege Boundary (Priority: P2)

When an employee or user creates an account via the public registration screen ("Criar Conta"), the system automatically assigns them standard user privileges (`role: 'user'`). Under no circumstances can a user grant themselves administrator rights via public registration. Non-administrator users can record and view their own overtime entries and personal settings, but are strictly barred from administrative management views, system audits, or global reports.

**Why this priority**: Enforces security and privacy boundaries so that self-registering users do not gain unauthorized administrative power or access to other employees' sensitive records.

**Independent Test**: Register a new user through the public registration form; verify that their role is strictly `user`, that they can track their own overtime hours, and that any attempt to open `/admin` is rejected with an authorization error.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the registration screen, **When** they fill out the form and submit their account details, **Then** the account is created with standard user privileges (`role: 'user'`) regardless of any parameters sent.
2. **Given** an authenticated user with standard privileges, **When** they attempt to access the administrative dashboard (`/admin`) or administrative endpoints, **Then** the application redirects them or rejects the request with HTTP 403 Forbidden.

---

### User Story 3 - Self-Service Account & Data Deletion (Priority: P3)

A user wants to exercise full control over their personal data. In the application settings/profile area, a standard user can initiate the permanent deletion of their account and all associated operational records. After presenting a clear warning and requiring deliberate confirmation (e.g., entering their current password or confirming in a dialog), the system permanently deletes their user profile, overtime entries, compensation schedules, and preferences. The local client storage is also completely wiped, and the user is logged out and returned to the initial welcome screen.

**Why this priority**: Fulfills user autonomy and data privacy requirements, enabling users to purge their personal hours and account when they leave or wish to restart their personal tracking.

**Independent Test**: Create several overtime entries and compensation schedules as a standard user, go to Settings, execute "Excluir Minha Conta", confirm the action; verify that all records for that user and the user account are gone from the database, local storage is cleared, and the browser is logged out.

**Acceptance Scenarios**:

1. **Given** a standard user in their account settings, **When** they choose "Excluir Minha Conta e Meus Dados" and provide valid confirmation, **Then** all overtime records, compensation records, time bank settings, and their user account are permanently removed from the system.
2. **Given** an account deletion request, **When** the server completes deletion, **Then** the client purges all local storage and IndexedDB records, and redirects to the login screen.
3. **Given** an administrator who is currently the sole active administrator of the instance, **When** they attempt to self-delete via this feature, **Then** the system blocks the action to prevent instance lockout.

---

### Edge Cases

- **Navigating Away During Forced Password Change**: If the user reloads the browser, clicks the back button, or opens a new tab while in the `must_change_password` state, the application router guard immediately redirects back to the password change view.
- **Payload Tampering During Registration**: If a malicious client sends `{ "role": "admin" }` in the public `POST /api/v1/auth/register` payload, the server explicitly ignores or overwrites the field with `'user'`.
- **Offline Self-Deletion**: Self-service account deletion requires server connectivity to ensure the cloud/database record is eradicated; if the user is offline, an informative message notifies them that account deletion requires an active network connection.
- **Sole Administrator Protection**: If an administrator attempts to delete their own account and they are the only remaining active admin, the system denies the deletion and instructs them to assign another administrator first.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically seed or ensure the existence of a single default administrator account with username `admin` and initial password `admin123` if no active administrator exists in the database.
- **FR-002**: The system MUST support a `must_change_password` boolean attribute on user accounts.
- **FR-003**: The default seeded administrator account MUST have `must_change_password = 1` set upon creation.
- **FR-004**: While `must_change_password` is active for a session, the system MUST restrict the user from accessing any application views or endpoints other than the password update endpoint and logout.
- **FR-005**: Updating the password when `must_change_password` is active MUST reset the flag to `0` upon successful password update.
- **FR-006**: Public user self-registration (`POST /api/v1/auth/register`) MUST strictly assign `role: 'user'` and ignore any client-supplied role value.
- **FR-007**: The system MUST restrict administrative capabilities exclusively to accounts with `role: 'admin'`. Standard users attempting to access `/admin` or `/api/v1/admin/*` MUST receive HTTP 403 Forbidden.
- **FR-008**: Any authenticated user MUST be able to delete their own account and all associated personal data via a self-service endpoint (`DELETE /api/v1/auth/me` or `/api/v1/users/me`).
- **FR-009**: Self-service account deletion MUST atomically delete all overtime records, compensation schedules, time bank balances, user preferences, and sessions belonging to that user.
- **FR-010**: Upon self-service account deletion, the client application MUST clear all local storage and IndexedDB caches, terminating the local session and redirecting to the login view.
- **FR-011**: The system MUST prevent self-service account deletion for the last active administrator, returning an error explaining that the instance must have at least one active administrator.

### Key Entities

- **User**:
  - `id`: Unique identifier
  - `username`: Unique username (e.g. `'admin'`)
  - `role`: Role of the user (`'admin' | 'user'`)
  - `must_change_password`: Boolean indicator (1 or 0) indicating whether password change is mandatory before normal use.
- **AccountDeletionRequest**:
  - `confirmation`: Confirmation keyword or password verifying the user's intent to permanently delete their account and personal records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Initial system bootstrap produces a functional `admin` user with password `admin123` requiring password change on first login.
- **SC-002**: 100% of requests to operational views/APIs by a user with `must_change_password: true` are blocked until a new password is set.
- **SC-003**: 100% of accounts registered through public registration are created with `role: 'user'`.
- **SC-004**: Self-service account deletion executes within 3 seconds and leaves zero orphaned overtime or compensation records for the deleted user.
- **SC-005**: 100% of self-deleting users have their local client offline cache completely eradicated upon deletion.

## Assumptions

- The default administrator username is `admin` and the temporary password is `admin123`.
- Any existing users upgraded in earlier migrations are either reconciled or `admin` is explicitly seeded if not already present.
- A dedicated password change modal or screen will be presented to users who have `must_change_password: true`.
- The user account deletion option will be located in the user's Settings view under an "Excluir Minha Conta" card.
