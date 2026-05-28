# Stage 1R9 Notes

Stage 1R9 keeps the Stage 1R8 isolation rule: VitraWrt does not take over LuCI
runtime components and does not repair tab state by simulating user clicks.

## Software Package Manager

Modern LuCI exposes the software package page at:

- `/admin/system/package-manager`

Older or alternate trees may expose:

- `/admin/system/packages`

The theme adds `body.vwrt-page-packages` for both paths. The package action
button fix is scoped to that page class and only targets the package list action
column. It restores action buttons such as Installed, Remove, Update, and Install
to natural capsule-sized controls instead of letting them stretch across the
whole action cell.

## vnStat2 Graph Spacing

The vnStat2 page uses tabbed graph panels with `.cbi-section[data-tab]`. In the
observed real-device DOM, inactive graph panels were not visible but still kept
small layout boxes, which caused later graph tabs to appear farther away from
the tab bar.

Stage 1R9 only collapses the placeholder height of inactive vnStat2 graph panels
within `body.vwrt-page-vnstat2`. It does not change `display`, `hidden`,
`aria-selected`, active classes, or any LuCI/vnStat2 JavaScript state.

## Limitations

If vnStat2 or `/admin/network` has first-load tab initialization behavior from
the app or LuCI itself, the theme records it as a compatibility limitation. The
theme must not hide that by fake-clicking tabs or implementing its own tab
system.
