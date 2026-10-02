# Research & Technical Decisions: Desktop Responsive UI & Layout Craft

**Feature Branch**: `003-desktop-responsive-ui`
**Date**: 2026-10-01

## 1. Adaptive App Shell & Desktop Navigation Architecture

### Decision
Implement a responsive application shell in `client/src/components/layout/AppLayout.vue` and a dedicated desktop sidebar component `client/src/components/layout/DesktopSidebar.vue`.
- **Desktop ($\ge 1024\text{px}$ / `lg:`)**: Display a fixed-width left navigation sidebar (256px / `w-64`) with brand logo, primary navigation links with active pill indicators, user identity badge, and embedded theme toggle. The top app bar simplifies into a clean breadcrumb/header, and the mobile bottom navigation bar is hidden (`hidden lg:flex` for sidebar, `lg:hidden` for mobile bottom nav).
- **Tablet ($768\text{px} - 1023\text{px}$ / `md:`)**: Display an icon-rail sidebar (80px / `w-20`) or top header navigation to maximize horizontal content area.
- **Mobile ($< 768\text{px}$)**: Preserve 100% of the existing mobile layout with top header, connection badge, mobile bottom bar, and $\ge 44\times 44\text{px}$ touch targets.
- **Container Sizing**: Replace rigid `max-w-md` shell with `max-w-7xl` centered viewport container (`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`).

### Rationale
- **Constitution Principle I Alignment**: The constitution mandates prioritizing mobile viewports while "gracefully scaling to desktop screens". Hardcoding `max-w-md` (448px) violated desktop ergonomics.
- **Impeccable Skill Standards**: Operating mode requires high scanability, efficient task completion, and clear visual hierarchy. A left sidebar on desktop is the standard modern SaaS pattern, reducing mouse travel distance and cognitive friction.
- **Zero Layout Shift (CLS)**: CSS media queries (`hidden lg:block`, `lg:hidden`) handle the layout switches at build/style time without JavaScript hydration delay or flash.

### Alternatives Considered
- *Header-only top navigation on desktop*: Rejected because top navigation reduces vertical reading area on standard 16:9 laptop screens (1366x768 or 1920x1080) and fails to scale nicely if future navigation items are added.
- *Floating dock*: Rejected due to high visual distraction and lack of conventional enterprise ergonomics.

---

## 2. Multi-Column Dashboard & Grid Strategy

### Decision
Refactor `DashboardView.vue` and its child components (`BalanceCard.vue`, `LimitAlertBanner.vue`) using Tailwind CSS Grid:
- **Mobile (`< md:`)**: 1-column vertical stack (Banner -> Balance -> Quick Actions -> Recent Entries).
- **Desktop (`>= lg:`)**: Asymmetric 12-column grid (`grid grid-cols-1 lg:grid-cols-12 gap-6`):
  - Left column (7 or 8 cols): Limit Alert Banner, Primary Balance Card with expanded metrics breakdown (positive, negative, projected), and prominent Quick Action cards.
  - Right column (4 or 5 cols): Recent Overtime Shifts list, quick statistics card, and direct shortcuts.

### Rationale
- High-craft dashboards avoid huge stretched single-column cards across 1920px. Dividing the surface into operational zones (Status/Actions on one side, Recent History on the other) keeps line lengths optimal (45-75 characters) and eliminates excessive vertical scrolling.

### Alternatives Considered
- *Equal-width 3-column cards*: Rejected because the Balance Card represents the primary focal entity and requires higher visual prominence than auxiliary recent entries.

---

## 3. Responsive Data Tables vs Card Lists for Records

### Decision
Implement a responsive presentation in `client/src/components/records/RecordList.vue` and `RecordsView.vue`:
- On viewports `< 768px`: Render touch-friendly cards with badge tags, quick edit tap targets, and swipe/tap affordances.
- On viewports $\ge 768px$: Render an Impeccable tabular view (`<table class="w-full text-left border-collapse">`) with explicit columns:
  1. **Data** (e.g. `01/10/2026`)
  2. **Horário** (e.g. `18:00 - 20:30`)
  3. **Intervalo** (e.g. `30 min`)
  4. **Total Líquido** (e.g. `+2h 00m` in green badge)
  5. **Categoria** (e.g. `Padrão` badge)
  6. **Sincronização** (e.g. `Sincronizado` / `Pendente`)
  7. **Ações** (Editar e Excluir with tooltip and keyboard focus ring)

### Rationale
- Dense tabular information is vastly superior on computer monitors for scanability, comparative scanning of dates and shift lengths, and fast batch review.
- Keeping the card list on mobile ensures zero regression for shift workers logging hours on phones.

---

## 4. Modal Dialogs & Keyboard Navigation Ergonomics

### Decision
Adapt `OvertimeFormModal.vue` and other dialogs:
- **Mobile**: Anchored bottom-sheet with drag pill or full-height overlay for easy thumb reach.
- **Desktop**: Centered modal with `max-w-lg` (512px) or `max-w-xl` (576px), elegant backdrop blur (`backdrop-blur-sm bg-slate-900/40`), subtle border and elevation (`shadow-2xl`), autofocus on first input, and native `keydown` listener for `Escape` key to close.

### Rationale
- Bottom sheets feel unnatural and detached on 27-inch monitors. Centered modals align with native desktop dialog expectations. Keyboard accessibility (`Esc` to dismiss) is an essential hallmark of software craft.

---

## 5. Viewport Detection & Testing Utilities

### Decision
Create a lightweight reactive composable `client/src/composables/useBreakpoint.ts` using `window.matchMedia`:
```typescript
export function useBreakpoint() {
  // reactive matches for mobile (<768px), tablet (768-1023px), desktop (>=1024px)
}
```
And add automated Vitest component/layout tests in `tests/client/responsive-layout.test.ts`.

### Rationale
- While 95% of styling is handled directly via Tailwind responsive prefixes (`hidden lg:flex`, `grid-cols-1 lg:grid-cols-12`), certain interactive components (like dynamically switching between a slide-over sheet and a centered modal, or table vs card rendering) benefit from clean programmatic awareness without DOM thrashing.
