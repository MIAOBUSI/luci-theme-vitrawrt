# Stage 1.19V Apple / VisionOS Direction

Stage 1.18 moved VitraWrt toward a stronger glass look, but it drifted into a heavy industrial dark console. The UI became darker, more bordered, and more nested than the original VitraWrt / 璃境 direction. It was safer than early stages, but too much of the identity came from thick outlines, large rounded panels, dense dark slabs, and cyan progress glow instead of Apple-like light through material.

## Why 1.18 Drifted

- The dark theme became the visual baseline and the light theme was mostly a pale counterpart.
- Main panels used multiple radial gradients, borders, and shadows at every nested level, creating stacked glass boxes.
- Sidebar active and hover states used separate row, link, chevron, and child backgrounds, which made the rail feel mechanically layered.
- Forms were wrapped in designed rows, but many internal controls still kept native or square LuCI behavior.
- Progress bars gained color, but the track/fill still read as an upgraded admin progress bar rather than a soft VisionOS material control.
- Modals used glass sheets, but modal tabs, cbi-dropdown, dynlist, and ifacebox internals still exposed native LuCI fragments.
- Dark tables were stable but still felt like engineering tables with thick row bands.

## What Apple / VisionOS Means Here

For a LuCI theme, Apple / VisionOS does not mean replacing router pages with dashboard cards. It means:

- Soft luminous surfaces instead of heavy boxes.
- Light-through-material depth from translucent surface, edge highlight, and soft shadow.
- One component geometry shared by light and dark modes.
- Breathing room around controls without wasting operational density.
- Muted graphite/slate text with restrained aqua/cyan/mint/violet atmosphere.
- Fewer accents used more deliberately.
- Router-admin clarity preserved: tables, forms, logs, and plugin pages stay recognizable.

## Reduce

- Thick borders and hard outlines.
- Nested glass panels inside glass panels.
- Grey-blue industrial tone.
- Large dark slabs.
- Saturated blue buttons.
- Heavy shadows on every component.
- Sidebar split hover where text and chevron look detached.
- Native white/dark patches inside dynlist, dropdown, modal, and file inputs.

## Strengthen

- Shared dual-theme token system.
- Unified field/control material.
- Page and modal tab consistency.
- Complete dynlist/dropdown internals styling.
- Softer progress troughs with subtle aqua/mint fill.
- Sidebar as a calm management rail, not a stack of panels.
- Light mode as a first-class ice-glass theme.
- Dark mode as luminous spatial glass, not industrial navy.

## Dual Theme Principle

Light and dark modes share geometry, spacing, radius, hierarchy, and component rules. They differ only in luminance, contrast, shadow intensity, highlight opacity, and atmosphere. A tab, field, modal, progress bar, or sidebar item must feel like the same component in both modes.

## LuCI Boundary

VitraWrt remains a LuCI theme. It must not:

- Rewrite Status -> Overview into a dashboard.
- Repair first-load behavior with simulated clicks.
- Force tab/apply/dropdown/modal lifecycle.
- Globally normalize tables.
- Move or wrap LuCI DOM with JS.

When a visual target conflicts with LuCI behavior, the theme keeps behavior correct and documents the limitation.
