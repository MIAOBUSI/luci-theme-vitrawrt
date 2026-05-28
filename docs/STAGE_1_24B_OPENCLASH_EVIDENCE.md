# Stage 1.24B OpenClash Evidence

Evidence source:

- Host: `10.10.10.148`
- Raw evidence: `audit-output/stage-1.24B-evidence/evidence-before.json`
- Screenshots:
  - `audit-output/stage-1.24B-evidence/light-openclash-overview.png`
  - `audit-output/stage-1.24B-evidence/dark-openclash-overview.png`
  - `audit-output/stage-1.24B-evidence/light-openclash-config.png`
  - `audit-output/stage-1.24B-evidence/dark-openclash-config.png`
  - `audit-output/stage-1.24B-evidence/light-openclash-log.png`
  - `audit-output/stage-1.24B-evidence/dark-openclash-log.png`

## Pages Inspected

| Page | URL | Body class | Overflow |
|---|---|---|---|
| Overview | `/cgi-bin/luci/admin/services/openclash` | `vwrt-page-openclash vwrt-page-plugin` | no |
| Config / upload | `/cgi-bin/luci/admin/services/openclash/config` | `vwrt-page-openclash vwrt-page-plugin` | no |
| Logs | `/cgi-bin/luci/admin/services/openclash/log` | `vwrt-page-openclash vwrt-page-plugin` | no |

## DOM Map

| Area | Observed DOM |
|---|---|
| Main LuCI shell | `#maincontent .cbi-map#cbi-openclash`, `fieldset.cbi-section`, `.cbi-section#tab` |
| Plugin container | `.oc`, `.main-card`, `.myip-main-card`, `.developer-container`, `.announcement-card`, `.sub-card` |
| Status cards | `.main-card`, `.card-row`, `.card-content`, `.card-value`, `.card-controls` |
| Action buttons | `button.icon-btn.action-btn`, `.dashboard-btn`, `.copy-btn`, `.upload-btn`, `.mode-tab`, `.cbi-button-*`, `.btn` |
| Tabs / segmented controls | `ul.tabs.cbi-tabmenu`, `ul.cbi-tabmenu`, `.mode-tabs`, `.cbi-button-group` |
| Upload controls | `/config` page has `.cbi-map#cbi-upload`, file type controls, upload buttons, and config file list tables |
| Log panel | `/log` page has `div#tab.cbi-section`, nested `ul.cbi-tabmenu`, `textarea`, `pre.CodeMirror-line`, `pre.CodeMirror-line-like` |

## Computed Style Evidence

| Issue | Evidence |
|---|---|
| Saturated blue still present | Before count: overview light `7`, config light `1`, log light `23`; dark mirrors the same counts. Log page is the worst offender. |
| Plugin cards partially integrated but still heavy | `.oc` / `.main-card` use translucent surfaces, but nested `cbi-map` + `cbi-section` + plugin cards create repeated material layers. |
| Action buttons too uniform | Several `button.icon-btn.action-btn` and `.btn` use the same neutral material regardless of action role. |
| Log sub-tabs look native | `/log` nested `ul.cbi-tabmenu` computed background `rgb(241, 245, 249)`, radius `8px`, visually unlike VitraWrt tabs. |
| Code/log panels need calmer editor surface | `textarea` and `pre.CodeMirror-line` use field surface, but log panels need a more dedicated readable editor material. |

## Fix Strategy

Use only `body.vwrt-page-openclash` selectors.

- Soften `.oc`, `.main-card`, `.sub-card`, `.announcement-card`, and log panels into one VitraWrt plugin material.
- Reduce plugin nested borders and avoid adding another global card layer.
- Restyle `.icon-btn`, `.action-btn`, `.dashboard-btn`, `.copy-btn`, `.upload-btn`, `.mode-tab`, and plugin `.btn` with page-scoped role colors.
- Replace saturated plugin-blue inline-style visuals with calm tokenized info/primary material where safe.
- Restyle log `#tab`, nested `.cbi-tabmenu`, `textarea`, and CodeMirror-like `pre` rows.
- Do not modify OpenClash JS, fetch service data, hide content, or rewrite plugin DOM.
