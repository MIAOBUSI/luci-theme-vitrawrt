# Stage 1.23 Page-Scoped Fix Plan

Stage 1.23 keeps Stage 1.22 ownership:

- `luci-components-visual.css`: global LuCI visual component owner.
- `sidebar.css`: sidebar-only owner.
- `luci-layout-exceptions.css`: page-scoped layout fixes only.
- `luci-visual.css`: remains not imported.

## Page-Scoped Work

| Area | Page scope | Evidence | Fix | Safety guardrail |
|---|---|---|---|---|
| vnStat2 tab spacing | `body.vwrt-page-vnstat2` | gap `94-108px` in evidence | reduce plugin tab/content wrapper spacing; normalize outer rhythm | no graph image/canvas filter/recolor; no tab lifecycle changes |
| Network interface slabs | `body.vwrt-page-network` | interface row/card still reads slab-like | soften row/card surfaces; reduce saturated LAN strip | no global table layout, display, nowrap, or column width changes |
| Global network options | `body.vwrt-page-network` | active tab gap stable, but content rhythm can be too low/empty | reduce only active page wrapper/section padding where safe | no global `.cbi-map` height changes |
| Package key/upload single form | `body.vwrt-page-packages` | form action rhythm can float in large section | local max-width and aligned action row for textarea/upload/key forms | no global textarea width forcing |
| OpenClash button roles | `body.vwrt-page-openclash` | plugin controls still numerous and uniform | role-aware page-scoped action colors and gaps | no plugin JS, no service data fetching |
| MosDNS buttons/forms | `body.vwrt-page-mosdns` | plugin page is visually separate | page-scoped buttons, tabs, editors | no plugin DOM rewrite |

## Global Component Work

- Button role skin based on semantic classes.
- Progress meter visual skin based on confirmed DOM.
- Security notice card based on `.alert-message`.
- Tabs lighter and more segmented-control-like.

## Explicit Non-Goals

- Do not recolor vnStat2 graph images/canvas.
- Do not add service data.
- Do not globally normalize tables.
- Do not re-import deprecated CSS.
- Do not add JS hooks.
