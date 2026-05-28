# Stage 1.20R Visual Truth Matrix

## Skill Responsibility Plan

- `openwrt-luci-dev`: safety reviewer only. It guards CBI lifecycle, cbi-dropdown, cbi-dynlist, modal close/tabs, apply lifecycle, ifacebox tooltip, package/startup/process pages, plugin compatibility, fake-click bans, and global table normalization bans.
- `ui-ux-pro-max`: primary visual authority. It rejects heavy bordered, grey-blue industrial, capsule-stacked, Bootstrap-like, Argon-like, or LuCI-recolor results even if they pass runtime checks.
- `playwright`: screenshot evidence authority. It must capture full pages and close-ups; runtime pass alone does not mark a visual defect fixed.
- Missing design-token/web-fx/design-auditor skills are emulated manually through selector-level tokens, component targets, CSS performance limits, and screenshot-driven fixed/partial/not-fixed status.

Stage 1.19V is behavior-safe, but the screenshots still read as LuCI plus heavy glass. This matrix defines what is actually wrong and what is safe to change.

| Defect | Screenshot evidence target | Suspected selector | Root cause | Safe fix strategy | Expected light result | Expected dark result | Regression risk |
|---|---|---|---|---|---|---|---|
| Sidebar parent hover splits label and chevron | `sidebar expanded parent hover close-up` | `.vwrt-menu-row`, `.vwrt-menu-row a`, `.vwrt-menu-expander` | Link and chevron each own a visible hover surface | Make row own hover/active material; make link/chevron transparent inside it | One soft row surface | One luminous row surface, no separate chevron pill | Low if only background/border/shadow changed |
| Sidebar has stacked glass cards | `sidebar expanded default` | `#vwrt-sidebar`, `.vwrt-sidebar-brand`, `.vwrt-sidebar-status`, `.vwrt-menu-row`, `.vwrt-sidebar-actions` | Every nested node receives its own panel shadow/border | Reduce row/card borders and shadows; keep only rail, active row, child guide, bottom dock | Airier rail | Less industrial rail | Low |
| Progress bars look recolored | `overview progress close-up` | `.cbi-progressbar`, `.progress`, `progress` | Native rectangular trough remains visible under colored fill | Use soft trough, inner light, calm aqua/mint fill, lower border | Apple-like status material | Luminous but calm trough | Low; do not change width/value |
| Dynlist native patches | `dynlist existing/add row close-up` | `.cbi-dynlist`, `.cbi-dynlist input`, `.cbi-dynlist button`, `.cbi-button-remove`, `.cbi-button-add` | Inputs and remove/add buttons styled independently | Treat item row as compound control with shared radius/material | No raw white field/button | No native white patch | Medium; avoid display lifecycle changes |
| cbi-dropdown looks native | `dropdown open/closed close-up` | `.cbi-dropdown`, `.cbi-dropdown > ul`, `.cbi-dropdown li`, `.more`, `[data-value]` | Closed token and open menu do not share field system | Style visible field/menu/options using material tokens only | Glass field/menu | Glass popover, no white menu | Medium; avoid display/visibility/pointer-events |
| Modal tabs reveal old strip | `network edit modal tab hover close-up` | `.modal .cbi-tabmenu`, `.modal .cbi-tabmenu li`, `.modal .cbi-tabmenu a` | Old tab backgrounds and borders survive hover | Transparent outer strip, independent pill anchors | Same as page tabs | Same as page tabs | Low if no lifecycle props |
| Apply dock feels capsule cluster, not island | `apply dock close-up` | `.cbi-page-actions`, `#uci-apply`, `.cbi-button-save`, `.cbi-button-reset` | Buttons grew but local dock spacing/material not recalculated | Lower dock padding, lighter background, natural button widths, subtle split divider | Compact floating island | Compact luminous island | Low |
| Modal internals still native | `network edit modal fields/footer close-up` | `.modal`, `.modal-body`, `.modal input/select/textarea`, `.modal-footer` | Sheet is too blue/heavy; internals still have native contrast | Reduce modal slab opacity, unify fields/buttons/tabs | Ice glass sheet | Graphite liquid sheet | Medium; keep close/dropdown/dynlist |
| Plugin pages under-adapted | `OpenClash`, `MosDNS`, plugin editor close-ups | `body[class*="openclash"]`, `body[class*="mosdns"]`, common plugin panels | Plugin custom markup falls outside CBI selectors | Page-scoped compatibility layer for panels, tabs, buttons, logs/editors | Less raw plugin UI | No dark native patch | Medium; only scoped visual CSS |
| Light/dark mismatch | all light/dark pairs | `html[data-theme]` tokens | 1.19V dark designed heavier than light | Paired token overrides for same geometry, different luminance only | Ice glass | Luminous graphite glass | Low |
| Tables still industrial | processes/packages/startup | table visual selectors and page-scoped exceptions | Row fills are too solid; process layout needs semantic widths | Keep layout page-scoped; reduce visual row opacity | Refined table | No white stripes, less heavy | Medium; no global table normalization |

## Do Not Mark Fixed Unless

- The screenshot crop no longer shows the stated defect.
- Runtime regression still passes.
- Safety scans still show no fake clicks and no global table normalization.
- The fix does not rely on hidden/display/active state manipulation.
