# Theme Baseline Comparison Audit

Generated: 2026-05-22T02:10:00.810Z

Target: 10.10.10.148

Original mediaurlbase: `/luci-static/vitrawrt`

Restored mediaurlbase: `/luci-static/vitrawrt`

## Screenshot Index

### bootstrap
- status-overview: audit-output/theme-baseline/bootstrap/status-overview.png
- status-routes: audit-output/theme-baseline/bootstrap/status-routes.png
- status-syslog: audit-output/theme-baseline/bootstrap/status-syslog.png
- status-processes: audit-output/theme-baseline/bootstrap/status-processes.png
- network-network: audit-output/theme-baseline/bootstrap/network-network.png
- network-firewall: audit-output/theme-baseline/bootstrap/network-firewall.png
- system-system: audit-output/theme-baseline/bootstrap/system-system.png
- vnstat: audit-output/theme-baseline/bootstrap/vnstat.png
### argon
- status-overview: audit-output/theme-baseline/argon/status-overview.png
- status-routes: audit-output/theme-baseline/argon/status-routes.png
- status-syslog: audit-output/theme-baseline/argon/status-syslog.png
- status-processes: audit-output/theme-baseline/argon/status-processes.png
- network-network: audit-output/theme-baseline/argon/network-network.png
- network-firewall: audit-output/theme-baseline/argon/network-firewall.png
- system-system: audit-output/theme-baseline/argon/system-system.png
- vnstat: audit-output/theme-baseline/argon/vnstat.png
### vitrawrt
- status-overview: audit-output/theme-baseline/vitrawrt/status-overview.png
- status-routes: audit-output/theme-baseline/vitrawrt/status-routes.png
- status-syslog: audit-output/theme-baseline/vitrawrt/status-syslog.png
- status-processes: audit-output/theme-baseline/vitrawrt/status-processes.png
- network-network: audit-output/theme-baseline/vitrawrt/network-network.png
- network-firewall: audit-output/theme-baseline/vitrawrt/network-firewall.png
- system-system: audit-output/theme-baseline/vitrawrt/system-system.png
- vnstat: audit-output/theme-baseline/vitrawrt/vnstat.png

## Bootstrap Native Behavior Summary

- bootstrap: audited 8 pages.
  main width on overview: 1180px.
  vertical tab menus detected: 0.
  pages with likely stacked button groups: 1.
  pages with horizontal body overflow: 0.
  system tabs current-panel-only: true.
  ifacebox hover mode: floating.
  vnStat path: /cgi-bin/luci/admin/status/vnstat2.

## Argon Behavior Summary

- argon: audited 8 pages.
  main width on overview: 1232px.
  vertical tab menus detected: 0.
  pages with likely stacked button groups: 1.
  pages with horizontal body overflow: 0.
  system tabs current-panel-only: true.
  ifacebox hover mode: floating.
  vnStat path: /cgi-bin/luci/admin/status/vnstat2.

## VitraWrt Behavior Summary

- vitrawrt: audited 8 pages.
  main width on overview: 1168px.
  vertical tab menus detected: 0.
  pages with likely stacked button groups: 1.
  pages with horizontal body overflow: 0.
  system tabs current-panel-only: true.
  ifacebox hover mode: floating.
  vnStat path: /cgi-bin/luci/admin/status/vnstat2.

## Key Findings

1. Argon is installed and was audited successfully.
2. Bootstrap and Argon preserve horizontal or wrapped native tab menus across the audited native pages.
3. VitraWrt vertical tab menus detected: 0.
4. ifacebox hover mode: Bootstrap=floating, VitraWrt=floating.
5. ifacebox hover mode: Argon=floating, VitraWrt=floating.
6. VitraWrt likely stacked button pages: status-syslog.
7. Overview main width: Bootstrap=1180px, Argon=1232px, VitraWrt=1168px.
8. System tab content visibility passes for all audited themes: Bootstrap=true, Argon=true, VitraWrt=true.

## VitraWrt Compared With Bootstrap

- status-overview: main width 1180px -> 1168px (delta -12); tabs single -> single; buttons not-stacked -> not-stacked; overflow false -> false.
- status-routes: main width 1180px -> 1168px (delta -12); tabs single -> single; buttons not-stacked -> not-stacked; overflow false -> false.
- status-syslog: main width 1180px -> 1168px (delta -12); tabs horizontal-or-wrapped,horizontal-or-wrapped -> horizontal-or-wrapped,horizontal-or-wrapped; buttons stacked -> stacked; overflow false -> false.
- status-processes: main width 1180px -> 1168px (delta -12); tabs single -> single; buttons not-stacked -> not-stacked; overflow false -> false.
- network-network: main width 1180px -> 1168px (delta -12); tabs single,horizontal-or-wrapped -> single,horizontal-or-wrapped; buttons not-stacked -> not-stacked; overflow false -> false.
- network-firewall: main width 1180px -> 1168px (delta -12); tabs horizontal-or-wrapped,horizontal-or-wrapped -> horizontal-or-wrapped,horizontal-or-wrapped; buttons not-stacked -> not-stacked; overflow false -> false.
- system-system: main width 1180px -> 1168px (delta -12); tabs single,horizontal-or-wrapped -> single,horizontal-or-wrapped; buttons not-stacked -> not-stacked; overflow false -> false.

