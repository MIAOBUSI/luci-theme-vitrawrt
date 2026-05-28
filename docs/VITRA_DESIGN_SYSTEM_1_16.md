# VitraWrt Stage 1.16 Design System

Stage 1.16 is a design-system-first rewrite for `luci-theme-vitrawrt` on ImmortalWrt 25.12 / LuCI openwrt-25.12. The visual reference is `docs/previews/vitrawrt-preview-premium-v4.html`; the preview is a material and rhythm target only, not DOM to copy.

## 1.15 Diagnosis

Stage 1.15 fixed regressions but still read as native LuCI inside grey-blue glass. The weak points were:

- The palette leaned on muted grey-blue surfaces and did not provide enough controlled aqua/cyan/violet material light.
- Sidebar expanded mode had too many historical layered backgrounds, making the rail feel heavy rather than precise.
- Sidebar collapsed mode was improved, but still needed a dedicated icon-rail model rather than squeezed expanded controls.
- Process table layout was safer than 1.14B, but the table still felt flat and technical rather than a polished router console table.
- Form fields, native select, CBI dropdown and dynlist shared some styling but not a strong field-system identity.
- Modal tabs and main tabs were visually close but not unified enough.
- Progress bars had glass treatment but still felt closer to recolored OpenWrt than a designed trough/fill component.
- Network and iface cards retained raw LuCI density without enough refined inner material.

## Target Visual Principles

- VitraWrt is a premium vitreous router console, not a dashboard app and not a Bootstrap recolor.
- Status -> Overview remains LuCI's native overview information architecture.
- Blue is an accent only. The main language is ice white, mist cyan, aqua, graphite, deep navy, and subtle violet.
- Material hierarchy comes from layered surfaces, hairline borders, inner highlights, and soft shadows.
- Operational density stays high: tables, forms and logs remain scannable.
- Visual redesign must not alter LuCI lifecycle or component state.

## Light Palette

- Background: ice white with cyan/aqua/violet diffusion.
- Main glass: translucent white with readable graphite text.
- Inner surface: mist blue-white, not flat pure white.
- Accent: restrained blue-cyan used for focus, active state and primary action only.
- Status green: soft and semantic only.
- Danger: soft red outline/fill, never harsh blocks.

## Dark Palette

- Background: deep graphite navy, not pure black.
- Main glass: dark navy sheets with soft cyan edge light.
- Table rows: explicit dark solid tokens to avoid white LuCI zebra stripes.
- Text: high-contrast cool white for primary, slate for secondary.
- Accent: aqua/cyan light, restrained and local.

## Material Layers

1. Shell background: low-cost radial diffusion, no animated overlays.
2. Rail/panel glass: translucent surface, one hairline border, one inner highlight, one soft ambient shadow.
3. Inner surface: table/form/progress areas use sunken material.
4. Floating controls: apply dock, dropdowns and modal sheets use stronger glass with compact shadows.

## Radius System

- `--vw-radius-xs`: tiny controls.
- `--vw-radius-sm`: compact pills and small cells.
- `--vw-radius-md`: fields.
- `--vw-radius-lg`: rows and compact cards.
- `--vw-radius-xl`: menu pills and mini cards.
- `--vw-radius-2xl`: panels.
- `--vw-radius-pill`: buttons and segmented chips.

## Shadow System

- `--vw-shadow-soft`: low ambient lift.
- `--vw-shadow-card`: section lift.
- `--vw-shadow-floating`: dropdown/apply dock.
- `--vw-shadow-modal`: modal sheet depth.

Shadows must remain lightweight for router hardware; no continuous animated glow.

## Border And Highlight System

- `--vw-border-hairline`: section and table separators.
- `--vw-border-soft`: inner separators.
- `--vw-border-medium`: controls.
- `--vw-border-strong`: focused/active edges.
- `--vw-border-focus`: focus ring source.
- `--vw-highlight-top`, `--vw-highlight-inner`, `--vw-highlight-edge`: glass surface highlights.

## Typography Scale

- System font stack only: `-apple-system`, BlinkMacSystemFont, SF Pro, Segoe UI, PingFang SC.
- Page title: strong, compact, not hero scale.
- Section title: clear but not oversized.
- Table/form text: dense, high contrast, scan-friendly.
- Muted help text: readable, never washed out.

## Spacing Scale

- Use `--vw-page-gap`, `--vw-card-padding`, `--vw-field-height`, `--vw-button-height`, `--vw-tab-height`.
- Forms use consistent row rhythm.
- Tables keep admin density; no oversized dashboard rows.
- Sidebar collapsed rail has its own centering and control rhythm.

