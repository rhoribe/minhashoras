# Feature Specification: Desktop Responsive UI & Layout Craft

**Feature Branch**: `003-desktop-responsive-ui`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "usando a skill impaccable melhore a interface quando abre no navegador do computador , tem que ser mais responsivo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adaptive App Shell & Desktop Navigation (Priority: P1) 🎯 MVP

As a user opening the application on a desktop or laptop computer browser, I want the application container to expand beyond the narrow mobile phone column (`max-w-md`) into a spacious, responsive layout with a dedicated desktop navigation sidebar, while seamlessly preserving the mobile bottom navigation on phone viewports.

**Why this priority**: Currently, the application hardcodes a mobile phone layout (`max-w-md` / 448px width) even on 1080p, 1440p, or 4K monitors, resulting in massive wasted lateral space, awkward centering, and poor ergonomics for computer users. An adaptive responsive app shell is the fundamental prerequisite for all desktop improvements.

**Independent Test**: Can be tested independently by opening the application on a desktop browser (> 1024px width) and confirming that the application occupies a comfortable wide-screen layout with a persistent left-hand navigation sidebar and top header, and then resizing the browser window to mobile width (< 768px) and confirming that it smoothly transitions back to the mobile header and bottom navigation bar without layout jitter or broken styling.

**Acceptance Scenarios**:

1. **Given** a user accessing the application on a desktop browser ($\ge 1024\text{px}$ width), **When** they view any page, **Then** the interface displays an integrated desktop sidebar containing the brand header, primary navigation links with active indicators, user profile badge, and theme switcher, while eliminating the mobile bottom navigation bar.
2. **Given** a user resizing their browser between mobile (< 768px), tablet (768px–1023px), and desktop ($\ge 1024\text{px}$) viewports, **When** crossing breakpoints, **Then** navigation, containers, and spacing adapt fluidly without page reload, horizontal scrollbars, or layout clipping.
3. **Given** a user on a mobile device or narrow viewport (< 768px), **When** interacting with the app, **Then** the touch-ergonomic mobile bottom navigation bar and touch targets ($\ge 44\times 44\text{px}$) remain fully intact, strictly adhering to Constitution Principle I (Mobile-First PWA).
4. **Given** desktop usage, **When** navigating between routes, **Then** the main content area utilizes a max container width (e.g. up to 1280px / `max-w-7xl`) centered with generous padding and clear visual hierarchy.

---

### User Story 2 - Multi-Column Desktop Dashboard & Analytics (Priority: P2)

As an employee managing my overtime hours on a computer, I want the Dashboard to present balance summaries, limit warnings, and recent activity in a balanced multi-column grid layout so that I can see my full labor status at a single glance without unnecessary vertical scrolling.

**Why this priority**: The Dashboard is the primary landing surface. On a wide screen, stacking cards vertically forces users to scroll down just to view quick actions or recent entries. A multi-column dashboard delivers immediate analytical clarity.

**Independent Test**: Can be tested independently by viewing the Dashboard on a desktop screen with multiple logged overtime entries, verifying that the Balance Card, Warning Banner, and Quick Action buttons sit alongside or above a side-by-side recent entries table/card list, filling the screen width harmoniously without awkward empty gaps.

**Acceptance Scenarios**:

1. **Given** a desktop viewport ($\ge 1024\text{px}$), **When** the user navigates to the Dashboard, **Then** the main balance summary and limit alerts render in a prominent overview panel, while quick actions and recent overtime activities arrange into an ergonomic multi-column grid.
2. **Given** a medium viewport (tablet, 768px–1023px), **When** viewing the Dashboard, **Then** metrics cards display in a 2-column grid that cleanly stacks below the balance summary.
3. **Given** desktop resolution, **When** quick action buttons ("Registrar Horas", "Compensações") are displayed, **Then** they maintain prominent visual affordance with hover states, keyboard focus rings, and tactile feedback without occupying disproportionate vertical space.

---

### User Story 3 - Responsive Tables & Expanded Views for Records & Reports (Priority: P3)

As a worker reviewing my monthly overtime history or exporting time reports on a desktop computer, I want records and report screens to display structured, comprehensive tabular data with inline actions and desktop-optimized filter controls.

