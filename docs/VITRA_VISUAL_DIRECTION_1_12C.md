# VitraWrt Stage 1.12C Visual Direction

Stage 1.12C implements the visual language defined by `docs/previews/vitrawrt-preview-premium-v4.html` without copying preview DOM into LuCI pages. VitraWrt remains `luci-theme-vitrawrt`; native LuCI pages keep their routing, information architecture, and component lifecycle.

## Why 1.12B Still Felt Generic

- Blue still carried too many surfaces: active states, primary buttons, progress fills, and emphasis treatments leaned toward a generic blue OpenWrt skin.
- Glass surfaces were present, but the material depth was inconsistent across sidebar, cards, forms, progress bars, modals, and dropdowns.
- Apply controls and save buttons still read as conventional blue buttons rather than premium router-console controls.
- Tabs and status cards were improved but still had remnants of LuCI recolor styling and pill-on-pill layering.
- Component spacing did not yet follow a single rhythm from sidebar to content panels to dialogs.

## Preview v4 Target

The preview establishes a low-saturation router console: ice white, mist grey, pale blue grey, graphite text, subtle violet diffusion, and restrained accent blue. It shows a vitreous management rail, compact glass status cards, independent pill tabs, unified fields, compact apply dock, glass dropdowns, glass modal sheets, loading/session sheets, and controlled spacing.

This target is visual only. It must not be implemented by rewriting LuCI page logic, hijacking Status -> Overview, or creating dashboard behavior inside the theme.

## Color Ratio

- 70 percent: ice grey, pale blue grey, and frosted background.
- 20 percent: translucent glass panels and inner surfaces.
- 7 percent: graphite text, muted slate controls, hairline borders.
- 3 percent: restrained accent blue.

Blue is limited to active states, focus rings, selected states, progress fill highlights, and small primary-action emphasis. Default icons, default text, panel backgrounds, table surfaces, and routine buttons are neutral graphite or frosted glass.

## Glass Tokens

- `--vitra-glass-bg`, `--vitra-glass-bg-strong`, `--vitra-glass-bg-subtle`: readable translucent surfaces.
- `--vitra-glass-border`: soft hairline border.
- `--vitra-glass-highlight`: top and inner highlight.
- `--vitra-glass-shadow`, `--vitra-glass-inner-shadow`: ambient depth and inner material edge.
- `--vitra-material-panel`, `--vitra-material-field`, `--vitra-material-button`, `--vitra-material-primary`: component-level material surfaces.
- `--vitra-progress-track`, `--vitra-progress-fill-*`: glass trough and restrained fill.

Glass is defined as surface + border + highlight + shadow. It is not “more blur plus more blue”.

## Spacing Rhythm

The theme keeps LuCI density but aligns visual spacing around compact 8px/12px/16px/24px steps. Panels use soft padding, tabs use stable 8px gaps, fields keep a 16px radius, and apply docks wrap only their controls.

## Field System

Inputs, selects, textareas, and LuCI `cbi-dropdown` triggers share one glass field style: neutral translucent field, soft hairline border, clear text, and a visible low-saturation focus ring. The theme does not style native `option` elements or alter dropdown open/close logic.

## Sidebar Rules

The sidebar is a premium management rail. Default icons and text are muted graphite/slate. Active items use a pale glass pill, accent icon/text, and a subtle indicator. Collapsed mode must remain understandable through local SVG icons plus tooltip/aria-label. Bottom controls align as a compact glass dock.

## Progress Rules

Progress bars use a glass trough with inner depth and a restrained mist-blue fill. Original LuCI values and widths remain untouched. The theme never redraws progress with JS or replaces progress DOM.

## Port And Network Cards

Ifacebox and network cards receive only outer visual skin: glass surface, complete rounded corners, subtle border, and light shadow. Hover tooltip behavior, internal display, and upstream card sizing remain native.

## Tabs

Tabs are independent floating glass pills. Active tabs use pale accent material and accent text, not a solid blue layer. The theme does not alter tab content display, hidden state, active class, aria state, or click behavior. First-load tab issues in LuCI apps/plugins are documented limitations unless fixed upstream.

## Buttons And Apply Area

Routine buttons use neutral glass. Save/apply buttons use a graphite/ice material with restrained accent edge, not saturated blue blocks. The apply area must appear only when LuCI shows it; when visible, it reads as a compact floating glass action dock.

## Dropdown And Select

Closed dropdowns match the glass field system. Open LuCI dropdown panels receive a glass popover visual only. Options must not be exposed early, and dynlist behavior must remain native.

## Modal And Dialogs

Network edit modals, confirm dialogs, loading views, applying/saving dialogs, and session timeout prompts should read as glass sheets with subtle radius, header surface, inner highlight, and modal shadow. The theme does not change modal position, display, close behavior, pointer events, or JS lifecycle.

## Loading And Session Dialogs

Spinners and waiting sheets use the same glass material and muted text. The theme does not hide spinners, fake delays, poll state, or force dialog visibility.

## Dark Mode

Dark mode uses deep graphite and dark navy, not pure black and not neon. Glass depth comes from low-contrast borders, inner highlights, and readable text. Images and plugin charts are not globally filtered.

## Responsive Rules

Desktop supports expanded and collapsed floating sidebar. Mobile uses existing drawer behavior. Sidebar bottom controls must not overflow; modal and apply areas must remain usable; the theme does not force all buttons full width.

## Performance Limits

Backdrop blur is limited to sidebar, dropdown popovers, modal sheets, and small floating tooltips. There are no continuous decorative animations, no heavy mesh backgrounds, no global `will-change`, and no transform/filter/perspective on shell ancestors.

## LuCI Boundaries

- Status -> Overview is not Dashboard.
- Dashboard is a future independent `luci-app` page.
- No fake click, `dispatchEvent`, `MouseEvent`, or JS interaction simulation.
- No global table normalization.
- No lifecycle control for tabs, dropdowns, dynlists, modals, apply area, ifacebox, or progressbars.
- Page-scoped table fixes require Bootstrap/Argon metric comparison.

## Known Limitations

- If vnStat2 or `/admin/network` expose first-load tab content due to app/plugin initialization, VitraWrt records it and does not hide it with simulated clicks.
- Some third-party plugin pages may retain plugin-specific structure; the theme applies safe visual skin only.
- Legacy `.htm` and modern `.ut` templates are both preserved for OpenWrt 23.05/24.10 IPK and 25.x/SNAPSHOT APK ecosystems.

## Audit Links

- Visual direction audit output: `audit-output/visual-direction-1.12C/`
- Generated report: `docs/VISUAL_DIRECTION_AUDIT_1_12C.md`
