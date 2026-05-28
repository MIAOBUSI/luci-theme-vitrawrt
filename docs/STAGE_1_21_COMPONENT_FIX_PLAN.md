# Stage 1.21 Component Fix Plan

Implementation is CSS-first. No LuCI UI prototype hook is planned for Stage 1.21.

| Component | Current problem | Desired Apple/VisionOS target | Selectors | Allowed properties | Forbidden properties/actions | Screenshot target |
|---|---|---|---|---|---|---|
| Page shell | Light mode can look mint-washed; dark mode can feel industrial. | Neutral ice/graphite atmosphere with faint cyan/violet diffusion. | `html`, `body`, `#maincontent` | background, color | JS route/layout changes | full overview light/dark |
| Sidebar expanded | Hover and active rows still feel layered. | One rail, integrated row state, reduced stacking. | `#vwrt-sidebar`, `.vwrt-menu-row`, `.vwrt-menu-expander` | background, border, shadow, color, radius | href/click/menu behavior changes | sidebar hover parent/child |
| Sidebar collapsed | Bottom dock must remain contained and aligned. | Dedicated rail controls with clear icons/tooltips. | `html.vwrt-sidebar-collapsed ...` | sizing, gap, background, border | moving controls | collapsed bottom dock |
| Sidebar hover parent row | Text area and chevron can still split. | Parent row owns hover/active surface. | `.vwrt-menu.l1 > li > .vwrt-menu-row:hover` | background, border, shadow | separate chevron pill on hover | hover parent close-up |
| Sidebar chevron button | Expander can look like separate control. | Transparent child inside row state. | `.vwrt-menu-expander`, `.vwrt-menu-chevron` | color, background transparent | click handler changes | hover parent close-up |
| Sidebar child items | Too much nested glass. | Inset guide and quiet rows. | `.vwrt-menu .l2`, `.vwrt-menu .l2 .vwrt-menu-row` | border-left, background, color | child DOM changes | child active/hover |
| Sidebar bottom dock | Can feel detached. | One calm bottom control island. | `.vwrt-sidebar-actions` | background, border, shadow, gap | lifecycle/state JS | bottom dock close-up |
| CBI map | Large glass shell can hide native internals. | Neutral panel with lighter inner material. | `.cbi-map` | background, border, padding, shadow | content display lifecycle | system page |
| CBI section | Nested surfaces too visible. | Softer section panel. | `.cbi-section` | background, border, shadow | grids for all sections | system page |
| Read-only table info | Status overview reads native table. | Apple Settings-like key/value rows. | status overview table selectors, excluded operational pages | padding, background, separators | global table layout | overview info rows |
| Form row | Too tall/sparse. | Compact scan-friendly admin row. | `.cbi-value` | padding, gap, min-height | force all rows to grid globally | system fields |
| Form label | Labels can float weakly. | Consistent label column hierarchy. | `.cbi-value-title` | color, font-weight, width | text rewrites | system fields |
| Form field area | Help text not always tied to field. | Field/help grouped visually. | `.cbi-value-field` | gap, color | form name/value changes | system fields |
| Text input | Some native residue. | Frosted field capsule. | `input[type=text]` etc. | background, border, radius, shadow | forced global width | system fields |
| Password input | Same as text. | Same field system. | `input[type=password]` | visual only | behavior/value changes | login/admin |
| Select | Native field mismatch. | Match text input shell; browser popup limits documented. | `select` | field visual, color-scheme | option lifecycle hacks | system dropdown |
| File input | Native upload patch. | Styled file selector button. | `input[type=file]::file-selector-button` | button visual | hiding file input | plugin upload |
| Textarea | Can look native in config editors. | Frosted editor field. | `textarea`, plugin editors | background, border, font, shadow | replacing editor DOM | MosDNS config |
| Checkbox/radio | Spacing can be sparse. | Compact aligned controls. | `input[type=checkbox]`, `input[type=radio]` | accent-color, margin | custom fake inputs | form fields |
| cbi-dropdown closed | Looks like glass wrapper around native. | Same family as fields. | `.cbi-dropdown` | background, border, radius, arrow color | forcing options visible | dropdown closed |
| cbi-dropdown open menu | Native popover residue. | Floating glass popover. | `.cbi-dropdown ul.dropdown`, `> li`, `.item`, `.create-item` | background, border, shadow, padding | display lifecycle hacks | dropdown open |
| cbi-dropdown option | Green active block risk. | Soft row state. | `ul.dropdown > li[selected]`, `:hover` | background, color | fake selection | dropdown open |
| cbi-dynlist existing item | Existing input/remove not proven styled. | Compound row with integrated remove affordance. | `.cbi-dynlist .item`, `.cbi-dynlist input`, `.cbi-button-remove` | background, border, margin, radius | hide/remove buttons | NTP dynlist |
| cbi-dynlist add row | Add row too mint/pill-like. | Same compound control language. | `.cbi-dynlist .add-item`, `.cbi-button-add` | visual only | add lifecycle changes | NTP dynlist |
| Page tabs | Active often green/mint. | Neutral luminous pill. | `.tabs`, `.cbi-tabmenu`, anchors | background, border, shadow | panel visibility | system tabs |
| Modal tabs | Rectangular strip residue. | Same tab language, smaller. | `.modal .tabs`, `.modal .cbi-tabmenu`, pseudos | reset background/border, anchor visual | content show/hide | modal tabs |
| Progress bar | Recolored native strip. | VitraWrt Meter. | `.cbi-progressbar`, `.progressbar`, `.progress`, `progress` | height, background, shadow | value manipulation | progress close-up |
| Apply dock | Pill-heavy and green. | Compact neutral floating island. | `.cbi-page-actions`, `#uci-apply` | background, gap, shadow, button role | force show | apply dock |
| Save/apply/reset buttons | Primary too mint. | Neutral primary, restrained danger. | `.cbi-button-save`, `.cbi-button-apply`, `.cbi-button-reset` | visual role tokens | submit behavior | apply dock/modal footer |
| Generic LuCI buttons | Raw blue/green in some plugins. | Neutral role system. | `.btn`, `.cbi-button`, `button` scoped to main/plugin | background, border, color | global forced width | plugin/action crops |
| Table header | Can look industrial. | Soft neutral header. | `th`, `.th` | background, color, padding | global table-layout | package/process/startup |
| Table row | Hover can use aqua wash. | Neutral row hover with subtle cyan edge. | `td`, row hover | background, separator | global nowrap | table pages |
| Table actions | Spacing can be off. | Natural compact action controls. | table `.btn`, `.cbi-button` | padding, gap, radius | shrinking unusably | package actions |
| Package controls | Buttons may stretch. | Natural compact actions. | `body.vwrt-page-packages ...` | page-scoped visual | table normalization | packages page |
| Process table | Must remain aligned. | Existing page-scoped layout preserved. | `body.vwrt-page-processes ...` | page-scoped width/alignment | global table layout | processes page |
| Startup table | Must remain aligned. | Existing page-scoped layout preserved. | `body.vwrt-page-startup ...` | page-scoped width/alignment | global action hacks | startup page |
| CPU limit dropdown | Needs open-menu audit. | Same dropdown system. | CPU page route if present plus `.cbi-dropdown` | visual only | fake state | CPU dropdown |
| Network edit modal | Modal internals still mixed. | Lighter glass sheet with unified tabs/fields/footer. | `.modal`, `.modal-body`, `.modal-footer` | background, border, shadow | close/tab behavior changes | modal full/tabs/fields |
| OpenClash controls/cards/buttons | Raw plugin blue/buttons remain. | Page-scoped neutral Apple/VisionOS skin. | `body.vwrt-page-openclash ...` | visual only | plugin JS/layout rewrite | OpenClash captures |
| MosDNS controls/cards/buttons | Plugin mismatch. | Page-scoped neutral skin. | `body.vwrt-page-mosdns ...` | visual only | plugin JS/layout rewrite | MosDNS captures |
| Loading/applying dialog | Must match modal material. | Lightweight glass dialog. | `.modal`, `.alert-message`, applying selectors | background, shadow | lifecycle/force show | applying dialog |
| Session timeout dialog | Must remain readable. | Same modal material. | `.modal`, `[role=dialog]` | visual only | close behavior | session dialog if possible |
| Login page | Must stay compact and balanced. | Neutral ice/graphite glass, no green primary. | `.vwrt-auth-card`, `.vwrt-auth-submit` | visual only | auth behavior | login light/dark |

## Safety Boundaries

- No fake clicks in theme code.
- No DOM move/wrap/rebuild.
- No forced tab/dropdown/modal/apply visibility.
- No global `table-layout: fixed`, global nowrap, or global table display conversion.
- Page-scoped plugin fixes must remain under route/body classes.
