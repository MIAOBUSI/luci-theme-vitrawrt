# Stage 1.23 Button Role Matrix

Evidence source:

- Raw data: `audit-output/stage-1.23-evidence/stage-1.23-evidence.json`
- Network buttons observed: `重启`, `停止`, `编辑`, `删除`, `添加新接口...`, `配置...`, `取消配置`, `保存并应用`
- OpenClash buttons observed: plugin `icon-btn action-btn`, `config-upload-btn-large`, `copy-btn`

Current problem:

- Most buttons compute to the same neutral glass background.
- Semantic roles are not visually distinguishable enough.
- OpenClash buttons were page-scoped in 1.22 but still need role-aware low-saturation treatment.

## Role Matrix

| Role | Primary selectors | Page-scoped fallback | Visual target | Forbidden |
|---|---|---|---|---|
| Primary / Apply / Save | `.cbi-button-apply`, `.cbi-button-save`, `.cbi-button-positive`, `.btn-primary`, important submit buttons | apply dock split button | calm blue/cyan-blue graphite material | saturated Bootstrap blue, global green |
| Success / Add / Upload / Enable | `.cbi-button-add`, upload buttons, constructive plugin upload controls | text contains add/upload only when page-scoped | soft mint/green as semantic constructive accent | green global panels or active tabs |
| Warning / Restart / Reset / Reload / Reconnect | `.cbi-button-reset`, `.cbi-button-reload`, `.reconnect`, `.restart`, `.reload` | network/service page text fallback for `重启`, `复位`, `重新连接`, `Reload` | soft amber/orange | loud orange blocks |
| Danger / Delete / Remove / Stop / Kill | `.cbi-button-remove`, `.cbi-button-negative`, `.btn-danger`, `.down`, stop/kill process actions | page-scoped text fallback for `删除`, `停止`, `Kill`, `Force Kill` | soft rose/red | heavy red slabs |
| Neutral / Edit / Configure / Cancel / Close | `.cbi-button-edit`, `.cbi-button-neutral`, `.btn-default`, normal `.btn` | normal plugin buttons | translucent graphite/neutral | uniform disabled gray look |
| Info / Refresh / Check Update | `.cbi-button-action`, refresh/check/update classes | OpenClash check/update, package update controls | soft cyan/blue | plastic blue |

## Implementation Rules

- Use LuCI semantic classes first.
- Use page-scoped text fallback only where classes are insufficient.
- Keep natural widths; no global `width: 100%`.
- Keep focus ring visible.
- Recalculate gaps for apply dock, table actions, plugin action bars, and modal footer.
- Do not globally repaint all buttons with one color.