**Why this priority**: Viewing dense tables and exporting reports (CSV, Excel, PDF) are task-intensive desktop activities. On wide monitors, full data tables with distinct columns (Date, Start, End, Break, Total, Category, Status, Actions) provide far better scanability than vertically stacked mobile list cards.

**Independent Test**: Can be tested independently by opening the "Registros" and "Relatórios" screens on a desktop browser, confirming that records render in a full responsive data table with readable typography, sortable or filterable columns, and accessible action buttons, while gracefully switching to card lists on mobile viewports.

**Acceptance Scenarios**:

1. **Given** a desktop viewport, **When** navigating to "Registros", **Then** overtime records render in a responsive data table showing columns for Date, Shift Times, Break, Net Hours, Category, Sync Status, and Edit/Delete actions in a single horizontal row per entry.
2. **Given** a desktop viewport, **When** navigating to "Relatórios", **Then** the report configuration panel and export preview display side-by-side or in an expanded desktop layout, allowing users to inspect the generated report before downloading CSV, XLSX, or PDF.
3. **Given** a user searching or filtering by month, **When** selecting date ranges on desktop, **Then** date pickers and filter controls sit neatly in a horizontal toolbar above the table rather than stacked vertically.

---

### User Story 4 - Desktop Modals, Forms & Settings Layout (Priority: P4)

As a user creating an overtime record or adjusting settings on a computer, I want dialog modals and settings screens to have proportionate desktop sizing, keyboard navigation ergonomics (Esc to close, Enter to submit), and a two-column settings arrangement.

**Why this priority**: Mobile-only modals that stretch awkwardly or lock to the bottom edge of a 27-inch desktop screen feel broken. Proper dialog centering, balanced widths, and keyboard convenience create an out-of-distribution desktop user experience.

**Independent Test**: Can be tested independently by opening the "Registrar Horas" modal on a desktop computer, verifying it appears as an elegantly centered, backdrop-blurred dialog with comfortable max-width, autofocus on the date input, and responsive keyboard dismissal (`Esc`), and inspecting the "Ajustes" page for a balanced two-column presentation.

**Acceptance Scenarios**:

1. **Given** a user on a desktop screen, **When** they click "Registrar Horas" or edit a record, **Then** the form appears in a centered dialog modal (not an edge-anchored bottom sheet) with subtle drop shadow, backdrop blur, and max width tailored for form entry (e.g. ~540px).
2. **Given** an open modal on desktop, **When** the user presses the `Escape` key, **Then** the modal closes cleanly without saving unsaved changes.
3. **Given** a desktop viewport on the "Ajustes" (Settings) screen, **When** viewed, **Then** the settings panels (User Profile & Time Bank Limits on the left, Appearance / Theme & Notifications on the right) align in a responsive two-column grid.
4. **Given** a user on the dedicated Authentication/Login view on desktop, **When** the page renders, **Then** the authentication card is comfortably centered with high-craft subtle borders, elevation, and backdrop reflections rather than filling the entire screen awkwardly.

---

### Edge Cases