## Component Token Map

- Panels: `--vw-surface-glass-*`, `--vw-border-hairline`, `--vw-shadow-card`.
- Forms: `--vw-surface-control`, `--vw-border-medium`, `--vw-border-focus`, `--vw-field-height`.
- Tabs: `--vw-surface-control`, `--vw-surface-control-active`, `--vw-tab-height`.
- Buttons: `--vw-surface-control`, `--vw-surface-control-hover`, `--vw-button-height`.
- Apply dock: `--vw-surface-glass-3`, `--vw-shadow-floating`.
- Tables: `--vw-surface-table-*`, `--vw-border-soft`.
- Progress: `--vw-progress-*`, `--vw-cyan`, `--vw-aqua`.
- Modal: `--vw-surface-glass-3`, `--vw-shadow-modal`, `--vw-radius-2xl`.

## LuCI Selector Mapping

| LuCI selector / structure | VitraWrt component | Safe visual target | Boundary |
|---|---|---|---|
| `html`, `body`, `#maincontent` | App shell | Background, spacing, text | No transform/filter/perspective |
| `#vwrt-sidebar`, `.vwrt-menu*` | Management rail | Expanded/collapsed rail | No route/click logic changes |
| `.alert-message`, `.alert` | Banner | Glass warning/info sheet | No forced hide/show |
| `h1`, `h2`, `h3`, `.cbi-map-descr` | Page/section text | Clear hierarchy | No content rewrite |
| `.cbi-map` | Page map panel | Glass panel | No lifecycle display changes |
| `.cbi-section`, `fieldset` | Section card | Glass section | No global overflow hidden |
| `.cbi-section-node` | Inner section | Sunken/inner glass | No DOM wrapping |
| `.cbi-value` | Form row | Designed row | Only visible rows, do not reveal hidden |
| `.cbi-value-title` | Field label | Label column rhythm | No hidden labels |
| `.cbi-value-field` | Field area | Flexible field column | No full-width forcing |
| `input`, `select`, `textarea` | Field system | Unified glass fields | No name/id/value changes |
| `.cbi-dropdown` | LuCI dropdown | Glass trigger/panel | No open/close lifecycle changes |
| `.cbi-dynlist` | Dynamic list | Glass list/input | Add/remove behavior untouched |
| `.tabs`, `.cbi-tabmenu`, `.cbi-tab` | Segmented tabs | Floating glass pills | No tab state manipulation |
| `table`, `.table`, `.cbi-section-table` | Data table skin | Material table | No global layout normalize |
| `.cbi-progressbar`, `.progress`, `progress` | Progress | Glass trough/fill | Preserve width/value |
| `.ifacebox`, `.ifacebadge` | Port card | Compact glass mini card | Hover tooltip untouched |
| Network upstream cards | Network card | Compact glass card | No forced full-width |
| `.cbi-page-actions`, `#uci-apply` | Apply dock | Compact floating dock | No force display/hide |
| `.modal`, `.modal-content`, `[role="dialog"]` | Modal sheet | Glass sheet | Close behavior untouched |
| `.spinning` | Loading state | Glass waiting card | Do not hide spinner |
| Login page classes | Auth sheet | Premium login sheet | No form action/name/id changes |

## Page-Scoped Layout Exceptions

- `body.vwrt-page-processes`: semantic process table columns and dark row stabilization.
- `body.vwrt-page-packages`: compact package action buttons.
- `body.vwrt-page-startup`: priority/script/action column alignment.
- `body.vwrt-page-network-share`: wide table horizontal containment.
- `body.vwrt-page-vnstat2`: spacing and inactive panel containment only.
- Network interface pages: only page-scoped if metrics show overflow or action misalignment.

## Risk List

- Global table layout rules can break packages/processes/startup and plugin pages.
- Styling `.cbi-dropdown` with display/visibility can expose options early.
- Styling modal positioning/z-index/pointer events can break close behavior.
- Styling ifacebox position/display can break native hover tooltips.
- Applying transform/filter/perspective to shell ancestors can break fixed modals.
- Overuse of blue makes the theme look like generic OpenWrt.

## Must Not Change

- No fake clicks or simulated user interactions.
- No LuCI DOM wrapping, moving, replacing or rebuilding via JS.
- No Status -> Overview dashboard hijack.
- No service data fetching in theme.
- No form field name/id/value/submit changes.
- No tab/dropdown/dynlist/modal/apply/ifacebox lifecycle changes.
- No external fonts, CDN, remote assets or icon libraries.
- No global table normalization.
