# Stage 1.24A vnStat2 Rhythm Evidence

Evidence source:

- Host: `10.10.10.148`
- Raw evidence: `audit-output/stage-1.24A-evidence/evidence-before.json`
- Route evidence: `audit-output/stage-1.24A-evidence/vnstat2-route-evidence-before.json`
- Before screenshots:
  - `audit-output/stage-1.24A-evidence/light-vnstat2-graphs-route-before.png`
  - `audit-output/stage-1.24A-evidence/light-vnstat2-config-route-before.png`
  - `audit-output/stage-1.24A-evidence/dark-vnstat2-graphs-route-before.png`
  - `audit-output/stage-1.24A-evidence/dark-vnstat2-config-route-before.png`

## DOM Map

| Area | Observed DOM |
|---|---|
| Top tab menu | `div#tabmenu` containing links `图表` and `配置`; links navigate to `/graphs` and `/config`. |
| Secondary graph tabs | Visible tab links inside `#maincontent` below the top tab menu: `摘要`, `顶部`, `5 分钟`, `每小时`, `每天`, `每月`, `按年`. |
| Graph wrapper | First visible graph content is `div.cbi-section` with generated graph images such as `img#graph_s_br-lan` and `img#graph_s_eth0`. |
| Config wrapper | First visible config content is `div#cbi-vnstat-vnstat.cbi-section`. |
| Chart content | Graph images are regular `img` elements. No canvas was observed in the current capture. |
| CBI wrapper | Config page uses normal CBI section and dropdown internals. |

## Computed Spacing Before

| Mode / Route | Tab bar bottom | Active content top | Absolute gap | Active content selector | Wrapper margin/padding |
|---|---:|---:|---:|---|---|
| light `/graphs` | `201px` | `293px` | `96px` route evidence / `92px` first collector | `div.cbi-section` | `margin-top: 8px`, `padding-top: 10px` |
| dark `/graphs` | `201px` | `293px` | `96px` route evidence / `92px` first collector | `div.cbi-section` | `margin-top: 8px`, `padding-top: 10px` |
| light `/config` | measured by route evidence | measured by route evidence | `108px` | `div#cbi-vnstat-vnstat.cbi-section` | inherited normal CBI section rhythm |
| dark `/config` | measured by route evidence | measured by route evidence | `108px` | `div#cbi-vnstat-vnstat.cbi-section` | inherited normal CBI section rhythm |

## Graph Filter Safety

Observed graph media:

- `img#graph_s_br-lan`
- `img#graph_s_eth0`
- `img#graph_t_br-lan`
- `img#graph_t_eth0`

Computed `filter` for graph media: `none`.

Stage 1.24A must preserve this. It must not use `filter: invert()`, `filter: brightness()`, image recolor, canvas manipulation, graph redraw, or plugin JS changes.

## Suspected CSS Cause

The excessive absolute gap is caused by stacked plugin rhythm:

- top `#tabmenu` ends around `201px`;
- secondary graph tabs start around `249px`;
- the first graph panel starts around `293px`;
- Stage 1.23 tightened CBI panel margin to `8px`, but did not reduce the top-to-secondary-tab and secondary-tab-to-graph wrapper rhythm enough.

## Final Fix Strategy

Use only page-scoped selectors under `body.vwrt-page-vnstat2`.

- tighten `#tabmenu` bottom rhythm;
- reduce secondary graph tab margin;
- bring first graph/config section closer to tab controls;
- keep generated graph image/canvas content untouched;
- do not force tab visibility or display lifecycle;
- do not affect non-vnStat2 pages.

Target: reduce absolute gap toward `16px-32px` where plugin DOM allows it.

## After Verification

Final audit:

- `audit-output/visual-direction-1.24A/20260526-235753/`
- `docs/VISUAL_DIRECTION_AUDIT_1_24A.md`

The first deploy showed that the CSS did not apply on `/status/vnstat2/graphs` because `boot.js` only matched the exact `/status/vnstat2` path. Stage 1.24A corrected the existing passive route-class matcher to include subroutes:

- observed body class after fix: `vwrt-page-vnstat2`;
- JavaScript behavior remains passive class tagging only.

| Mode / Tab | Before gap | After gap | Status |
|---|---:|---:|---|
| light `图表` | `96px` | `71px` | Improved, still above ideal target |
| light `配置` | `108px` | `89px` | Improved, still above ideal target |
| dark `图表` | `96px` | `71px` | Improved, still above ideal target |
| dark `配置` | `108px` | `89px` | Improved, still above ideal target |

The remaining absolute gap includes real vnStat2 plugin content between the top tab menu and graph/config body:

- `#view > h2` plugin title;
- empty plugin paragraph spacer;
- secondary graph tab menu (`摘要`, `顶部`, `5 分钟`, `每小时`, `每天`, `每月`, `按年`);
- then the graph/config wrapper.

Further reduction to `16px-32px` would require hiding or structurally reworking plugin-owned heading/secondary tab content. That is intentionally not done in 1.24A because the stage forbids plugin DOM rewrite and fake visual states.

Graph media safety after fix:

- `mediaFiltersApplied: 0`;
- graph images such as `img#graph_s_br-lan` keep computed `filter: none`;
- no image/canvas recolor rules were added.
