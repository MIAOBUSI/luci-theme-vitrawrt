# Apple Reference Extraction 1.18

Reference inspected: `docs/reference/apple/cascade.css`.

Visual target cross-check: `docs/previews/vitrawrt-preview-premium-v4.html`.

The reference is treated as a design sample, not as code to copy. Stage 1.18 extracts palette and material logic, then adapts it into LuCI-safe component styling.

## Palette and Material Extraction

| Reference color / gradient / shadow pattern | Visual purpose | Why it works | VitraWrt token replacement | Adopt / Adapt / Reject |
|---|---|---|---|---|
| `radial-gradient(circle at 86% 4%, rgba(64,156,255,.22), transparent 34%)` | Top-right cool atmospheric light | Adds depth without painting panels blue | `--vw-glow-cyan`, `--vw-bg-mesh-cyan` | Adapt |
| `radial-gradient(circle at 12% 0%, rgba(94,92,230,.2), transparent 30%)` | Violet ambient counterweight | Prevents the dark base from becoming flat navy | `--vw-glow-violet`, `--vw-bg-mesh-violet` | Adapt |
| `linear-gradient(160deg,#0a1020,#121b32,#0c1424)` | Deep graphite/navy dark base | Feels richer than plain black or industrial slate | `--vw-base-0`, `--vw-base-1`, `--vw-base-2` | Adapt |
| `linear-gradient(145deg, rgba(255,255,255,.105), rgba(64,156,255,.055), rgba(255,255,255,.038))` | Glass surface temperature shift | Gives glass a luminous edge without heavy blur | `--vw-glass-panel`, `--vw-glass-inner`, `--vw-glass-highlight` | Adapt |
| `rgba(14,24,43,.66)` | Dark elevated panel body | Holds readability under translucent gradients | `--vw-glass-panel`, `--vw-modal-bg`, `--vw-sidebar-bg` | Adopt as logic |
| `rgba(210,226,255,.18)` | Soft blue-white hairline border | Gives material edge without hard grey lines | `--vw-glass-border`, `--vw-border-soft` | Adapt |
| `#f8fafc`, `rgba(248,250,252,.74)`, `rgba(248,250,252,.5)` | Dark-mode text hierarchy | Clear without pure white slabs | `--vw-text-main`, `--vw-text-muted`, `--vw-text-faint` | Adopt as logic |
| `#0a84ff`, `rgba(10,132,255,.2)` | Strong Apple blue active state | Recognizable but too blue-dominant for VitraWrt | `--vw-accent`, `--vw-accent-soft`, with aqua/cyan shift | Adapt |
| `#30d158` | Apple success green | Good semantic success color, unsafe as primary action | `--vw-success`; status only | Adapt |
| `#ff453a`, `#ff9f0a` | Danger/warning semantics | Clear low-area warning/destructive signals | `--vw-danger`, `--vw-warning` | Adapt |
| `0 28px 82px rgba(2,8,23,.42), inset 0 1px 0 rgba(255,255,255,.1)` | Ambient + inner highlight material | Makes panels feel layered without extra DOM | `--vw-shadow-floating`, `--vw-glass-highlight` | Adapt |
| Table surface tokens `--apple-table-bg`, `--apple-table-head-bg` | Readable table material | Useful color model, but layout rules are unsafe | `--vw-table-head-bg`, `--vw-table-row-bg`, `--vw-table-row-alt-bg` | Adapt |
| Global `.table` display/table-layout rewrites | Makes reference tables consistent | Breaks LuCI tables and plugins if copied | Page-scoped `luci-layout-exceptions.css` only | Reject |
| Global primary/success/danger button fills | Strong action hierarchy | Too saturated and makes green a generic action | Material buttons with aqua/graphite primary and semantic danger/success | Adapt |
| Modal overlay/body assumptions | Reference app-specific lifecycle | LuCI owns modal open/close and overlay behavior | Visual-only modal sheet/backdrop skin | Adapt cautiously |

## Deep Base Colors

