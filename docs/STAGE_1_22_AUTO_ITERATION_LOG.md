# Stage 1.22 Auto Iteration Log

## Loop 0 - Pre-Implementation Evidence

- Ownership issue: `luci-visual.css` and `luci-components-visual.css` both own panels, fields, buttons, tables and tabs.
- Token issue: effective CSS still contains historical `--vitra-*`, `--vwrt-*`, and `--vw-*` stage layers. Stage 1.22 will make new component rules canonical `--vw-*`.
- DOM evidence:
  - System NTP dynlist is `div.cbi-dynlist > div.item > span + input[type=hidden]` plus `div.add-item.control-group > input.cbi-input-text + div.cbi-button-add`.
  - LuCI dropdown is `div.cbi-dropdown > ul + script + span.more + span.open + div`.
  - Modal tabs are `ul.cbi-tabmenu > li.cbi-tab/cbi-tab-disabled > a`.
  - Progress is `div.cbi-progressbar > div` anonymous fill.
  - Sidebar row is `div.vwrt-menu-row > a + button.vwrt-menu-expander`.
- Planned safe JS change: `sidebar.js` will stop removing `active` and `selected`; it may only collapse theme-owned `expanded`.

## Loop 1 - CSS Ownership Rebase

- Ownership changes:
  - Removed `luci-visual.css` from the live `cascade.css` import chain.
  - Kept `luci-components-visual.css` as the sole active LuCI component visual owner.
  - Left deprecated historical CSS files on disk; they are not live imports.
- Token changes:
  - Stage 1.22 component rules use canonical `--vw-*` roles.
  - `--vitra-*` and `--vwrt-*` remain compatibility aliases only.
- Selectors changed:
  - Sidebar active/hover styling moved to row-owned `.vwrt-menu-row` surfaces.
  - Ordinary `.cbi-value` rows were reduced to lightweight form rows; `.cbi-section` owns the card material.
  - Field, tab, dynlist, dropdown, modal, progress and button rules were consolidated into `luci-components-visual.css`.
- JS changed:
  - `sidebar.js` now removes only theme-owned `expanded`; it no longer removes `active` or `selected`.
  - `boot.js` remains a passive version/page marker.
- LuCI safety:
  - No fake click, no event synthesis, no DOM moving/wrapping/rebuilding.
  - No table layout normalization.
- Result:
  - `check-js-safety` passed.
  - `check-css-safety` passed with one token-color warning retained for visibility.

## Loop 2 - Visual Repair After Screenshot Review

- Screenshots inspected:
  - `dark-packages.png`
  - `dark-network-network.png`
  - `light-openclash.png`
  - `dark-openclash.png`
- Visible defects found:
  - Dark package table rows still had native-looking row surface leakage.
  - Network interface table row still had an overly dark/raw row surface.
  - OpenClash retained a high-saturation blue visual block despite page-scoped button/card cleanup.
- Root cause:
  - Table cells and rows were still inheriting old row backgrounds in some pages.
  - OpenClash used a hard-coded blue `announcement-banner::before` pseudo-element.
- CSS changed:
  - `htdocs/luci-static/vitrawrt/css/luci-components-visual.css`
  - Added visual-only row background repair for tables without changing `table-layout`, `display`, `white-space`, or column widths.
  - Added page-scoped `body.vwrt-page-network` row surface repair.
  - Added page-scoped `body.vwrt-page-openclash` neutralization for raw blue buttons, cards, SVG accents, inline-blue style hooks, and `announcement-banner::before`.
- JS changed:
  - None.
- LuCI safety:
  - Repairs are background, border and shadow only.
  - No lifecycle state, table layout, table display, nowrap, or column sizing was touched.
  - OpenClash changes are page-scoped and do not modify plugin JavaScript or fetch service data.
- Light result:
  - OpenClash no longer shows the saturated blue pseudo block; controls are calmer and closer to the VitraWrt material palette.
- Dark result:
  - Package rows no longer show bright/native striping.
  - Network row surface is visually repaired without layout changes.
- Apple/VisionOS direction:
  - Visual weight decreased by reducing hard plugin blue and native table contrast.
  - Remaining plugin internals still need page-by-page refinement in later stages.
- Verification:
  - `node scripts/check-js-safety.mjs`: passed.
  - `node scripts/check-css-safety.mjs`: passed with one retained token warning.
  - `node scripts/runtime-regression-test.mjs --host 10.10.10.148`: 430 passed, 0 failed.
  - `node scripts/visual-direction-audit.mjs --host 10.10.10.148`: generated `audit-output/visual-direction-1.22/20260526-203334/`.
