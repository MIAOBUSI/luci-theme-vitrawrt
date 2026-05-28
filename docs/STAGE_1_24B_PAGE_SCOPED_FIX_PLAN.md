# Stage 1.24B Page-Scoped Fix Plan

Stage 1.24B is page-scoped. It must not add global table normalization or another global component owner.

## Architecture Guardrails

- `luci-visual.css` remains unimported.
- `luci-components-visual.css` remains the active LuCI component visual owner.
- `luci-layout-exceptions.css` receives page-specific OpenClash, MosDNS, and Network polish.
- `boot.js` may only update version and passive route classes.
- No plugin JS, no service fetch, no DOM rewrite.

## OpenClash

Selectors:

- `body.vwrt-page-openclash #maincontent .oc`
- `body.vwrt-page-openclash #maincontent .main-card`
- `body.vwrt-page-openclash #maincontent .sub-card`
- `body.vwrt-page-openclash #maincontent .announcement-card`
- `body.vwrt-page-openclash #maincontent #tab`
- `body.vwrt-page-openclash #maincontent textarea`
- `body.vwrt-page-openclash #maincontent pre`
- `body.vwrt-page-openclash #maincontent .icon-btn`
- `body.vwrt-page-openclash #maincontent .action-btn`
- `body.vwrt-page-openclash #maincontent .upload-btn`
- `body.vwrt-page-openclash #maincontent .mode-tab`

Fix:

- reduce nested plugin slab feeling;
- calm saturated blue controls;
- refine log/editor panels;
- preserve OpenClash DOM and JS.

## MosDNS

Selectors:

- `body.vwrt-page-mosdns #maincontent #status_bar`
- `body.vwrt-page-mosdns #maincontent .cbi-section`
- `body.vwrt-page-mosdns #maincontent textarea.cbi-input-textarea`
- `body.vwrt-page-mosdns #maincontent .cbi-tabmenu`
- `body.vwrt-page-mosdns #maincontent .cbi-button-*`

Fix:

- compact status bar;
- improve editor/log material;
- clarify add/apply/refresh roles;
- preserve CBI values and MosDNS plugin behavior.

## Network

Selectors:

- `body.vwrt-page-network #maincontent .ifacebox`
- `body.vwrt-page-network #maincontent .ifacebox-head`
- `body.vwrt-page-network #maincontent .ifacebox-body`
- `body.vwrt-page-network #maincontent .ifacebadge`
- `body.vwrt-page-network #maincontent .network-status-table`
- `body.vwrt-page-network #maincontent .cbi-section-table-row`
- `body.vwrt-page-network #maincontent code`
- network action buttons with existing semantic classes.

Fix:

- reduce LAN green strip saturation;
- soften interface/device table surfaces;
- improve global options rhythm;
- keep tooltip behavior;
- no table layout/display/nowrap/column width changes.

## Regression Guards

- vnStat2 media filters remain `0`.
- Progress inline width remains LuCI-owned.
- routes/network/dhcp tab gaps remain stable.
- cbi-dropdown, cbi-dynlist, modal close/tabs, apply dock, and ifacebox hover remain runtime-safe.