## VitraWrt Compared With Argon

- status-overview: main width 1232px -> 1168px (delta -64); tabs single -> single; buttons not-stacked -> not-stacked; overflow false -> false.
- status-routes: main width 1232px -> 1168px (delta -64); tabs single -> single; buttons not-stacked -> not-stacked; overflow false -> false.
- status-syslog: main width 1232px -> 1168px (delta -64); tabs horizontal-or-wrapped,horizontal-or-wrapped -> horizontal-or-wrapped,horizontal-or-wrapped; buttons stacked -> stacked; overflow false -> false.
- status-processes: main width 1232px -> 1168px (delta -64); tabs single -> single; buttons not-stacked -> not-stacked; overflow false -> false.
- network-network: main width 1232px -> 1168px (delta -64); tabs single,horizontal-or-wrapped -> single,horizontal-or-wrapped; buttons not-stacked -> not-stacked; overflow false -> false.
- network-firewall: main width 1232px -> 1168px (delta -64); tabs horizontal-or-wrapped,horizontal-or-wrapped -> horizontal-or-wrapped,horizontal-or-wrapped; buttons not-stacked -> not-stacked; overflow false -> false.
- system-system: main width 1232px -> 1168px (delta -64); tabs single,horizontal-or-wrapped -> single,horizontal-or-wrapped; buttons not-stacked -> not-stacked; overflow false -> false.

## VitraWrt Layout Breakage Against Bootstrap

- Native tab layout is the largest confirmed regression when VitraWrt reports vertical tab menus where Bootstrap reports horizontal or wrapped menus.
- Any page marked with `buttonLikelyVerticalStack=true` in the JSON summary should be treated as a button-group regression.
- Main content width should be compared against Bootstrap before adding any new shell spacing or native-page styling.
- ifacebox hover behavior should match Bootstrap's floating tooltip mode.

## VitraWrt Missing Engineering Compared With Argon

- Argon is useful as an engineering baseline for preserving native tab layout while still applying a custom theme shell.
- Argon preserves floating ifacebox hover behavior in this audit.
- Argon keeps audited button groups from stacking.
- Argon leaves a wider usable content area than VitraWrt in this run.

## Components That Must Not Be Structurally Overridden

- tabs
- hidden states
- ifacebox internals
- progressbar internals
- button group layout
- vnStat tab layout

## Components Safe For Lightweight Styling

- body background
- sidebar
- section border/background
- table colors
- inputs/buttons color and radius

## Stage 1R4 Recommendations

- Rebuild from the Bootstrap metrics first, not from visual mockups.
- Keep native LuCI table, tab, tooltip, button, and plugin layout display behavior untouched.
- Use Argon only as a compatibility reference for shell integration and cache-safe asset loading.
- Treat VitraWrt Dashboard as an independent Stage 2 LuCI app route, not a theme transformation of native pages.
- Before any CSS change, add a focused regression assertion in `theme-baseline-audit.mjs` or `runtime-regression-test.mjs`.

## Stage 1R4 Regression Checks

- PASS: VitraWrt overview main width is within 80px of Bootstrap ({"bootstrapOverviewWidth":1180,"vitrawrtOverviewWidth":1168,"minimumAllowed":1100})
- PASS: VitraWrt vertical tab count does not exceed Bootstrap/Argon baseline ({"bootstrapVerticalTabs":0,"argonVerticalTabs":0,"vitrawrtVerticalTabs":0,"allowedVerticalTabs":0})
- PASS: VitraWrt status-processes buttons are not stacked ({"buttonLikelyVerticalStack":false})
- PASS: VitraWrt vnStat tabs are not vertical when vnStat is present ({"vnstatPresent":true,"vnstatVerticalTabs":0})
- PASS: VitraWrt table/list widths remain close to maincontent width ({"narrowTables":[]})
- PASS: VitraWrt ifacebox hover is not worse than Bootstrap ({"bootstrapIface":"floating","vitrawrtIface":"floating"})
- PASS: VitraWrt pages do not have horizontal body overflow ({"overflowPages":[]})

## Raw Report

- JSON summary: audit-output/theme-baseline/summary.json
- Output root: audit-output/theme-baseline
