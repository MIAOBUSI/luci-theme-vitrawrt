# VitraWrt Stage 1.13 Design Mapping

Stage 1.13 maps native LuCI DOM to VitraWrt components before styling. The theme must preserve native LuCI lifecycle and use this mapping as a safe visual boundary.

| LuCI native selector / structure | VitraWrt component name | Visual target | Safe styling boundary |
|---|---|---|---|
| `html`, `body`, `#maincontent`, shell wrappers | Page Shell | Ice grey background, subtle violet diffusion, native LuCI density | Background, font, shell padding only; no transform/filter/perspective |
| `.vitra-sidebar`, `.vitra-nav`, `.vitra-menu-*` | Premium Management Rail | Frosted management sidebar with muted icons and glass active state | VitraWrt-owned sidebar only; no LuCI content manipulation |
| top alert / password warning | Console Notice Banner | Soft glass warning, readable and restrained | Color, border, radius, shadow, padding only |
| page title / descriptions | Page Header Typography | Graphite title and muted description | Text color, font weight, spacing only |
| `.cbi-map` | Config Map Panel | Large glass config panel | Visual surface only; no display or max-width rewrite |
| `.cbi-section` | Native Section Panel | Frosted section card | Visual surface only; no global overflow/table layout |
| `.cbi-section-node` | Section Content Layer | Inner glass content layer | Border/background/padding only; no display/flex/grid |
| `.cbi-value` | Form Row | Precise row rhythm | Padding, margin, borders only; no layout takeover |
| `.cbi-value-title` | Field Label | Muted graphite label | Font, color, line height only |
| `.cbi-value-field` | Field Control Zone | Native control area | Color and spacing only |
| text input | Glass Text Field | Unified frosted field | Background, border, radius, focus ring; no global width |
| `select` | Glass Native Select | Same field language | Do not style `option` lifecycle |
| `textarea` | Glass Text Area | Readable text surface | No forced narrow width |
| checkbox | Compact Choice Input | Native control with theme accent | `accent-color` and focus only |
| radio | Compact Choice Input | Native control with theme accent | `accent-color` and focus only |
| `.cbi-dropdown` | LuCI Glass Dropdown | Closed glass trigger and open glass popover | No display/visibility/pointer-events/open-state control |
| `.cbi-dynlist` | Dynamic List Field | Field-like dynamic list | Do not hide add/remove/up/down or change internal display |
| `.tabs`, `.cbi-tabmenu`, `#tabmenu` | Floating Pill Tabs | Independent glass pills | No tab content display, active class, aria, or click changes |
| tab content / `[data-tab]` | Native Tab Panel | Native visibility lifecycle | No global hidden/display guesses |
| `table`, `.table`, `.cbi-section-table` | Native Data Table | Glass table surface and soft rows | No global table-layout, nowrap, display, width, overflow |
| package table | Package Action Table | Natural action buttons | Existing page-scoped fix only |
| process table | Process Runtime Table | Scan-friendly process rows | Existing page-scoped fix only |
| startup table | Startup Script Table | Aligned startup columns | Existing page-scoped fix only |
| syslog filters | Log Filter Controls | Natural filters and wide log area | Existing page-scoped fix only |
| progress bars | Vitreous Progress Trough | Glass trough with restrained fill | No JS redraw, no forced value/width |
| `.ifacebox` | Port Status Mini Card | Compact refined port card | Outer visual skin only; native hover remains |
| network upstream card | Network Mini Card | Compact glass network status | No forced full width or centering |
| apply bar | Floating Apply Dock | Fit-content action dock | No force show/hide or lifecycle change |
| save/apply/reset buttons | Console Buttons | Neutral glass, restrained primary, soft danger | No global width or behavior changes |
| modal overlay | Glass Backdrop | Dimmed diffusion backdrop | No pointer-events/display lifecycle changes |
| modal sheet | Glass Modal Sheet | Frosted dialog with clear header/body/footer | No position/z-index/display/close changes |
| modal tabs | Modal Pill Tabs | Same tab visual system | No lifecycle changes |
| loading spinner | Loading Glass Sheet | Small glass waiting state | Do not hide or delay spinner |
| applying changes dialog | Apply Waiting Sheet | Glass applying/saving state | No force show/hide |
| session timeout dialog | Session Glass Dialog | Glass session prompt | No auth or form logic changes |
| login page | Premium Login Sheet | Compact glass login with balanced logo | No auth logic, field name, or form action changes |

