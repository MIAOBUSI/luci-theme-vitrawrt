# VitraWrt Theme Component Spec

This spec describes visual targets for `luci-theme-vitrawrt`. Every component keeps LuCI ownership of data, lifecycle, and interaction behavior.

## 1. Sidebar

### Expanded

- Visual description: floating Liquid Glass console, rounded 28-30px, clear brand block, local SVG icons, current route highlighted by soft accent pill and 2px indicator.
- Allowed CSS: color, background, border, radius, shadow, padding, margin, font, focus ring, local icon mask/background for sidebar-owned nodes.
- Forbidden CSS: rules that affect `#maincontent`, `.cbi-*`, `.modal`, `.tabs`, or plugin content.
- Interaction boundary: sidebar JS may collapse/expand sidebar and menu groups only; it must not change LuCI page state.
- Accessibility: visible focus, `aria-label` on icon-only controls, text contrast in collapsed and expanded states.
- Light mode: translucent white/ice surface, graphite text, blue active state.
- Dark mode: graphite/navy glass, muted text, restrained blue active state.
- Responsive: desktop fixed floating sidebar; mobile topbar/drawer.

### Collapsed

- Visual description: icon-only rail with clear function icons and Vitra glass tooltip on hover/focus.
- Allowed CSS: sidebar-owned tooltip pseudo-element using `data-vwrt-tooltip`, icon color, active pill.
- Forbidden CSS: native browser `title` tooltip dependency, auto-expanding menus as a substitute.
- Interaction boundary: no fake click, no route rewrite.
- Accessibility: icon-only anchors require `aria-label`; tooltip text must be readable.

### Tooltip

- Visual description: compact glass pill beside collapsed sidebar icon.
- Allowed CSS: background, border, radius, shadow, opacity transition for sidebar pseudo-element.
- Forbidden CSS: applying tooltip rules to LuCI content, using `[data-tooltip]` which LuCI may own.
- Interaction boundary: hover/focus only.

### Active / Submenu / Footer Controls

- Active state: soft blue glass pill, accent icon, small left indicator.
- Submenu: mild indentation, smaller icons/dots, no all-menu expansion.
- Footer controls: theme/settings/collapse controls as compact pills/circles with focus rings.

## 2. Page Shell

- Visual description: ice-blue/light graphite background, subtle glass panels, dense admin spacing.
- Allowed CSS: body background gradients, `#maincontent` padding/margins, text color, safe scrollbar colors.
- Forbidden CSS: transform/filter/perspective on body or main content, max-width that compresses native pages, modal-affecting containing blocks.
- Interaction boundary: shell must not wrap, move, hide, or expand LuCI dynamic content.
- Accessibility: skip link, focus-visible, readable text hierarchy.
- Responsive: preserve content width on desktop, avoid horizontal overflow on mobile.

## 3. Tabs

- Visual description: glass segmented control with active blue pill, subtle inactive hover, visible focus.
- Allowed CSS: color, background, border, border-radius, box-shadow, padding, margin, font.
- Forbidden CSS: display, visibility, hidden, position, z-index, pointer-events, active class mutation, tab panel display rules.
- Interaction boundary: LuCI or plugin owns tab init and switching.
- Accessibility: focus ring, active tab readable in light/dark.
- Responsive: natural wrapping, no forced vertical desktop tabs.

## 4. Forms

- Visual description: glass input shells, clear labels, muted help text, precise focus ring.
- Allowed CSS: color, background, border, radius, padding, font, outline/focus ring.
- Forbidden CSS: global width:100%, CBI value display/flex/grid, option display, dropdown open/close state, dynlist item layout.
- Interaction boundary: CBI owns validation, dependency visibility, dropdowns, dynlists, and submit.
- Accessibility: contrast, target size, visible errors, disabled states not confused with inactive hidden fields.
- Responsive: form controls may wrap naturally; do not compress labels into unreadable columns.

## 5. Buttons

- Visual description: capsule controls with primary blue, neutral glass, danger soft red, disabled muted.
- Allowed CSS: background, border, radius, color, padding, shadow, focus ring.
- Forbidden CSS: global width:100%, display:block globally, action lifecycle changes.
- Interaction boundary: buttons keep native click handlers and submit semantics.
- Accessibility: keyboard focus, disabled contrast, danger not relying only on color.
- Responsive: natural wrapping; mobile-specific stacking only when scoped.

## 6. Tables

- Visual description: native data tables with subtle header surface, quiet row dividers, restrained hover.
- Allowed CSS: table color, background, border-color, row hover color, action button skin.
- Forbidden CSS: global table-layout fixed, global table display:block, global width/overflow, tr/td display flex/grid, global nowrap.
- Interaction boundary: table sorting/actions/forms stay native.
- Accessibility: row contrast, readable small text.
- Responsive: only page-scoped overflow wrappers after Bootstrap/Argon comparison.

### Table Types

- Normal table: status/routes/packages rows use available main width.
- Action table: compact buttons, no button stretching.
- Long text table: allow scoped wrapping where measured.
- Wide configuration table: page-scoped horizontal containment only.
- Package list: action buttons natural width.
- Process table: command column wraps page-scoped, action column visible.
- Startup table: script column uses available width, action columns aligned.

## 7. Progress

- Visual description: translucent track, accent fill, readable numeric labels.
- Allowed CSS: track/fill background, border, radius, color, shadow.
- Forbidden CSS: changing values, inline widths, JS redrawing, hiding inner bars.
- Interaction boundary: LuCI owns values and updates.
- Accessibility: text values remain visible; low values still perceivable.
- Light/dark: accent blue fill, subdued track.

## 8. Status Components

### Ifacebox / Interface Badge

- Visual description: native port card shell with subtle glass edge; badge remains compact.
- Allowed CSS: shell background, border, radius, shadow, text color.
- Forbidden CSS: internal `.ifacebox *`, hover tooltip display, overflow/position/pointer-events changes, width:100%.
- Interaction boundary: native hover tooltip remains native.

### Network Upstream Card / Router Status Row / Service Status Card

- Visual description: small native status modules integrated into glass panels.
- Allowed CSS: surface, border, typography, badge color.
- Forbidden CSS: converting native status view into dashboard cards, changing width logic globally.

## 9. Modal / Overlay

- Visual description: LuCI modal retains native placement but gains glass surface, rounded corners, calm overlay, clear footer buttons.
- Allowed CSS: background, border, radius, shadow, color, padding, font, backdrop color if safe.
- Forbidden CSS: display, hidden, pointer-events, close behavior, form action, position/z-index unless measured and required, body transforms.
- Interaction boundary: LuCI owns open/close, overlay, focus, modal tabs, dropdowns, dynlists, and apply actions.
- Accessibility: modal text contrast, focus visible, close controls readable.
- Responsive: modal fits mobile viewport and scrolls natively.

## 10. Plugin Pages

- Configuration-heavy plugin: skin CBI forms and tables, do not reflow plugin logic.
- Dashboard-like plugin page: integrate shell colors/cards while preserving plugin data and polling.
- Table-heavy plugin page: page-scoped overflow only after baseline comparison.
- Iframe/external app entry: theme the entry shell/link, not the external UI.

