# Stage 1.24B Network Evidence

Evidence source:

- Host: `10.10.10.148`
- Raw evidence: `audit-output/stage-1.24B-evidence/evidence-before.json`
- Screenshots:
  - `audit-output/stage-1.24B-evidence/light-network-network.png`
  - `audit-output/stage-1.24B-evidence/dark-network-network.png`
  - `audit-output/stage-1.24B-evidence/light-network-tab-01-接口.png`
  - `audit-output/stage-1.24B-evidence/light-network-tab-02-设备.png`
  - `audit-output/stage-1.24B-evidence/light-network-tab-03-全局网络选项.png`
  - `audit-output/stage-1.24B-evidence/dark-network-tab-01-接口.png`
  - `audit-output/stage-1.24B-evidence/dark-network-tab-02-设备.png`
  - `audit-output/stage-1.24B-evidence/dark-network-tab-03-全局网络选项.png`
  - `audit-output/stage-1.24B-evidence/light-network-iface-hover.png`
  - `audit-output/stage-1.24B-evidence/dark-network-iface-hover.png`

## Pages Inspected

| Page | URL | Body class before | Overflow |
|---|---|---|---|
| Interfaces / devices / global options | `/cgi-bin/luci/admin/network/network` | `vwrt-page-network` | no |
| Routes | `/cgi-bin/luci/admin/network/routes` | no network route class before 1.24B | no |
| DHCP | `/cgi-bin/luci/admin/network/dhcp` | no network route class before 1.24B | no |

Stage 1.24B needs a passive route-class correction so routes and DHCP pages can receive network page-scoped polish without global selectors.

## DOM Map

| Area | Observed DOM |
|---|---|
| Network map | `#maincontent .cbi-map#cbi-network` |
| Interface tab root | `.cbi-section.cbi-tblsection#cbi-network-interface` |
| Device table | `.cbi-section.cbi-tblsection#cbi-network-device`, table rows and `.cbi-section-table-row` |
| Global options | network tab route for `全局网络选项`, normal CBI form sections |
| Ifacebox | `.ifacebox`, `.ifacebox-head`, `.ifacebox-head.active`, `.ifacebox-body`, `.ifacebadge`, `.cbi-tooltip.ifacebadge.large` |
| Interface action buttons | `.cbi-button-neutral.reconnect`, `.cbi-button-neutral.down`, `.cbi-button-edit`, `.cbi-button-remove` |
| Modal | Network edit modal still uses LuCI modal/tabs/fields and must remain lifecycle-owned by LuCI. |

## Computed Style Evidence

| Issue | Evidence |
|---|---|
| LAN strip too saturated | `.ifacebox-head` computed background: `rgb(144, 240, 144)`. This is a large green strip and too visually dominant. |
| Interface cards still show native slab rhythm | `.ifacebox` is a rounded card, but head/body split and table row slabs remain visually heavy. |
| Tooltip behavior exists and must be preserved | `.cbi-tooltip.ifacebadge.large` is present on hover evidence; do not fake hover. |
| Routes/DHCP missing route class | Before evidence shows `network-routes` and `network-dhcp` body classes lack `vwrt-page-network`. |
| Inline code can look native | Network/DHCP code snippets compute `background: rgb(238, 238, 238)`, `color: rgb(64, 64, 64)`. |

## Fix Strategy

Use only `body.vwrt-page-network` selectors and fix the passive route-class matcher.

- Add `vwrt-page-network` to `/admin/network/routes` and `/admin/network/dhcp` through existing passive `boot.js` tagging.
- Soften `.ifacebox`, `.ifacebox-head`, `.ifacebox-body`, `.ifacebadge`, and `network-status-table`.
- Turn LAN green into a subtle status accent, not a dominant saturated strip.
- Refine device/interface table row backgrounds without `table-layout`, global `display`, `nowrap`, or column width changes.
- Style inline network code snippets visually only.
- Preserve native ifacebox hover tooltip and all LuCI network form behavior.
