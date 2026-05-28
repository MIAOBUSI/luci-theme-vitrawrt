# Stage 1.19V Dual Theme Token Spec

This stage defines one Apple / VisionOS material system with paired light and dark values. Component CSS must consume the same semantic tokens in both modes.

| Token | Light intent | Dark intent | Shared system reason |
|---|---|---|---|
| `--vw-bg-base` | ice white with mist cyan | deep graphite/navy | base luminance changes, spatial atmosphere remains |
| `--vw-bg-atmosphere` | pale cyan/violet diffusion | restrained cyan/violet haze | keeps ambient mood without flooding panels |
| `--vw-glass-panel` | translucent ice surface | translucent graphite glass | same panel material, different luminance |
| `--vw-glass-panel-strong` | brighter elevated sheet | lifted navy graphite sheet | used by modals/popovers in both modes |
| `--vw-glass-inner` | soft inner mist | dark inner material | gives nested areas depth without another card |
| `--vw-glass-highlight` | white edge light | low-opacity ice edge light | same top-sheen language |
| `--vw-glass-border` | faint graphite/cyan hairline | faint ice/cyan hairline | border is hairline, not an outline |
| `--vw-glass-border-strong` | slightly clearer edge | modal/popover edge | only for floating surfaces |
| `--vw-sidebar-bg` | calm rail glass | luminous dark rail glass | sidebar structure remains identical |
| `--vw-sidebar-active-bg` | mint/cyan active mist | aqua/cyan active haze | active is luminous, not blue block |
| `--vw-sidebar-hover-bg` | soft surface lift | soft edge lift | integrated row hover |
| `--vw-field-bg` | frosted input capsule | dark frosted input capsule | same field geometry |
| `--vw-field-bg-hover` | brighter material | lifted dark material | hover without layout change |
| `--vw-field-bg-focus` | ice/mint focus surface | cyan-ink focus surface | focus uses light, not saturation |
| `--vw-field-border` | subtle field hairline | subtle field hairline | prevents native input look |
| `--vw-dropdown-bg` | floating ice menu | floating graphite menu | open menu shares popover material |
| `--vw-dynlist-bg` | grouped frosted row | grouped dark frosted row | existing/add rows become one system |
| `--vw-table-head-bg` | mist header | lifted dark header | table readability without normalization |
| `--vw-table-row-bg` | translucent row | dark translucent row | no white dark-mode stripes |
| `--vw-table-row-alt-bg` | subtle alternate mist | subtle alternate graphite | keeps scanning soft |
| `--vw-modal-bg` | elevated ice glass sheet | elevated spatial glass sheet | same modal sheet, different luminance |
| `--vw-apply-dock-bg` | compact floating ice dock | compact dark glass dock | same action island |
| `--vw-button-bg` | neutral glass control | neutral dark glass control | default buttons do not dominate |
| `--vw-button-primary-bg` | mint/aqua-tinted material | aqua/mint luminous material | primary is refined, not Bootstrap blue |
| `--vw-button-danger-bg` | soft rose material | dark rose material | destructive but calm |
| `--vw-progress-track` | glass trough | dark glass trough | same rounded trough |
| `--vw-progress-fill` | luminous aqua/mint fill | luminous aqua/mint fill | restrained color as material light |
| `--vw-focus-ring` | soft cyan aura | soft cyan aura | visible keyboard focus |
| `--vw-text-strong` | graphite | ice text | hierarchy preserved |
| `--vw-text-main` | graphite/slate | near-ice slate | readable body text |
| `--vw-text-soft` | muted slate | muted ice slate | labels/help text |
| `--vw-text-muted` | secondary grey | secondary blue-grey | soft metadata |
| `--vw-separator` | faint graphite line | faint ice line | table/form separators |
| `--vw-shadow-soft` | gentle ambient shadow | lower but deeper shadow | depth without heaviness |
| `--vw-shadow-floating` | popover depth | popover depth | used sparingly |
| `--vw-highlight-inner` | inset light line | inset ice line | material continuity |

## Geometry Tokens

- `--vw-radius-field`: fields, selects, cbi-dropdown closed.
- `--vw-radius-control`: buttons and control chips.
- `--vw-radius-card`: mini cards, ifacebox.
- `--vw-radius-panel`: CBI map/section panels.
- `--vw-radius-modal`: modal sheets.
- `--vw-field-height`, `--vw-button-height`, `--vw-tab-height`: shared control rhythm.

## Accent Boundary

Aqua/cyan/mint is allowed for active, focus, primary action, progress fill, and selected tabs. It must not become the dominant background for large panels, tables, or every icon.
