# Data Model & Presentation Schemas: Desktop Responsive UI

**Feature Branch**: `003-desktop-responsive-ui`
**Date**: 2026-10-01

## 1. Client Presentation State

### Schema 1: Viewport State (`useBreakpoint`)
Represents the reactive client viewport characteristics for adaptive rendering.

| Field | Type | Description |
| :--- | :--- | :--- |
| `width` | `Ref<number>` | Current viewport pixel width. |
| `breakpoint` | `ComputedRef<'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'>` | Active Tailwind CSS breakpoint. |
| `isMobile` | `ComputedRef<boolean>` | `true` if width < 768px (`md`). |
| `isTablet` | `ComputedRef<boolean>` | `true` if 768px $\le$ width < 1024px (`lg`). |
| `isDesktop` | `ComputedRef<boolean>` | `true` if width $\ge$ 1024px (`lg`). |

**Breakpoint Thresholds**:
- `sm`: 640px
- `md`: 768px (boundary between Mobile bottom-nav and Desktop sidebar)
- `lg`: 1024px (boundary for full desktop layout and multi-column grid)
- `xl`: 1280px (content container max boundary: `max-w-7xl`)
- `2xl`: 1536px

---

### Schema 2: Navigation Item (`NavItem`)
Represents a navigation destination rendered across both the Mobile Bottom Bar and the Desktop Sidebar.

| Field | Type | Description |
| :--- | :--- | :--- |
| `label` | `string` | Human-readable localized title (e.g. `'Painel'`, `'Registros'`). |
| `path` | `string` | Route path (e.g. `'/'`, `'/records'`). |
| `icon` | `Component` | Lucide icon component. |
| `shortcut` | `string?` | Optional desktop keyboard shortcut (e.g. `'Alt+1'`). |
| `badge` | `string?` | Optional reactive count indicator. |

---

### Schema 3: Responsive Table Column Definition (`TableColumn`)
Represents structured columns for desktop overtime records and reports tables.

| Field | Type | Description |
| :--- | :--- | :--- |
| `key` | `string` | Entity attribute key (e.g. `'record_date'`, `'net_overtime_minutes'`). |
| `header` | `string` | Localized column header label. |
| `align` | `'left' \| 'center' \| 'right'` | Text alignment within header and cells. |
| `minWidth` | `string?` | CSS minimum width (e.g. `'120px'`). |
| `hideOnMobile` | `boolean` | When `true`, column is hidden on viewports < 768px. |

---

## 2. Layout Hierarchy & Shell Composition

```mermaid
graph TD
    App[App.vue] --> Layout[AppLayout.vue]
    
    subgraph MobileLayout ["Mobile Viewport (< 768px)"]
        Layout --> MobileHeader[Top Compact Header]
        Layout --> MobileContent[Single-Column Content (max-w-md)]
        Layout --> MobileNav[Fixed Bottom Navigation Bar]
    end

    subgraph DesktopLayout ["Desktop Viewport (>= 1024px)"]
        Layout --> DesktopSidebar[Fixed Left Sidebar: Brand + Nav + User + Theme]
        Layout --> DesktopMain[Expanded Main Container (max-w-7xl)]
        DesktopMain --> DesktopTopBar[Top Context Bar / Breadcrumbs / Quick Actions]
        DesktopMain --> DesktopGrid[Multi-Column Responsive View Grid]
    end
```
