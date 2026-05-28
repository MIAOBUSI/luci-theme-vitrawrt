# VitraWrt Component Visual Spec 1.17

This spec maps Apple/previews v4 visual direction to native LuCI selectors without changing LuCI behavior. Allowed properties mean visual CSS only; forbidden properties include lifecycle and broad layout changes unless explicitly page-scoped and tested.

| Component | Current problem | Reference / preview v4 target | LuCI selector | Allowed CSS | Forbidden CSS / behavior | Implementation strategy | Regression risk | Audit target |
|---|---|---|---|---|---|---|---|---|
| Page shell | Pale grey-blue shell | Mist ice background with aqua/violet diffusion | `body`, `#maincontent` | background, color, padding | transform/filter/perspective ancestors | Tokenized mesh gradients | Modal fixed positioning | overview light/dark |
| Sidebar expanded | Heavy stacked rail | Single premium management rail | `#vwrt-sidebar`, `.vwrt-menu` | background, border, radius, shadow, spacing | menu route/click logic | Stronger rail surface and active item | full-menu expand | sidebar expanded |
| Sidebar collapsed | Squeezed rail | Dedicated icon rail | `body.vwrt-sidebar-collapsed` sidebar nodes | width, spacing, radius, tooltip visuals | auto-expand | Rail-specific layout branch | bottom overflow | collapsed screenshot |
| Sidebar bottom controls | Can feel cramped | Glass control dock | `.vwrt-sidebar-controls` | background, gap, radius, icons | moving controls with JS | compact vertical/cluster rail rules | clipped controls | collapsed controls |
| Menu group | Weak hierarchy | Section label and calm groups | `.vwrt-menu-group`, `.vwrt-menu-row` | color, background, border, radius | changing href/active logic | muted default icons, restrained active | bad contrast | sidebar |
| Menu child item | Native-ish child list | guide line + soft child pill | `.vwrt-menu .l2` | color, border, background | expand all children | child guide and dot rhythm | over-expansion | sidebar |
| Top warning banner | Native alert slab | glass warning capsule | `.alert-message` | background, border, radius, shadow | force display/hide | soft amber glass | apply/alert lifecycle | overview |
| Page title area | Weak rhythm | strong heading + muted copy | `#maincontent h2/h3` | font, color, margin | DOM restructure | typography token update | oversized headings | all pages |
| CBI map | Native panel shell | premium glass panel | `.cbi-map` | background, border, radius, padding | display lifecycle | glass panel material | density loss | system |
| CBI section | Flat slab | nested glass card | `.cbi-section` | background, border, padding | global overflow hacks | section material and title spacing | dropdown clipping | overview/system |
| CBI section node | Weak inner surface | inner sunken material | `.cbi-section-node` | background, border, shadow | display/hidden | inner panel surface | hidden reveal | system |
| Form row | Native row/list | designed compact row | `.cbi-value` | padding, margin, flex when visible only | hidden reveal | visible-row flex rhythm | conditional fields | system/modal |
| Form label | Low hierarchy | clear muted label | `.cbi-value-title` | color, font, spacing | hiding labels | compact label column | long label wrap | system |
| Input field | Bootstrap-ish | glass field | `input[type=text/password/number/etc]` | bg, border, radius, shadow, focus | global width 100% | unified field tokens | cramped forms | system/modal |
| Select field | Native mismatch | same as input with safe arrow | `select` | appearance, bg, border, radius | option styling/lifecycle | CSS arrow and dark-safe bg | native option issues | modal/system |
| Textarea | Native area | glass multiline field | `textarea` | bg, border, radius, padding | forced width | field system | syslog width | syslog/system |
| Checkbox/radio | Raw control | light material accent | `input[type=checkbox/radio]` | accent-color, border | hiding input | minimal native accent | click area | system |
| cbi-dropdown closed | Native white/dropdown | glass trigger | `.cbi-dropdown:not(.btn)` | bg, border, radius, shadow | display/visibility/pointer-events | stronger scoped trigger CSS | option exposure | network/modal |
| cbi-dropdown open | Raw list | glass popover where safe | `.cbi-dropdown ul.dropdown` | bg, border, shadow, color | forced open/hidden | visual list only | close behavior | dropdown screenshots |
| cbi-dynlist | Mixed field/buttons | integrated field row | `.cbi-dynlist` | bg, border, button visual | add/remove lifecycle | style child fields/buttons | add/remove broken | runtime |
| Tabs | Native or double layer | floating glass pills | `.tabs`, `.cbi-tabmenu` | color, bg, border, radius, margin | display/hidden/active JS | shared page/modal pill rules | first-load tabs | system/vnstat/modal |
| Modal tabs | Raw LuCI inside modal | same pill tabs | `.modal .cbi-tabmenu` | same as tabs | modal tab JS | modal-scoped visual | modal tabs broken | network modal |
| Tab content container | Native content | unchanged lifecycle | `[data-tab]`, tab panels | light spacing only | display/hidden rules | do not style behavior | first-load bug | vnStat2 |
| Table header | Raw table | subtle glass header | `th`, `.th` | bg, color, padding | table-layout fixed global | table skin only | column shifts | pages |
| Table row | Flat/native | soft row layers | `td`, `.td` | bg, border, hover | global display rewrite | visual skin only | layout regressions | pages |
| Package table actions | Buttons can stretch | compact natural buttons | `body.vwrt-page-packages ...` | page-scoped width | global button width | keep existing exception | button stretch | packages |
| Process table | column waste/misalignment | semantic grid columns | `body.vwrt-page-processes ...` | page-scoped grid/width | global table normalize | keep page grid | actions overflow | processes |
| Startup table | columns can drift | aligned script/actions | `body.vwrt-page-startup ...` | page-scoped widths | global table layout | keep page exception | wasted width | startup |
| Syslog filter area | Can narrow | readable filter/log area | `body.vwrt-page-syslog ...` | page-scoped width/padding | global textarea width | keep exception | narrow logs | syslog |
| Progress bar | Recolored native | glass trough and aqua fill | `.cbi-progressbar`, `.progress`, `progress` | bg, border, radius, height | JS redraw/value override | CSS fill/trough only | blank progress | overview |
| Port status ifacebox | Weak card | compact glass mini card | `.ifacebox` | bg, border, radius, shadow | DOM rewrite/position lifecycle | CSS card only | hover broken | overview/network |
| ifacebox hover tooltip | Native but functional | keep floating tooltip | `.cbi-tooltip` in ifacebox | light color polish | display/position lifecycle | mostly leave native | expanded card | runtime |
| Network upstream card | May stretch | compact glass card | `.network-status-table`, ifacebox groups | bg, border, radius | forced full width | compact max in existing flow | full-width card | overview/network |
| Apply dock | Rounded native footer | floating glass island | `.cbi-page-actions`, `#uci-apply` | width fit-content, bg, border, shadow | force show/hide, fixed/sticky | visual dock only | early apply | runtime |
| Save/apply/reset buttons | Generic button | graphite/aqua glass controls | `.cbi-button-*`, `.btn` | bg, color, border, radius | global width | tokenized button states | transparent bg | runtime |
| Modal backdrop | Harsh/native | soft dim glass backdrop | modal overlay/body class | bg color only | pointer-events/lifecycle | safe backdrop tint | close broken | modal |
| Modal sheet | Native white/blue | premium glass sheet | `.modal`, `.modal-content` | bg, border, radius, shadow | forced display/position | glass sheet tokens | close broken | modal |
| Modal header | Native text block | clear material header | `.modal-header` | bg, border, color | DOM changes | header layer | unreadable title | modal |
| Modal body | Raw form area | coherent inner material | `.modal-body` | bg, color, padding | lifecycle | inner surface + fields | white artifacts | modal |
| Modal footer | Raw actions | dock-like buttons | `.modal-footer` | bg, border, padding | fixed/sticky | button system | save broken | modal |
| Loading dialog | Plain spinner/text | small glass waiting sheet | `.spinning` | bg, border, color | hide spinner | spinner/material only | loading hidden | runtime |
| Applying changes dialog | Native waiting dialog | glass waiting sheet | apply modal/spinner | bg, border, color | apply JS | visual only | apply lifecycle | runtime if possible |
| Session timeout dialog | Native alert | glass dialog | modal/alert selectors | bg, border, button visual | login action changes | modal visual | auth broken | audit if possible |
| Login page | Improved but separate | compact premium sheet | `.vwrt-auth-*` | bg, fields, button | form action/field names | keep structure | login broken | login screenshots |
| Dark mode tables | Past white stripes | deep surface rows | dark table selectors | bg, color, border | white row reuse | dark tokens | white artifacts | dark pages |
| Dark mode modal | White native controls | deep glass sheet | dark modal fields/dropdowns | bg, color, border | dropdown lifecycle | scoped dark-safe fields | cbi dropdown broken | modal dark |
| Dark mode form fields | Mismatch native/select | unified dark fields | dark field selectors | bg, color, border | option lifecycle | CSS-only field system | low contrast | system/modal |

