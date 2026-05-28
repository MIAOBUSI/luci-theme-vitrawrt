# Stage 1.18 Visual Diagnosis

Primary target: ImmortalWrt 25.12-SNAPSHOT r37729-7758b644be with LuCI openwrt-25.12 branch 26.097.10429~0e6a6c8.

Visual target: `docs/previews/vitrawrt-preview-premium-v4.html`.

Reference inspected: `docs/reference/apple/cascade.css`.

## 1. What Stage 1.17 Got Wrong

Stage 1.17 preserved LuCI behavior and solved several dark-mode artifacts, but the result remained visually conservative. The main failure is direction, not safety: the theme still reads as native LuCI/Bootstrap panels with a pale glass treatment. It does not yet have the richer Apple-like palette, luminous material depth, or precise control rhythm shown in preview v4.

Observed 1.17 issues:

- Overall palette is still dull graphite/grey-blue, especially in dark mode.
- Main content panels still feel like LuCI slabs inside a translucent shell.
- Form fields and selects are safer than before, but still not consistently frosted capsules.
- Modal tabs and page tabs are closer, but the modal sheet still feels native in structure.
- Progress bars still look like recolored LuCI troughs rather than luminous glass meters.
- Sidebar expanded uses a better rail, but nested menu/background layers still compete visually.
- Sidebar collapsed is contained, but submenu icons and bottom controls do not yet feel like a designed icon rail.
- Process table is functional, but its compactness and semantic column widths can still be sharper.

## 2. Screenshot Evidence

Latest Stage 1.17 audit output inspected:

- `audit-output/visual-direction-1.17/20260525-235709/light-status-overview.png`
- `audit-output/visual-direction-1.17/20260525-235709/dark-processes.png`
- `audit-output/visual-direction-1.17/20260525-235709/light-network-edit-modal-open.png`
- `audit-output/visual-direction-1.17/20260525-235709/light-sidebar-collapsed.png`
- `audit-output/visual-direction-1.17/20260525-235709/light-sidebar-collapsed-tooltip.png`

The screenshots confirm that behavior is stable, but material quality is still too close to LuCI recoloring.

## 3. Palette and Material Problems

Stage 1.17 tokens introduced aqua/cyan/violet names, but they are too muted and often collapse back into grey-blue surfaces. The reference cascade succeeds because its dark base is not one flat navy; it combines deep graphite/navy with separate cyan/blue/violet atmospheric lights, translucent panels, and white inner highlights.

Stage 1.18 must therefore:

- Increase chromatic separation between base, panel, field, active, and glow tokens.
- Use aqua/cyan/mint as luminous active material instead of generic LuCI blue.
- Keep blue as restrained support, not the dominant accent.
- Prevent dark mode from becoming a flat industrial navy.
- Make light mode more ice/mist/aqua/violet and less pale grey-blue.

## 4. Layout and Scoping Problems

The safe global table visual skin is acceptable for color and separators, but table layout must stay page-scoped. Process/package/startup tables still need page-specific rules because Bootstrap/Argon comparison showed these are content-dependent operational tables, not generic table components.

Risky areas:

- Process table needs page-scoped semantic grid widths; PID/user compact, command flexible, CPU/memory compact, actions natural width.
- Package actions need page-scoped compact controls.
- Startup actions need page-scoped grouping.
- Network-share/wide plugin pages need page-scoped overflow containment only when necessary.

## 5. Page-Specific LuCI Exceptions

Allowed Stage 1.18 layout exceptions:

- `body.vwrt-page-processes`: process table semantic column grid.
- `body.vwrt-page-packages`: package action button compacting.
- `body.vwrt-page-startup`: startup priority/script/action column hints.
- `body.vwrt-page-network-share`: wide forms/table overflow containment.
- `body.vwrt-page-vnstat2`: existing tab image/spacing containment.

Bootstrap/Argon baseline requirement:

- `audit-output/theme-baseline/report.md` previously showed Bootstrap/Argon do not globally normalize process/package/startup tables; page-specific width behavior is normal. Therefore Stage 1.18 keeps table layout changes inside route classes only.

## 6. Unsafe Reference Cascade Patterns

The Apple reference contains useful visual language, but some rules are unsafe for LuCI:

- Global `.table`, `.tr`, `.td`, and table display/table-layout rewrites.
- Global control width/height rules that could break CBI widgets.
- Modal overlay lifecycle and positioning assumptions that do not map cleanly to LuCI 25.12.
- Saturated global primary/success/danger buttons, including green as a generic positive action.
- Any reference JS pattern that wraps tables, uses MutationObserver as layout transformer, simulates interactions, or controls dropdown/modal/tab lifecycle.

These are rejected.

## 7. Safe Reference Cascade Patterns to Adopt

Stage 1.18 adopts these ideas as tokens and visual skins:

- Deep graphite/navy base with separate cyan/aqua/violet atmospheric gradients.
- Glass panels with translucent surface, hairline border, inner highlight, and ambient shadow.
- Dark mode table rows from dark surface tokens only.
- Luminous aqua/cyan active states rather than saturated Bootstrap blue.
- Frosted field capsules with consistent border, radius, focus glow, and text contrast.
- Progress troughs with inner shadow and aqua/mint/cyan fill.
- Compact floating action/material controls.

## 8. Implementation Strategy

1. Create this diagnosis and the reference extraction document before CSS changes.
2. Rebuild Stage 1.18 token layer in `tokens.css`, `light.css`, and `dark.css`.
3. Add a final Stage 1.18 component landing layer in `luci-components-visual.css`.
4. Add a final Stage 1.18 sidebar landing layer in `sidebar.css`.
5. Refine only page-scoped layout fixes in `luci-layout-exceptions.css`.
6. Bump all resources to `v=1.18`.
7. Deploy to 10.10.10.148.
8. Run safety, runtime regression, and visual audit.
9. Inspect screenshots and iterate up to three repair loops.

## 9. Regression Risk List

- CBI dropdown options becoming visible before open.
- Dynlist add/remove controls hidden or misaligned.
- Modal close or modal tab behavior affected by overbroad modal styling.
- Apply dock forced visible or hidden.
- Ifacebox hover tooltip clipped by aggressive overflow rules.
- Process/package/startup tables over-constrained by global layout rules.
- Dark mode table rows inheriting light-mode surfaces.
- Sidebar collapsed controls overflowing because expanded layout leaks into icon rail.

## 10. Must Not Change

- No fake click or simulated interaction.
- No LuCI DOM wrapping/moving/rebuilding with JS.
- No MutationObserver layout transformer.
- No Status Overview dashboard hijack.
- No theme service data fetching.
- No global table normalization.
- No global `table-layout: fixed`.
- No global `white-space: nowrap`.
- No tab/dropdown/modal/dynlist/apply lifecycle control.
