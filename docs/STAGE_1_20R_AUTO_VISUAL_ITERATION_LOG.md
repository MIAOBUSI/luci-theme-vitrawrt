# Stage 1.20R Auto Visual Iteration Log

## Loop 0 - Pre-implementation

- Screenshots inspected: `docs/VISUAL_DIRECTION_AUDIT_1_19V.md` references, including light/dark overview, dark vnStat2, dark modal tabs, sidebar collapsed/hover targets.
- Visible defects found: heavy grey-blue dark surfaces, split-prone sidebar chevron surface, stacked sidebar material, native-looking dynlist/dropdown internals, modal tab strip residue, progress still reads as colored LuCI bar in close-up, plugin pages under-covered.
- Root cause selectors: `html[data-theme]` tokens, `.vwrt-menu-row`, `.vwrt-menu-expander`, `.cbi-dynlist`, `.cbi-dropdown`, `.tabs`, `.cbi-tabmenu`, `.modal`, `.cbi-progressbar`, plugin page selectors.
- CSS planned: `tokens.css`, `light.css`, `dark.css`, `base.css`, `sidebar.css`, `luci-components-visual.css`, `luci-layout-exceptions.css`, `responsive.css`, `cascade.css`.
- JS planned: no LuCI UI hook; only `boot.js` version marker if needed.
- LuCI-safe reason: CSS-first, no DOM moves/wrappers/fake clicks, no lifecycle display/hidden rules.
- Light target: ice-glass with fewer native white patches.
- Dark target: luminous graphite glass instead of industrial blue slab.
- Apple/VisionOS direction goal: reduce weight, reduce borders, improve internals.
- Remaining failures: implementation and screenshot verification pending.

## Loop 1 - CSS-first liquid glass correction

- Screenshots inspected: Stage 1.19V `light-status-overview`, `dark-status-overview`, `light-sidebar-hover-parent`, `dark-network-edit-modal-open`, `dark-network-edit-modal-tabs`, `dark-processes`, and user-reported close-up defects.
- Visible defects found: sidebar hover material split between link and chevron, rail/status/menu/card over-stacking, dynlist input/remove native patches, cbi-dropdown open menu still native, modal tabs not visually identical to page tabs, progress still reads as LuCI recolor, apply dock buttons oversized as capsules, plugin pages only partially skinned.
- Root cause selectors: `#vwrt-sidebar`, `.vwrt-menu.l1 > li > .vwrt-menu-row`, `.vwrt-menu-expander`, `.cbi-dynlist .item`, `.cbi-dynlist input`, `.cbi-button-remove`, `div.cbi-dropdown > ul`, `.cbi-tabmenu`, `.modal .cbi-tabmenu`, `.cbi-progressbar`, `.cbi-page-actions`, `body.vwrt-page-openclash`, `body.vwrt-page-mosdns`.
- CSS changed: `tokens.css`, `light.css`, `dark.css`, `base.css`, `sidebar.css`, `luci-components-visual.css`, `cascade.css`.
- JS changed: `boot.js` only updates the version marker and adds passive page classes for OpenClash/MosDNS/plugin routes.
- LuCI-safe reason: no nodes are moved, wrapped, rebuilt, cloned or hidden; no fake clicks or events are used; dropdown/tab/modal/apply display lifecycle remains LuCI-owned; plugin support is page-class visual styling only.
- Light result: pending visual audit after deployment.
- Dark result: pending visual audit after deployment.
- Apple/VisionOS direction improved: expected through lower border opacity, softer surfaces, fewer nested rail cards, unified frosted field/dropdown/dynlist geometry, and more restrained progress/button material.
- Visual weight decreased: yes in CSS intent; screenshots must verify.
- Border/nesting decreased: yes in sidebar, panels and modal CSS intent; screenshots must verify.
- Remaining failures: first visual audit showed OpenClash custom `.oc` app still painted large native white panels.

## Loop 2 - Plugin custom skin pass

- Screenshots inspected: `dark-openclash.png`, `light-openclash.png`, and Playwright DOM/computed-style extraction for OpenClash.
- Visible defects found: OpenClash root `.oc`, `.main-card`, `.sub-card`, `.announcement-card`, `.myip-main-card`, `.developer-container`, `.value-indicator`, and `.cbi-button-group` were still plugin-white/Bootstrap-blue.
- Root cause selectors: plugin CSS loads app-specific classes after the generic LuCI surface rules; generic `.panel/.card` theme selectors do not reach the OpenClash app internals.
- CSS changed: `luci-components-visual.css`.
- JS changed: none.
- LuCI-safe reason: page-scoped visual-only selectors under `body.vwrt-page-openclash`, `body.vwrt-page-mosdns`, and `body.vwrt-page-plugin`; no plugin DOM, values, events, visibility, or service data are touched.
- Light result: pending second visual audit.
- Dark result: pending second visual audit.
- Apple/VisionOS direction improved: expected by removing plugin white slabs and replacing saturated plugin blue buttons with the shared field/control material.
- Visual weight decreased: yes for plugin panels and button groups.
- Border/nesting decreased: yes for plugin cards by matching the shared soft material.
- Remaining failures: second visual audit showed OpenClash white slabs fixed, but plugin announcement/action buttons still used saturated plugin blue in some regions.

## Loop 3 - Plugin saturated blue reduction

- Screenshots inspected: `dark-openclash.png`, `light-openclash.png`, plugin action close-ups and top announcement banner.
- Visible defects found: OpenClash app surfaces were now dark/light themed, but `.announcement-banner`, `.btn-primary`, `.btn-success`, plugin `.btn`, and submit/button controls could still show saturated plugin blue.
- Root cause selectors: app-specific button and banner classes override generic `.action-btn`/`.dashboard-btn` coverage.
- CSS changed: `luci-components-visual.css`.
- JS changed: none.
- LuCI-safe reason: page-scoped visual-only button/banner material under plugin body classes; no click handlers, form values, service state, or visibility are touched.
- Light result: pending final visual audit.
- Dark result: pending final visual audit.
- Apple/VisionOS direction improved: expected by replacing plugin-blue paint with the same translucent aqua control material used elsewhere.
- Visual weight decreased: yes for plugin banners and action buttons.
- Border/nesting decreased: unchanged from loop 2.
- Remaining failures: final deployment, runtime regression and visual audit pending.
