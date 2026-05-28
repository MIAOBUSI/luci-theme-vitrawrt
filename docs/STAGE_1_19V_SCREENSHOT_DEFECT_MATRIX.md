# Stage 1.19V Screenshot Defect Matrix

| Defect | Screenshot evidence target | Suspected selector | Root cause | Safe fix strategy | Light expected | Dark expected | Regression risk |
|---|---|---|---|---|---|---|---|
| Sidebar hover text/chevron split | sidebar expanded hover | `.vwrt-menu-row`, `.vwrt-menu a`, `.vwrt-menu-expander` | link and chevron have separate visual states | move hover visual to row, keep link/chevron transparent | one soft pill | one luminous row | menu click/expand |
| Too many sidebar backgrounds | expanded sidebar | `#vwrt-sidebar`, brand/status/actions/menu rows | layered overrides accumulated | reduce rail to one surface, child list to line/inset only | airy rail | luminous rail | visual only |
| Sidebar bottom dock detached | expanded/collapsed sidebar | `.vwrt-sidebar-actions` | dock too panel-like and squeezed | softer control island, no overflow | contained | contained | theme panel position |
| Collapsed controls outside rail | collapsed sidebar | `html.vwrt-sidebar-collapsed` rules | expanded dock reused | dedicated collapsed rail controls | centered vertical dock | centered vertical dock | sidebar scroll |
| Progress looks recolored | overview progress close-up | `.cbi-progressbar`, `.progress` | fill/track still admin-like | softer trough, subtle shine, no thick border | ice trough | graphite trough | width/value untouched |
| Dynlist existing item native | network modal dynlist | `.cbi-dynlist-item input`, remove buttons | only outer container styled | group item/input/remove as same material | no white patches | no white patches | dynlist add/remove |
| Dynlist add row mismatch | dynlist add row | `.cbi-dynlist input`, `.cbi-button-add` | add controls not grouped | field/button material alignment | cohesive row | cohesive row | button visibility |
| cbi-dropdown open native | dropdown screenshot | `.cbi-dropdown ul.dropdown`, `li` | open menu not fully styled | popover material and options | ice popover | dark glass popover | open/close lifecycle |
| Inputs/selects/textarea/file mismatch | system/network/modal | input/select/textarea/file selectors | native browser surfaces remain | unified field tokens including file selector button | same family | same family | native select behavior |
| Button spacing not recalculated | apply/table/modal buttons | `.cbi-button`, `.btn` | capsule visuals without local gaps | local margin/gap, natural widths | precise controls | precise controls | no global width |
| Page/modal tabs inconsistent | system and modal | `.tabs`, `.cbi-tabmenu` | modal variants missed | shared tab selector/material | same pill style | same pill style | tab behavior |
| Modal native fragments | network edit modal | `.modal`, `.modal-body`, `.cbi-value`, `.ifacebox` | wrapper styled more than internals | style modal internals only visually | ice sheet | spatial sheet | close/dropdown/dynlist |
| Main panels square slabs | overview/system panels | `.cbi-map`, `.cbi-section` | heavy wrapper material | reduce weight, softer borders | ice panels | luminous panels | content density |
| Tables industrial | processes/packages/startup | table/th/td visual selectors | heavy row bands | lighter rows, faint separators | soft tables | no white rows | table layout |
| Process columns misalign | processes | page scoped process grid | semantic columns need tuning | keep page scoped grid only | compact PID/user | compact PID/user | process page only |
| Package buttons stretch | packages | page scoped package actions | button styling too broad | page scoped natural width | compact | compact | package page only |
| Startup alignment | startup | page scoped startup rules | fixed action width may be too large | natural compact actions | aligned | aligned | startup page only |
| Dark white patches | dark modal/dropdown/dynlist | native input/dropdown/dynlist internals | incomplete internals | field/popover/dynlist overrides | n/a | no white native patches | native controls |
| Light mode pale LuCI | light overview/system | token mismatch | dark-first design | paired light tokens | ice glass | n/a | visual |
| Did not learn Apple reference | all pages | tokens | copied mood incompletely | adopt atmosphere, reject unsafe layout | luminous | luminous | none |
| Too heavy/dark/outlined | dark pages | panels/sidebar/tables | over-bordering | lower border opacity/shadow | lighter panels | less industrial | contrast |
| Lacks luminous softness | all pages | surfaces/controls | hard glass boxes | softer highlight/air | soft | soft | readability |
