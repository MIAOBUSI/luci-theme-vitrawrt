# Stage 1.20R Component Internals Target

This stage styles component internals before adding more wrapper glass. All selectors are visual-only and must preserve LuCI lifecycle ownership.

| Component | Evidence target | Selectors | Visual target | Allowed CSS | Forbidden CSS |
|---|---|---|---|---|---|
| Text/select/textarea/file fields | system fields, modal fields, plugin upload | `input`, `select`, `textarea`, `input[type="file"]`, modal equivalents | one frosted field family, no native white patch | color, background, border, radius, shadow, padding, font, focus ring | forced global width, value/name/id changes |
| cbi-dropdown closed | dropdown closed crop | `.cbi-dropdown`, `.cbi-dropdown [data-value]`, `.more` | same field material as input/select | background, border, radius, color, shadow, padding | display, visibility, pointer-events, open/close state manipulation |
| cbi-dropdown open | dropdown open crop | `.cbi-dropdown ul.dropdown`, `li`, `.create-item`, input | glass popover/options, no LuCI strip | background, border, radius, shadow, color, font | forced option exposure, z-index/position overrides unless existing LuCI requires it |
| Dynlist existing item | dynlist existing crop | `.cbi-dynlist`, `.cbi-dynlist-item`, `.item`, input, `.cbi-button-remove` | compound control; input and remove belong together | background, border, radius, shadow, padding, color | node wrapping, delete button hiding, add/remove lifecycle |
| Dynlist add row | dynlist add crop | `.cbi-dynlist input`, `.cbi-button-add`, `.add-item` | same geometry as existing row | background, border, radius, padding, focus | full-width forcing, display lifecycle |
| Page/modal/plugin tabs | system tabs, modal tab hover, plugin tabs | `.tabs`, `.cbi-tabmenu`, `.cbi-tab`, `.cbi-tab-disabled`, modal/plugin variants | one soft Liquid Glass chip system | background, border, radius, shadow, color, padding | display/hidden/aria-selected manipulation |
| Apply dock/buttons | apply dock crop | `.cbi-page-actions`, `#uci-apply`, `.cbi-button-save`, `.cbi-button-apply`, `.cbi-button-reset` | compact island, natural-width controls | background, border, radius, shadow, padding, gap if safe | forced display/hide, submit behavior |
| Progress | overview progress close-up | `.cbi-progressbar`, `.progress`, `progress`, inner div | soft trough, luminous fill, readable value | background, border, radius, shadow, color, height within safety range | width/value recalculation, JS redraw |
| Modal sheet/footer | network edit modal crops | `.modal`, `.modal-content`, `.modal-body`, `.modal-footer`, `[role="dialog"]` | lighter Liquid Glass sheet, not blue slab | background, border, radius, shadow, padding, color | lifecycle, close behavior, fixed-position ancestor transforms |
| Ifacebox/network card | overview status/network crop | `.ifacebox`, `.ifacebadge`, `.network-status-table`, `.cbi-tooltip` | compact material card, native tooltip retained | background, border, radius, shadow, color | hover lifecycle, width forcing, pointer-events |
| Tables/actions | packages/processes/startup close-ups | page-scoped table selectors, action buttons | refined rows without normalization | background, color, border, padding, page-scoped layout hints | global table-layout fixed, global nowrap, global display conversion |

## Hook Policy

No LuCI UI prototype hook is planned for 1.20R. CSS and existing body/page classes are sufficient for the target fixes. If a component cannot be targeted safely, it is documented as a limitation instead of adding runtime hooks.
