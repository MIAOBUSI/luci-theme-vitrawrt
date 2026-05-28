# Stage 1.24B Button Plugin Role Audit

Evidence source:

- `audit-output/stage-1.24B-evidence/evidence-before.json`

## Role Matrix

| Role | Preferred selectors | Page-scoped fallback | Visual target |
|---|---|---|---|
| Primary / Apply / Save | `.cbi-button-apply`, `.cbi-button-save`, `.btn-primary`, `input[type="submit"]` | OpenClash/MosDNS active tabs or submit-like plugin buttons | calm blue/cyan-blue material |
| Success / Add / Upload / Enable | `.cbi-button-add`, `.btn-success`, `.upload-btn` | plugin upload/config add controls | soft mint, constructive only |
| Warning / Restart / Reset / Reload / Reconnect | `.cbi-button-reset`, `.cbi-button-reload`, `.reconnect` | text-scoped only inside plugin/network pages | soft amber/orange |
| Danger / Delete / Remove / Stop / Kill | `.cbi-button-remove`, `.cbi-button-negative`, `.down` | OpenClash stop/clear-like plugin buttons if classed | soft rose/red |
| Neutral / Edit / Configure / Cancel / Close | `.cbi-button-edit`, `.cbi-button-neutral`, `.cancel-btn`, `.btn` | default plugin buttons | graphite/translucent neutral |
| Info / Refresh / Check Update | `.cbi-button-action`, `.copy-btn`, `.dashboard-btn`, `.icon-btn.action-btn` | refresh/check/update plugin controls | soft cyan/blue |

## Evidence

| Page | Observed button issue |
|---|---|
| OpenClash overview | `button.icon-btn.action-btn`, `.theme-toggle-btn`, `.dashboard-btn`, and plugin icon buttons are mostly uniform neutral material. |
| OpenClash config | reload/reset inputs use the same dark primary-looking background and need role separation. |
| OpenClash log | saturated blue count `23`; nested log controls and tabs still show plugin-native blue/gray styling. |
| MosDNS basic | add buttons and `刷新 DNS 缓存` are classed well but still need clearer page-scoped role color. |
| Network interface | `重启`, `停止`, `编辑`, `删除` already have classes; keep roles but soften materials and match page rhythm. |

## Rules

- Do not globally repaint all buttons.
- Prefer LuCI/plugin semantic classes.
- Text fallback is allowed only under `body.vwrt-page-openclash`, `body.vwrt-page-mosdns`, or `body.vwrt-page-network`.
- Keep natural button width and avoid global forced width.
- Do not use saturated Bootstrap blue.
- Do not make all plugin actions neutral; role recognition matters.

## Stage 1.24B Fix Strategy

- Keep global role system intact from Stage 1.23.
- Add page-scoped role refinements for OpenClash, MosDNS, and Network in `luci-layout-exceptions.css`.
- Use calm info/primary styling for plugin active/action buttons.
- Use soft mint only for add/upload/enable.
- Use soft amber for reconnect/reload/reset.
- Use soft rose for stop/delete/remove.
