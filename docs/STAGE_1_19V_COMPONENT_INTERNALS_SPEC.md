# Stage 1.19V Component Internals Spec

| Component | LuCI selector | 1.19V visual rule | Safety boundary |
|---|---|---|---|
| input | `input[type=text/password/number/search/date/time/email/url/tel]` | frosted capsule, shared height, subtle focus aura | no global forced width |
| select | `select` | same field material, native opening preserved | no option styling |
| textarea | `textarea` | same field surface, larger radius, readable monospace where native | no forced layout |
| file input | `input[type=file]`, `::-webkit-file-upload-button` | file button follows secondary button material | no file behavior change |
| checkbox | `input[type=checkbox]` | accent color only, usable native box | no size/click-area rewrite |
| radio | `input[type=radio]` | accent color only | no size/click-area rewrite |
| cbi-dropdown closed | `.cbi-dropdown` | same field material as select | no display/visibility override |
| cbi-dropdown open | `.cbi-dropdown ul.dropdown` | glass popover, option rows | no forced option exposure |
| cbi-dropdown option | `.cbi-dropdown ul.dropdown > li` | selected/hover material | no option lifecycle |
| cbi-dynlist existing item | `.cbi-dynlist-item` | grouped frosted row | no display lifecycle |
| cbi-dynlist remove | `.cbi-dynlist .cbi-button-remove` | compact rose/neutral control | button remains visible |
| cbi-dynlist add input | `.cbi-dynlist input` | field system | no width forcing |
| cbi-dynlist add button | `.cbi-dynlist .cbi-button-add` | compact primary/secondary control | add remains clickable |
| page tabs | `#maincontent .tabs`, `.cbi-tabmenu` | floating glass pills | no display/visibility/active manipulation |
| modal tabs | `.modal .tabs`, `.modal .cbi-tabmenu` | same pills as page tabs | modal lifecycle preserved |
| apply buttons | `.cbi-page-actions .cbi-button` | compact control island buttons | apply lifecycle preserved |
| table actions | table `.cbi-button`, `.btn` | natural compact controls | no global width |
| package buttons | `body.vwrt-page-packages` scoped | natural width compact actions | page scoped |
| startup buttons | `body.vwrt-page-startup` scoped | aligned compact actions | page scoped |
| process buttons | `body.vwrt-page-processes` scoped | compact action row | page scoped |
| modal footer buttons | `.modal-footer .btn`, `.modal-footer .cbi-button` | same button family | close/save behavior preserved |
| progress track/fill | `.cbi-progressbar`, `.progress`, `progress` | soft trough + aqua/mint fill | width/value untouched |
| ifacebox | `.ifacebox` | compact mini-card | hover tooltip native |
| network card | `.network-status-table` | soft mini panel | no forced full width |
| sidebar parent item | `.vwrt-menu.l1 > li > .vwrt-menu-row` | integrated row pill | href/click unchanged |
| sidebar child item | `.vwrt-menu .l2 .vwrt-menu-row` | inset line, no heavy panel | active expansion unchanged |
| sidebar chevron | `.vwrt-menu-expander` | belongs to row | click handler unchanged |
| sidebar bottom dock | `.vwrt-sidebar-actions` | self-contained dock | VitraWrt shell only |

## Risk Controls

- Use `luci-components-visual.css` for visual skins.
- Use `luci-layout-exceptions.css` only for page-scoped process/package/startup/network-share layout.
- Do not style `select option`.
- Do not use JS to move/wrap LuCI content.
- Keep Status -> Overview native.
