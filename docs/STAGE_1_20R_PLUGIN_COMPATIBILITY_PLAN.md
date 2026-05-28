# Stage 1.20R Plugin Compatibility Plan

The theme must improve plugin pages without controlling plugin behavior or fetching service data.

## Page Targets

| Plugin/Page | Likely route/body class | Safe visual targets | Do not change |
|---|---|---|---|
| OpenClash | `/admin/services/openclash*`, body route class if emitted | panels, action buttons, tabs, log/terminal area, tables, upload/file controls | plugin JS, service data, start/stop logic, iframe/external app layout |
| MosDNS | `/admin/services/mosdns*` | tabs, CBI rows, config textarea/editor, action bars, status panels | daemon status logic, config generation, editor lifecycle |
| vnStat2 | `/admin/status/vnstat2` | graph panel rhythm, tab chips, chart container surface | tab visibility, graph image generation |
| Packages | `/admin/system/packages` | package action controls and table row visual | opkg/apk logic, package button behavior |
| Startup | `/admin/system/startup` | compact action groups and table rhythm | init script actions |
| Processes | `/admin/status/processes` | page-scoped semantic columns and button visuals | process kill/hangup behavior |
| Network share/NAS | NAS/share routes | wide form/table overflow containment and field material | plugin form names/values |

## CSS Scope

- Use body page classes where available.
- Use route-derived classes from existing boot/page markers only.
- Fall back to conservative selectors under `#maincontent` for generic plugin panels, tabs, buttons, file inputs, textareas, and pre/log blocks.
- No global table normalization.

## Acceptance

OpenClash and MosDNS are marked:

- `fixed` if screenshots show page-scoped panels/buttons/tabs/log/editor matching VitraWrt material.
- `partially fixed` if route is unavailable on the test host or only generic plugin styling applies.
- `not fixed` only if screenshots show raw plugin white/native patches after styling.
