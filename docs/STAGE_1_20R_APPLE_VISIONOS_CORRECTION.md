# Stage 1.20R Apple/VisionOS Correction

Stage 1.19V improved stability but still felt like LuCI inside a heavy glass shell. Stage 1.20R corrects the visual direction by reducing weight instead of adding more decoration.

## What Must Decrease

- Grey-blue dark slabs: reduce navy fill opacity and make dark mode graphite/luminous rather than industrial.
- Thick borders: convert most borders to hairline/highlight tokens.
- Nested card feeling: sidebar rows, child rows, tabs, and controls should not each become independent glass cards.
- Capsule stacking: buttons/tabs stay rounded but not bloated.
- Heavy shadows: use ambient depth and inner highlight instead of large black shadows.

## What Must Increase

- Soft spatial light: cyan/mint/violet as atmosphere, not paint.
- Unified field/control internals: inputs, selects, dropdowns, dynlists, file inputs, and modal fields share one material.
- Clear hierarchy: page background, rail, panel, field, control, and selected state use different weight.
- Light/dark parity: same geometry and component model; only luminance, shadow intensity, and atmosphere differ.

## Reference Cascade Extraction

`docs/reference/apple/cascade.css` is useful for:

- radial background atmosphere
- translucent surfaces with inner highlight
- low-alpha borders
- compact Apple-style control geometry
- table shell continuity

It is not copied directly because it contains generic app-shell assumptions and global layout patterns unsuitable for LuCI CBI, plugin tables, dropdowns, and modals.

## Selector Strategy

- `tokens.css`, `light.css`, `dark.css`: canonical 1.20R token overrides.
- `sidebar.css`: remove split hover and reduce nested rail layers.
- `luci-components-visual.css`: internals for fields, dropdowns, dynlists, tabs, apply dock, progress, modal, ifacebox.
- `luci-layout-exceptions.css`: page-scoped fixes only for process/package/startup/vnStat2/network-share/plugin layout issues.

## Visual Rejection Rules

A change is rejected if screenshots still show a separate chevron pill, native dynlist/remove buttons, native dropdown popover, old modal tab strip, dark white patches, or heavy blue-black slab panels.
