# Stage 1.20R Light/Dark Parity Plan

Light and dark mode must be one product, not two skins.

## Shared Geometry

- Same sidebar width/collapsed rail.
- Same tab height and radius.
- Same field height/radius.
- Same modal radius.
- Same apply dock compact geometry.
- Same progress trough height.

## Light Mode Intent

- Ice glass base, mist-blue surface, soft cyan/mint/violet atmosphere.
- Text remains graphite and readable.
- Borders are low-alpha hairlines.
- Panels should not become plain white cards.
- Inputs/selects/dropdowns/file controls must not look browser-native.

## Dark Mode Intent

- Graphite/navy depth with visible light-through-material.
- Less blue-black slab, less thick outline.
- Aqua/mint/violet appears as luminous edge/atmosphere, not neon.
- No white native fields, dropdowns, dynlist items, modal bodies, or table rows.

## Paired Token Groups

- `--vw-liquid-bg`, `--vw-liquid-atmosphere`
- `--vw-liquid-panel`, `--vw-liquid-panel-soft`, `--vw-liquid-panel-raised`
- `--vw-liquid-field`, `--vw-liquid-field-hover`, `--vw-liquid-field-focus`
- `--vw-liquid-control`, `--vw-liquid-control-hover`, `--vw-liquid-control-active`
- `--vw-liquid-border`, `--vw-liquid-border-soft`, `--vw-liquid-highlight`
- `--vw-liquid-shadow-panel`, `--vw-liquid-shadow-floating`, `--vw-liquid-shadow-modal`
- `--vw-liquid-progress-track`, `--vw-liquid-progress-fill-a/b/c`

## Parity Audit

Every changed component needs light and dark screenshots. If one mode looks native or industrial while the other looks refined, the defect remains `partially fixed`.
