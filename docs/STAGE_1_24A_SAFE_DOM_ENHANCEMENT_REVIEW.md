# Stage 1.24A Safe DOM Enhancement Review

## Questions

| Question | Answer |
|---|---|
| Can vnStat2 rhythm be fixed with page-scoped CSS? | Partially. The visual spacing can be reduced with page-scoped CSS, but the route class must be present on `/status/vnstat2/graphs` and `/status/vnstat2/config`. |
| Can progress meter be improved with CSS/pseudo-elements? | Yes. The active DOM is `#maincontent .cbi-progressbar > div`; LuCI inline width is preserved. |
| Is passive class injection needed? | Existing passive body route tagging is needed. Stage 1.24A only corrected the existing `vwrt-page-vnstat2` matcher so subroutes receive the already-defined class. |
| Is a theme-owned wrapper possible without moving LuCI nodes? | Not needed for this stage. |
| Is any LuCI prototype hook needed? | No. |

## Stage 1.24A Implementation Policy

Stage 1.24A uses CSS-first changes. The only JavaScript change is a passive route-class matcher/version update in `boot.js`:

- `html[data-vitrawrt]` version marker is `1.24A`;
- `/status/vnstat2/...` subroutes now receive `body.vwrt-page-vnstat2`;
- no LuCI-owned nodes are moved, wrapped, hidden, rebuilt, or clicked.

No lifecycle risk is introduced:

- no fake clicks
- no `dispatchEvent`
- no forced tab state
- no dropdown/dynlist/modal manipulation
- no moved, cloned, wrapped, deleted, or replaced LuCI-owned nodes
- no service data fetching

Regression coverage:

- `check-js-safety`
- `check-css-safety`
- `runtime-regression-test`
- `visual-direction-audit`
