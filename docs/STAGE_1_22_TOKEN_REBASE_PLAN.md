# Stage 1.22 Token Rebase Plan

Goal: make `--vw-*` the canonical token namespace and keep `--vitra-*` / `--vwrt-*` as compatibility aliases only.

## Canonical Roles

| Role | Token | Light intent | Dark intent |
|---|---|---|---|
| page background | `--vw-bg-base`, `--vw-bg-atmosphere` | ice/mist/silver with low cyan/violet diffusion | graphite/navy with low cyan/violet diffusion |
| material base | `--vw-material-base` | translucent white glass | translucent graphite glass |
| material elevated | `--vw-material-elevated` | clearer raised glass | slightly brighter graphite sheet |
| material inset | `--vw-material-inset` | mist inset field/table layer | deep inset graphite layer |
| hairline | `--vw-border-hairline`, `--vw-border-soft` | low alpha graphite separator | low alpha ice separator |
| text | `--vw-text-main`, `--vw-text-soft`, `--vw-text-muted` | graphite hierarchy | ice/slate hierarchy |
| calm accent | `--vw-accent-calm` | desaturated blue-cyan | luminous desaturated cyan |
| atmosphere | `--vw-accent-atmosphere` | cyan/violet mesh only | cyan/violet mesh only |
| focus | `--vw-focus-ring-color`, `--vw-focus-ring` | low alpha cyan ring | low alpha cyan ring |
| success | `--vw-success` | semantic green only | semantic green only |
| warning | `--vw-warning` | warm amber | warm amber |
| danger | `--vw-danger` | restrained rose | restrained rose |
| primary action | `--vw-primary-action`, `--vw-primary-action-text` | neutral graphite/cyan-tinted material | raised graphite/cyan-tinted material |
| progress | `--vw-progress-track`, `--vw-progress-fill`, `--vw-progress-highlight`, `--vw-progress-shadow` | independent meter role | independent meter role |
| tabs | `--vw-tab-active-bg`, `--vw-tab-inactive-bg` | neutral glass pills | neutral graphite glass pills |
| fields | `--vw-field-bg`, `--vw-field-border` | frosted field | graphite frosted field |
| dropdown | `--vw-dropdown-bg` | popover glass | dark popover glass |
| dynlist | `--vw-dynlist-bg` | compound field group | compound field group |
| modal | `--vw-modal-bg` | translucent sheet | luminous graphite sheet |
| sidebar | `--vw-sidebar-bg`, `--vw-sidebar-row-hover`, `--vw-sidebar-row-active` | one quiet rail, row owns state | same geometry, darker luminance |

## Hard Separation

Green/mint must not be used for:

- primary buttons
- active tabs
- ordinary fields
- ordinary panels
- table headers
- global background tint

`--vw-success` remains available for online/positive state. `--vw-progress-fill` is not an alias for success.

## Alias Policy

New component CSS must use `--vw-*` tokens. Legacy aliases are retained only for older files and LuCI compatibility:

- `--vitra-*` maps to final `--vw-*` roles.
- `--vwrt-*` maps to final `--vw-*` roles.
- New Stage 1.22 rules must not introduce fresh `--vitra-*` or `--vwrt-*` dependencies.

## Implementation Plan

1. Add a final Stage 1.22 geometry and role layer in `tokens.css`.
2. Add final light and dark authority blocks in `light.css` and `dark.css`.
3. Move component CSS to canonical roles:
   - buttons use `--vw-primary-action`, not `--vw-success`.
   - tabs use `--vw-tab-active-bg`.
   - progress uses `--vw-progress-*`.
   - sidebar uses `--vw-sidebar-*`.
4. Keep existing historical blocks intact for package compatibility, but override them through the final authority layer.
5. Update `check-css-safety.mjs` to warn on newly added direct `--vitra-*` / `--vwrt-*` usage outside alias files.

