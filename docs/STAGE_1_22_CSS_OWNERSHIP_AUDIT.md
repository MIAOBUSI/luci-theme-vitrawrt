# Stage 1.22 CSS Ownership Audit

Primary target: ImmortalWrt 25.12 / LuCI openwrt-25.12. Version target: `v=1.22`.

## Imported CSS Before Rebase

`htdocs/luci-static/vitrawrt/cascade.css` imports:

1. `/luci-static/bootstrap/cascade.css`
2. `tokens.css`
3. `light.css`
4. `dark.css`
5. `base.css`
6. `sidebar.css`
7. `luci-visual.css`
8. `luci-components-visual.css`
9. `luci-layout-exceptions.css`
10. `responsive.css`

Deprecated files remain unimported and must stay unowned: `luci-native.css`, `luci-reset.css`, `luci-safe.css`.

## Duplicate Ownership Found

`luci-visual.css` still styles the same core LuCI components as `luci-components-visual.css`:

| Component | Existing owners | Problem | Stage 1.22 owner |
|---|---|---|---|
| `cbi-map` / `cbi-section` | `luci-visual.css`, `luci-components-visual.css` | double card material and older `--vwrt-*` tokens | `luci-components-visual.css` |
| `cbi-value` / labels / help | both visual files | old row density fights 1.21 row rhythm | `luci-components-visual.css` |
| `input`, `select`, `textarea` | both visual files | older broad field rules make density inconsistent | `luci-components-visual.css` |
| file input | `luci-components-visual.css`; broad input rules in `luci-visual.css` | file selector inherits duplicate field/button paint | `luci-components-visual.css` |
| checkbox / radio | both visual files | old `accent-color` can bind accent to all controls | `luci-components-visual.css` |
| buttons / `.cbi-button` | both visual files | older Bootstrap-like pill layer remains | `luci-components-visual.css` |
| apply dock | `luci-components-visual.css`; button colors from `luci-visual.css` | split role language | `luci-components-visual.css` |
| tabs / `.cbi-tabmenu` | `luci-components-visual.css`; old visual file influences buttons | modal tab strip cleanup must be single owner | `luci-components-visual.css` |
| `.cbi-dropdown` | `luci-components-visual.css`; field/button overlap from `luci-visual.css` | wrapper and internal `ul/li/open` styling conflicts | `luci-components-visual.css` |
| `.cbi-dynlist` | `luci-components-visual.css`; field/button overlap from `luci-visual.css` | item/add/remove density conflicts | `luci-components-visual.css` |
| progress | `luci-components-visual.css`; table/card context from `luci-visual.css` | meter paint is late but older context remains | `luci-components-visual.css` |
| tables | both visual files, plus `luci-layout-exceptions.css` | global table surface duplicated | global visual in `luci-components-visual.css`; layout only in `luci-layout-exceptions.css` |
| process/package/startup layout | `luci-layout-exceptions.css` | page-scoped and allowed | `luci-layout-exceptions.css` |
| sidebar menu row / expander / bottom dock | `sidebar.css` | active link rules still split row/chevron | `sidebar.css` only |
| modal/dialog/loading/apply/session | `luci-components-visual.css` | keep single component owner | `luci-components-visual.css` |
| plugin panels/buttons/tabs/logs | `luci-components-visual.css`, page classes from `boot.js` | page-scoped compatibility only | `luci-components-visual.css` |

## Rebase Decision

Remove `luci-visual.css` from `cascade.css` imports for Stage 1.22. The file remains in the package as historical fallback, but it is no longer a loaded owner. This eliminates duplicate ownership for panels, fields, buttons, tables, tabs, dropdowns and dynlists.

Final ownership model:

- `tokens.css`: canonical `--vw-*` structure plus legacy alias mapping only.
- `light.css`: light token values only.
- `dark.css`: dark token values only.
- `base.css`: page shell, background, typography, login, general layout.
- `sidebar.css`: VitraWrt sidebar only.
- `luci-components-visual.css`: final LuCI component visual system.
- `luci-layout-exceptions.css`: page-scoped layout exceptions only.
- `responsive.css`: responsive/mobile/collapsed layout only.
- JS: passive class markers and theme-owned sidebar state only.

## JS Safety Review

`boot.js` is currently passive body/page class tagging and a view-ready marker. It may update `data-vitrawrt` to `1.22`, but must not repair dropdown, dynlist, modal, tabs, progress, or layout.

`sidebar.js` owns collapsed/drawer/panel state. `pruneExpandedMenuGroups()` currently removes `expanded`, `active`, and `selected` from menu groups when too many are open. This can erase LuCI/menu state classes. Stage 1.22 must restrict pruning to theme-owned `expanded` state and aria on theme expander buttons only; active/selected classes must not be removed.