## Page-Scoped Table Exceptions

- `body.vwrt-page-processes`: semantic process table grid. Needed because PID/Owner/Command/CPU/Memory/Actions have fixed operational meaning.
- `body.vwrt-page-packages`: natural action buttons and readable package text.
- `body.vwrt-page-startup`: priority/script/actions alignment.
- `body.vwrt-page-network-share`: safe horizontal scroll for truly wide share tables.
- `body.vwrt-page-vnstat2`: spacing guard only, no tab behavior repair.

## Bootstrap / Argon Baseline For Process Table

The existing baseline audit records `/admin/status/processes` as non-overflowing and non-stacked under Bootstrap and Argon:

- Bootstrap main width: 1180px; buttons: not-stacked; overflow: false.
- Argon main width: 1232px; buttons: not-stacked; overflow: false.
- VitraWrt baseline main width: 1168px; buttons: not-stacked; overflow: false.

Stage 1.17 keeps the fix page-scoped to `body.vwrt-page-processes`, preserving the Bootstrap/Argon non-overflow behavior while making PID/Owner compact, Command flexible, CPU/Memory compact, and Actions natural-width/right-aligned.

## Audit Expectations

Stage 1.17 must pass JS/CSS safety, runtime regression, and visual direction audit. Screenshots must include login, overview, system, network modal, packages, processes, startup, syslog, vnStat2, dropdown open, apply dock, expanded sidebar and collapsed sidebar tooltip.
