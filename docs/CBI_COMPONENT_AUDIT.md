# CBI Component Audit

Generated: 2026-05-22T02:02:11.046Z

Target: 10.10.10.148

Original mediaurlbase: `/luci-static/vitrawrt`

Restored mediaurlbase: `/luci-static/vitrawrt`

## Summary

- bootstrap: audited 8 pages.
  dropdown before/open/close visible items: 0 / 0 / 0.
  dynlist items/add buttons: 4 / 1.
  ifacebox floating tooltip count: 1.
  syslog width: log=1180px main=1180px.
  startup widest table=1180px main=1180px rowPairs=76.
  vnStat vertical tab menus: 0.

- argon: audited 8 pages.
  dropdown before/open/close visible items: 0 / 3 / 0.
  dynlist items/add buttons: 4 / 1.
  ifacebox floating tooltip count: 1.
  syslog width: log=1192px main=1232px.
  startup widest table=1192px main=1232px rowPairs=76.
  vnStat vertical tab menus: 0.

- vitrawrt: audited 8 pages.
  dropdown before/open/close visible items: 0 / 4 / 0.
  dynlist items/add buttons: 4 / 1.
  ifacebox floating tooltip count: 1.
  syslog width: log=1168px main=1168px.
  startup widest table=1168px main=1168px rowPairs=76.
  vnStat vertical tab menus: 0.

## Focus Areas

- CBI dropdown: options should be hidden before open, visible when open, hidden after close.
- CBI dynlist: existing items, add control, and remove affordance must remain present.
- Apply area: theme must not force apply/reboot or modal areas visible.
- ifacebox hover: statistic and network hover details should remain floating overlays.
- syslog: filter controls and log output should use the available main width.
- startup: table and action buttons should follow native horizontal flow.
- vnStat: tabs and tab panels should remain controlled by the plugin/native LuCI logic.

## Raw Artifacts

- Output root: audit-output/cbi-components
- JSON summary: audit-output/cbi-components/summary.json
