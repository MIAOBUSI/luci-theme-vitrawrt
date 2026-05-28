# VitraWrt Stage 1.13 Visual Direction

Primary target: ImmortalWrt 25.12-SNAPSHOT r37729-7758b644be with LuCI openwrt-25.12 branch 26.097.10429~0e6a6c8. OpenWrt 23.05/24.10 IPK and 25.x/SNAPSHOT APK compatibility remains preserved.

## Visual Target

`docs/previews/vitrawrt-preview-premium-v4.html` is the visual reference. It is not copied into LuCI pages. The live theme maps native LuCI structures to VitraWrt components and applies safe CSS skins only.

## Design Thesis

VitraWrt should feel like a premium router console: frosted, precise, low saturation, dense enough for operations, and calmer than a generic blue OpenWrt skin.

## Color System

Stage 1.13 introduces canonical `--vw-*` tokens:

- Background: `--vw-bg`, `--vw-bg-mesh-1`, `--vw-bg-mesh-2`
- Surfaces: `--vw-surface`, `--vw-surface-strong`, `--vw-surface-soft`, `--vw-surface-inner`
- Lines: `--vw-border`, `--vw-border-strong`, `--vw-highlight`
- Text: `--vw-text`, `--vw-text-soft`, `--vw-muted`
- Accent/status: `--vw-accent`, `--vw-accent-soft`, `--vw-accent-ink`, `--vw-success`, `--vw-danger`, `--vw-warning`

Blue is limited to active states, focus rings, restrained primary actions, selected states, and progress fill. Default icons, text, cards, table surfaces, and routine buttons use graphite/slate and frosted materials.

## Material System

Glass is built from:

- readable translucent base
- soft hairline border
- top/inner highlight
- ambient shadow
- low-saturation background diffusion

The theme avoids the shortcut of “blur plus blue”. Backdrop blur is limited to sidebar, dropdown popovers, modal sheets, and small floating controls.

## Component Refactor

- Main panels: `.cbi-map`, `.cbi-section`, and `fieldset` become VitraWrt glass panels.
- Form rows: `.cbi-value`, `.cbi-value-title`, `.cbi-value-field` receive rhythm and hierarchy without layout takeover.
- Fields: text input, select, textarea, and `.cbi-dropdown` share one glass field language.
- Buttons: neutral glass by default; save/apply uses restrained material primary, not saturated blue or green.
- Apply dock: fit-content floating glass action dock. LuCI still decides when it appears.
- Tabs: independent floating pills. No tab lifecycle changes.
- Progress: glass trough and restrained fill. Original LuCI values and widths remain untouched.
- Ifacebox/network: outer visual skin only; hover and sizing remain native.
- Modal/loading/session: glass-sheet visuals without lifecycle changes.

## Sidebar

The sidebar is treated as a premium management rail. Default icons are muted graphite/slate, not blue. Active state is a pale glass pill with restrained accent. Collapsed controls remain aligned and labelled through existing VitraWrt-owned tooltip/aria data.

## Safety Boundaries

- No fake click, `dispatchEvent`, or `MouseEvent`.
- No JS wrapping/moving LuCI DOM.
- No global table normalization.
- No lifecycle control for tabs, dropdowns, dynlists, modals, apply area, ifacebox, or progressbars.
- Page-scoped table fixes require Bootstrap/Argon metric comparison.

## Known Limitations

VitraWrt does not hide app/plugin first-load tab issues with simulated interactions. If vnStat2 or `/admin/network` expose first-load tab content due to app-level timing, it remains documented rather than masked by the theme.

