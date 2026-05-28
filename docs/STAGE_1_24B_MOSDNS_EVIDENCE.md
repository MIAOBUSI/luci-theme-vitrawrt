# Stage 1.24B MosDNS Evidence

Evidence source:

- Host: `10.10.10.148`
- Raw evidence: `audit-output/stage-1.24B-evidence/evidence-before.json`
- Screenshots:
  - `audit-output/stage-1.24B-evidence/light-mosdns-basic.png`
  - `audit-output/stage-1.24B-evidence/dark-mosdns-basic.png`
  - `audit-output/stage-1.24B-evidence/light-mosdns-config.png`
  - `audit-output/stage-1.24B-evidence/dark-mosdns-config.png`
  - `audit-output/stage-1.24B-evidence/light-mosdns-log.png`
  - `audit-output/stage-1.24B-evidence/dark-mosdns-log.png`

## Pages Inspected

| Page | URL | Body class | Overflow |
|---|---|---|---|
| Basic | `/cgi-bin/luci/admin/services/mosdns` | `vwrt-page-mosdns vwrt-page-plugin` | no |
| Config | `/cgi-bin/luci/admin/services/mosdns/config` | `vwrt-page-mosdns vwrt-page-plugin` | no |
| Log | `/cgi-bin/luci/admin/services/mosdns/log` | `vwrt-page-mosdns vwrt-page-plugin` | no |

Some MosDNS subroutes render mostly the tab shell on this host, so the basic page provides the strongest DOM evidence for forms, editors, and action buttons.

## DOM Map

| Area | Observed DOM |
|---|---|
| Root | `#maincontent .cbi-map#cbi-mosdns` |
| Status strip | `div.cbi-section#status_bar` |
| Main form section | `div.cbi-section` with nested `ul.cbi-tabmenu` for `基本选项`, `高级选项`, `Cloudflare 选项`, `API 选项`, `GeoData 导出` |
| Top tabs | `ul.tabs.cbi-tabmenu` with `基本设置`, `规则列表`, `更新数据库`, `日志` |
| Editors | `textarea.cbi-input-textarea` containing YAML/log/list config |
| Buttons | `.cbi-button-apply`, `.cbi-button-add`, `.btn.cbi-button` |
| Fields | LuCI inputs, selects, `textarea.cbi-input-textarea`, and CBI field rows |

## Computed Style Evidence

| Issue | Evidence |
|---|---|
| Status panel still reads as ordinary CBI card | `#status_bar` is a full `.cbi-section` with same large panel surface as heavier forms. |
| Buttons need clearer roles | `刷新 DNS 缓存` is `.cbi-button-apply`, add buttons are `.cbi-button-add`, but many are still neutral glass in first glance. |
| Editor/readable text areas need plugin editor material | `textarea.cbi-input-textarea` background is `rgba(238, 244, 248, 0.56)`, readable but visually similar to ordinary field. |
| Nested tab rhythm is acceptable but heavy | Both top and nested `ul.cbi-tabmenu` use the shared pill background and can feel stacked. |
| Saturated blue is not dominant | Before count: basic light `2`, config/log `0`; dark basic `4`. MosDNS needs rhythm/editor polish more than blue cleanup. |

## Fix Strategy

Use only `body.vwrt-page-mosdns` selectors.

- Make `#status_bar` a compact status notice, not a large ordinary card.
- Improve MosDNS sections with calmer plugin material and less nesting.
- Style config/list textareas as readable editor surfaces while keeping form values intact.
- Preserve existing LuCI tab behavior and field controls.
- Apply page-scoped role coloring for `.cbi-button-apply`, `.cbi-button-add`, and neutral plugin actions.
- Do not modify MosDNS JS, fetch service data, hide content, or rewrite plugin DOM.