- **Ultrawide & 4K Monitors ($\ge 2560\text{px}$)**: The content container has a maximum bounding width (e.g. `max-w-7xl` / 1280px - 1440px) with centered alignment to prevent cards, tables, and text lines from becoming illegibly wide.
- **Split-Screen & Tiling Window Managers**: When a desktop user snaps the browser to half-screen (e.g., 640px or 960px width), the layout dynamically shifts between sidebar and compact/drawer navigation without breaking or clipping content.
- **Tablet in Portrait vs Landscape**: Tablets in portrait (< 768px or 768px-820px) show the compact touch-optimized navigation, while landscape mode ($\ge 1024\text{px}$) expands to the full desktop sidebar view.
- **Touchscreen Laptops & Hybrids**: Touch ergonomics ($\ge 44\times 44\text{px}$ interactive bounds) remain preserved even on desktop layouts, ensuring hybrid touchscreen devices (Surface, iPad Pro with keyboard) remain effortless to tap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a responsive application shell that dynamically adapts between a mobile layout (< 768px) and an expanded desktop layout ($\ge 768\text{px}$ / $\ge 1024\text{px}$) without requiring full page reloads.
- **FR-002**: On viewports $\ge 1024\text{px}$, system MUST render a dedicated desktop sidebar navigation featuring application branding, active route highlighting, user profile summary, and instant theme toggling.
- **FR-003**: On viewports $< 768\text{px}$, system MUST retain the existing bottom navigation bar with 44px minimum touch targets and safe-area padding per Constitution Principle I.
- **FR-004**: System MUST structure the main desktop content container within a maximum width boundary (`max-w-7xl`) centered on screen to ensure optimal line lengths and scannability on ultrawide monitors.
- **FR-005**: Dashboard view MUST utilize a responsive multi-column grid on viewports $\ge 1024\text{px}$, displaying balance summaries, safety limits, and recent activity side-by-side.
- **FR-006**: Overtime Records view MUST provide a responsive data table on viewports $\ge 768\text{px}$ displaying complete column information (Date, Shift Times, Break, Net Hours, Category, Status, Actions) with inline action buttons.
- **FR-007**: Reports view MUST format export options, time interval selectors, and table previews into a multi-column desktop layout that eliminates unnecessary vertical scrolling.
- **FR-008**: Settings view MUST organize configuration cards into a balanced two-column grid on desktop screens ($\ge 1024\text{px}$).
- **FR-009**: Dialog modals (e.g. Overtime Entry Form) MUST render as centered dialogs on desktop screens with keyboard accessibility (`Escape` key to close) and backdrop blur.
- **FR-010**: All interactive controls across desktop and mobile layouts MUST maintain minimum interactive dimensions ($\ge 44\times 44\text{px}$) and clear `:focus-visible` accessibility indicators.
- **FR-011**: Both Light and Dark theme palettes established in feature 002 MUST apply consistently across all desktop components, sidebars, tables, and dialog surfaces with WCAG AA contrast compliance ($\ge 4.5:1$).
- **FR-012**: Layout transitions between responsive breakpoints MUST complete smoothly under 100ms with zero horizontal scroll bleed or content overflow.

### Key Entities

- **Viewport Layout State**: Client-side reactive representation of current display mode (`mobile` < 768px, `tablet` 768px–1023px, `desktop` $\ge 1024\text{px}$).
- **Responsive Navigation Config**: Unified navigation structure shared between the mobile bottom bar and the desktop sidebar containing route path, icon component, localized label, and access guards.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pages (Dashboard, Records, Compensations, Reports, Settings, Login) render without horizontal scrollbars across all screen widths from 360px up to 3840px (4K).
- **SC-002**: On desktop monitors ($\ge 1024\text{px}$), usable horizontal content utilization increases by at least 150% compared to the incumbent 448px phone shell, displaying multi-column dashboards and data tables.
- **SC-003**: Desktop users can navigate between any two primary views in under 2 clicks via the persistent desktop sidebar.
- **SC-004**: 100% of interactive controls (buttons, links, inputs, table actions) maintain at least $44\times 44\text{px}$ click/touch targets across both mobile and desktop viewports.
- **SC-005**: All text and interactive surfaces in both Light and Dark themes maintain a contrast ratio of at least 4.5:1 for body text and 3.0:1 for graphical elements, passing WCAG 2.1 Level AA audits.
- **SC-006**: Modals and dialogs on desktop support keyboard dismissal via `Escape` key and click-outside dismissal in 100% of instances.

## Assumptions

- **PWA & Offline Continuity**: Responsive layout enhancements are purely presentation-tier client updates and do not alter backend APIs, database schemas, or offline synchronization mechanics.
- **Breakpoints Standard**: Uses standard Tailwind CSS responsive breakpoints (`md: 768px`, `lg: 1024px`, `xl: 1280px`) for consistent behavior.
- **Mobile First Compatibility**: All existing mobile ergonomics, bottom sheets on phones, and PWA manifest installations remain 100% functional and uncompromised.
- **Component Reusability**: Existing domain logic, calculations, and services are preserved; components are adapted with responsive CSS utilities and structural layouts.
