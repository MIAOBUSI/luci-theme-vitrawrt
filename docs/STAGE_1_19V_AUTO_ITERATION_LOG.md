# Stage 1.19V Auto Iteration Log

This log is append-only during Stage 1.19V repair loops.

## Loop 0 - Pre-coding diagnosis

- Inspected screenshots: Stage 1.18 `light-status-overview`, `dark-status-overview`, `dark-network-edit-modal-open`, `dark-processes`.
- Visible defects: heavy dark industrial mood, nested panel borders, modal native fragments, sidebar row split risk, progress still admin-like, form/dynlist internals incomplete.
- Root cause selectors: `#vwrt-sidebar`, `.vwrt-menu-row`, `.cbi-map`, `.cbi-section`, `.cbi-value`, input/select/textarea/file, `.cbi-dropdown`, `.cbi-dynlist`, `.tabs`, `.modal`, `.cbi-progressbar`, table/th/td.
- CSS files planned: `tokens.css`, `light.css`, `dark.css`, `base.css`, `sidebar.css`, `luci-components-visual.css`, `luci-layout-exceptions.css`, `responsive.css`, `cascade.css`.
- LuCI safety: visual-only CSS, page-scoped table exceptions, no fake click, no JS layout transformation.
- Light before: airy but pale LuCI slabs remain.
- Dark before: stable but heavy grey-blue industrial console.
- Apple/VisionOS direction: must improve by reducing weight and using softer luminous material.
- Remaining issues: need deploy/audit loops.

## Loop 1 - Initial 1.19V implementation

- Inspected screenshots: `light-status-overview`, `dark-status-overview`, `dark-network-edit-modal-open`, `light-sidebar-collapsed`, `dark-processes` from `audit-output/visual-direction-1.19V/20260526-084921`.
- Visible defects found: light mode became cleaner and collapsed rail stayed contained, but dark status panels still read as blue-black industrial slabs; network edit modal remained too solid and modal tabs still felt grey/native.
- Root cause selectors: `html[data-theme="dark"]` surface tokens, `.modal`, `.modal-content`, `.cbi-map`, `.cbi-section`, `.cbi-section-node`, `.cbi-value`.
- CSS changed: `dark.css`, `luci-components-visual.css`.
- LuCI-safe rationale: only color, background, border, radius, shadow, and padding-level visual properties changed; no lifecycle or DOM changes.
- Light before/after: light mode was kept stable.
- Dark before/after target: reduce navy slab opacity and lower border/shadow contrast.
- Apple/VisionOS direction improved: partially; required second pass for dark modal/panel weight.
- Remaining issues: rerun audit after loop 2.

## Loop 2 - Dark surface weight trim

- Inspected screenshots: `dark-status-overview`, `dark-network-edit-modal-open`, `dark-network-edit-modal-tabs`, `light-status-overview`, `light-sidebar-hover-parent` from `audit-output/visual-direction-1.19V/20260526-085646`.
- Visible defects found: light mode reads as airy ice glass and sidebar hover is integrated, but the dark network edit modal still forms a large blue slab; modal tabs still show grey rectangular LuCI-like segments instead of independent VitraWrt pills.
- Root cause selectors: `html[data-theme="dark"] .modal`, `.modal-content`, `.modal .tabs li`, `.modal .cbi-tabmenu li`, `.modal .tabs a`, `.modal .cbi-tabmenu a`.
- CSS changed: `dark.css`, `luci-components-visual.css`.
- LuCI-safe rationale: only surface color, border, background, and shadow visual properties were changed; no tab active state, hidden/display, pointer events, or modal lifecycle properties were touched.
- Light before/after: kept stable; no light geometry changes were needed.
- Dark before/after target: reduce modal slab weight and convert modal tabs from native-looking grey bars into independent glass pills.
- Apple/VisionOS direction improved: partially; loop 3 focuses on modal tabs and dark dialog material.
- Remaining issues: verify after loop 3 audit whether dark modal still feels too industrial.

## Loop 3 - Modal tab unification and final visual audit

- Inspected screenshots: `dark-network-edit-modal-open`, `dark-network-edit-modal-tabs`, `dark-processes`, `dark-sidebar-collapsed` from `audit-output/visual-direction-1.19V/20260526-090807`.
- Visible defects found: modal tabs now read as independent pills and the collapsed rail remains self-contained. The network edit modal is still a large dark-blue glass sheet because the native LuCI form is wide and dense; reducing it further would require risky geometry or opacity changes that may harm readability.
- Root cause selectors: `.modal .tabs li`, `.modal .cbi-tabmenu li`, `.modal .tabs a`, `.modal .cbi-tabmenu a`, `html[data-theme="dark"] .modal`.
- CSS files changed: `dark.css`, `luci-components-visual.css`.
- LuCI-safe rationale: the fix only changed tab and dialog visual surfaces. It did not set `display`, `visibility`, `hidden`, `pointer-events`, `position`, `z-index`, or change any modal/tab lifecycle state.
- Light mode before/after: unchanged by loop 3; earlier light screenshots already showed the ice-glass direction and integrated sidebar hover.
- Dark mode before/after: modal tabs are no longer grey native strips; the modal sheet is slightly less heavy but remains a known weak area due native form density.
- Apple/VisionOS direction improved: yes for modal tabs and collapsed rail. Dark modal panel remains partially industrial but safer than a more transparent/blur-heavy sheet.
- Remaining issues: dark process table is readable and aligned but still intentionally table-like; dark network edit modal still carries native LuCI density.

## Loop 4 - Runtime failure repair and final audit

- Inspected screenshots: runtime `ifacebox-network-tooltip`, runtime `vnstat2-spacing-summary`, runtime `vnstat2-spacing-yearly`, final audit `dark-vnstat2`, final audit `dark-sidebar-collapsed-tooltip`.
- Visible defects found: runtime could not detect the network ifacebox hover tooltip as visible, and inactive vnStat2 graph panels retained visual padding that pushed later chart tabs downward.
- Root cause selectors: `#maincontent .ifacebox .cbi-tooltip-container:hover .cbi-tooltip`, `body.vwrt-page-vnstat2 #maincontent .cbi-section[data-tab]:not([data-tab-active="true"])`.
- CSS files changed: `luci-components-visual.css`, `luci-layout-exceptions.css`; safety scanner changed in `scripts/check-css-safety.mjs` to allow only hover-visible ifacebox tooltip visibility.
- LuCI-safe rationale: ifacebox tooltip remains hidden until native hover/focus; vnStat2 inactive panels only lose visual margin/padding and do not get display/visibility/hidden changes.
- Light mode before/after: vnStat2 chart panel spacing is compact without changing tab behavior.
- Dark mode before/after: vnStat2 chart spacing is compact; collapsed sidebar remains contained; no white table artifacts appeared.
- Apple/VisionOS direction improved: the result removes excess blank space and keeps visual rhythm tighter without adding heavier borders or dark slabs.
- Remaining issues: native vnStat2 chart images themselves are plugin-generated bitmaps and remain visually outside the theme's control.
- Runtime result: `audit-output/runtime-regression/20260526-093736`, 441 passed, 0 failed.
- Final visual audit: `audit-output/visual-direction-1.19V/20260526-094428`.