The reference uses a three-step graphite/navy base instead of a single dark color. VitraWrt maps this to:

- `--vw-base-0`: deepest app base.
- `--vw-base-1`: elevated cold navy.
- `--vw-base-2`: panel-adjacent blue graphite.

Light mode uses the same relationship with ice white, mist blue, and pale aqua.

## Elevated Panel Colors

Reference panels combine translucent white, blue-tinted glass and dark navy body. VitraWrt uses:

- `--vw-glass-panel`
- `--vw-glass-panel-strong`
- `--vw-glass-inner`
- `--vw-modal-bg`
- `--vw-sidebar-bg`

The implementation keeps these visual-only and does not add wrappers or lifecycle logic.

## Inner Glass Highlights

Reference inner highlight becomes:

- `--vw-glass-highlight`
- `--vw-highlight-top`
- `--vw-highlight-inner`

These are applied as `box-shadow` and gradients on panels, fields, tabs, progress tracks, and modals.

## Aqua/Cyan Active Colors

The reference uses Apple blue. VitraWrt shifts active states toward aqua/cyan/mint to avoid generic OpenWrt blue:

- `--vw-accent`
- `--vw-accent-soft`
- `--vw-accent-strong`
- `--vw-glow-aqua`
- `--vw-glow-cyan`

## Violet/Blue Ambient Glow

Violet is used as low-opacity atmosphere only:

- `--vw-glow-violet`
- `--vw-bg-mesh-violet`

It must not become neon or cyberpunk.

## Muted and Disabled Text

The reference text hierarchy is retained as a model:

- `--vw-text-main`
- `--vw-text-muted`
- `--vw-text-faint`
- `--vw-text-disabled`

Dark mode must not use pure white rows or white modal bodies.

## Field Backgrounds

Reference field material is adapted to LuCI-safe controls:

- `--vw-field-bg`
- `--vw-field-bg-hover`
- `--vw-field-bg-focus`
- `--vw-field-border`

This applies to native `input`, `select`, `textarea`, closed `.cbi-dropdown`, and dynlist inputs without changing open/close behavior.

## Button Backgrounds

Reference primary blue/green is not copied. VitraWrt uses material controls:

- `--vw-button-bg`
- `--vw-button-bg-hover`
- `--vw-button-primary-bg`
- `--vw-button-primary-hover`

Primary actions are aqua/graphite glass, not saturated Bootstrap blue.

## Progress Fill Colors

Reference progress material is adapted to:

- `--vw-progress-track`
- `--vw-progress-fill`
- `--vw-progress-fill-strong`

Fill is aqua/cyan/mint, with actual LuCI width/value preserved.

## Destructive, Warning, Success

Semantic colors are retained but low-saturation:

- `--vw-success`: status/online only.
- `--vw-warning`: warnings.
- `--vw-danger`: destructive/reset.

Green is not a main accent or login/apply default.

## Safe to Learn From

- Palette relationship.
- Surface depth.
- Active state mood.
- Glow color balance.
- Button material style.
- Field material style.
- Glass edge treatment.
- Dark mode atmosphere.
- Progress material feeling.
- Rounded control proportions.

## Unsafe to Copy

- Global table display changes.
- Global layout overrides.
- Forced full-width controls.
- Forced fixed heights across unknown LuCI widgets.
- Global input/select width hacks.
- Global tab display/hidden manipulation.
- Modal lifecycle changes.
- Dropdown lifecycle changes.
- Dynlist lifecycle changes.
- Fake interaction JS.
- MutationObserver layout transformer.

## VitraWrt Replacement Strategy

Stage 1.18 implements the reference mood through final-stage CSS tokens and scoped visual skins. Unsafe structural rules are replaced with:

- component visual selectors in `luci-components-visual.css`;
- sidebar-owned icon rail rules in `sidebar.css`;
- route-scoped table exceptions in `luci-layout-exceptions.css`;
- no JS behavior changes beyond existing theme-owned sidebar/page markers.

This keeps the Apple/VisionOS atmosphere while preserving LuCI 25.12 behavior.
