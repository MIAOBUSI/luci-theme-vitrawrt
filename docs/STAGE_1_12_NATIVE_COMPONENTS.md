# Stage 1.12 Native Component Visual System

Stage 1.12 upgrades VitraWrt native LuCI visual identity without changing native LuCI behavior.

## Scope

- Collapsed sidebar recognition through visible local SVG icons.
- VitraWrt-owned collapsed sidebar tooltips via `data-vwrt-tooltip` and CSS pseudo-elements.
- Continuous sidebar hover pills so icon, label, and expander feel like one target.
- Visual-only tabs, forms, progress bars, status cards, apply action area, modal/dialog surfaces, and loading cards.

## Menu Metadata

`menu-vitrawrt.js` adds metadata only to VitraWrt sidebar links:

- `aria-label`
- `data-vwrt-tooltip`
- `data-vwrt-menu-level`
- `data-vwrt-menu-icon`

It does not change link URLs, click handling, active route detection, child menu rendering, or LuCI page content.

## Component Visual Layer

`luci-components-visual.css` owns component skinning for:

- `.tabs` / `.cbi-tabmenu`
- form inputs/selects/textareas and `.cbi-dropdown` shells
- `.cbi-dynlist` shells
- progress bars
- `.ifacebox` and network-status shells
- `.cbi-page-actions` and apply surfaces
- modal/dialog surfaces
- `.spinning` loading states

This file is visual-only. It must not set display, hidden state, positioning, z-index, pointer events, transforms, table layout, global widths, or content generation for LuCI components.

## Safety Rules

- Do not repair LuCI behavior by simulating user clicks.
- Do not globally normalize tables.
- Do not hide or show tab panels from the theme.
- Do not control dropdown, dynlist, modal, apply area, or ifacebox lifecycles.
- Keep table layout fixes page-scoped and justified by Bootstrap/Argon comparison.

## Known Limitation

If a LuCI app or third-party plugin exposes first-load tab content before its own initialization finishes, the theme records it as an app/plugin compatibility limitation. The theme must not hide the issue with fake tab clicks or a parallel tab system.
