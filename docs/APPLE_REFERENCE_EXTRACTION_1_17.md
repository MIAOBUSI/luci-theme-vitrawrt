# Apple Reference Extraction 1.17

Stage 1.17 uses the Apple-style reference files as visual research, not as implementation authority. VitraWrt remains `luci-theme-vitrawrt` for ImmortalWrt 25.12 / LuCI openwrt-25.12, and Status -> Overview remains the native LuCI overview page.

## Inspected References

- `docs/previews/vitrawrt-preview-premium-v4.html`
- `docs/reference/apple/cascade.css`
- `docs/reference/apple/menu-apple.js`
- `docs/reference/apple/theme-apple.js`
- Current VitraWrt Stage 1.16 CSS and audit screenshots.

## Safe Visual Ideas To Extract

- Layered glass surfaces: translucent base, hairline border, inner highlight, ambient shadow.
- Preview v4 spacing rhythm: compact router-console density with clear section gaps.
- Sidebar management rail hierarchy: restrained brand block, status capsule, section label, active pill, child guide line.
- Independent pill tabs with low-saturation selected state.
- Unified field material for input, native select, textarea, cbi-dropdown closed state and dynlist fields.
- Compact floating apply dock with cohesive buttons instead of a page-wide footer strip.
- Progress bars as material troughs with aqua/cyan fill and readable original text.
- Modal sheet treatment: glass panel, clear header/body/footer layers, matching tabs and fields.
- Light/dark palette balance: ice white / mist grey / aqua / cyan / violet / graphite, with blue limited to accent states.

## Unsafe Ideas Rejected

- `menu-apple.js` re-renders menu DOM through LuCI `ui.menu.load()`. VitraWrt already owns its sidebar renderer and must not copy Apple menu behavior.
- MutationObserver decoration of `#maincontent`, `.cbi-section`, `.cbi-dropdown`, progress bars and tables is rejected. It can alter LuCI lifecycle and create race regressions.
- JS wrapping tables in `.apple-table-scroll`, inserting colgroups, moving nodes, and setting inline `table-layout: fixed` is rejected.
- JS cleanup/rewrite of `.cbi-dropdown` preview/open state is rejected because it risks dropdown lifecycle regressions.
- JS restructuring ifacebox/network status cards is rejected because native tooltip behavior must remain untouched.
- Global table display/nowrap/column normalization is rejected. Page-specific layouts stay in `luci-layout-exceptions.css`.
- The reference's darker, stronger blue Apple accent is not copied directly; VitraWrt uses restrained aqua/cyan material accents.
- Full-page topbar/menu architecture from the Apple reference is rejected because VitraWrt is a floating sidebar LuCI theme.

## CSS Patterns Rejected

- Global `table-layout: fixed`.
- Global `white-space: nowrap`.
- Global table/tr/td display rewrites.
- Modal lifecycle overrides using forced display/position/z-index changes.
- Dropdown forced display/hidden/visibility/pointer-events changes.
- Body/main transforms, filters or perspective that could break fixed modal positioning.
- Heavy nested backdrop filters on every row or table cell.

## VitraWrt Replacement Strategy

- Keep LuCI DOM native and style existing selectors with CSS only.
- Use final-stage token aliases such as `--vw-glass-panel`, `--vw-field-bg`, `--vw-tab-bg`, `--vw-modal-bg`, `--vw-progress-fill-*`.
- Strengthen materials by layering gradients, border highlights and shadows, not by adding more saturated blue.
- Use scoped CSS for modal `.cbi-dropdown` and native selects to remove remaining white system artifacts without changing open/close behavior.
- Keep process/package/startup/network-share layout fixes page-scoped and documented.
- Prefer visual density suitable for router administration over decorative dashboard cards.

## Major Deviations From Apple Reference

| Reference pattern | Why it is unsuitable | VitraWrt replacement | Why better |
|---|---|---|---|
| JS table wrapping and colgroup insertion | Moves LuCI DOM and can break third-party apps | CSS-only table skin plus page-scoped exceptions | Preserves LuCI lifecycle and density |
| MutationObserver component decoration | Racy and can expose dropdown/tab/apply state | Static selectors and audit scripts only | Predictable and testable |
| Strong Apple blue as broad active color | Makes VitraWrt look like generic blue skin | Low-saturation aqua/cyan/violet accents | More premium and less saturated |
| Menu replacement from Apple reference | Changes route/menu behavior | Existing VitraWrt sidebar with stronger visual rail | Keeps theme architecture stable |
| Progress DOM reconstruction | Could lose LuCI values | CSS glass trough/fill preserving native width/text | Safer and still visually distinct |
| Interface card DOM rewrite | Breaks native ifacebox tooltip risk | CSS-only ifacebox mini-card material | Keeps hover tooltip native |

## Apple-Like But LuCI-Safe

VitraWrt keeps the Apple/VisionOS direction by using material depth, inner highlights, mist backgrounds, compact spacing and refined controls. It remains LuCI-safe by refusing fake clicks, refusing DOM wrappers, refusing global table normalization, and validating every change on `10.10.10.148`.

## Known Limits

- Some third-party widgets with inline markup will retain native structure.
- VitraWrt will not repair app first-load tab issues with fake interactions.
- Status -> Overview remains the native overview page; Dashboard is a future independent app.

## Implemented In Stage 1.17

- Rebuilt the final token bridge so new `--vw-*`, old `--vwrt-*`, and `--vitra-*` variables share one sidebar width, glass material, field, button, table, progress, and modal vocabulary.
- Added a richer ice/aqua/violet light palette and deep graphite/navy dark palette. Accent blue remains restrained and is no longer the default icon/button language.
- Reworked the page shell, login sheet, sidebar rail, CBI panels, form rows, field system, tabs, buttons, apply dock, progress bars, ifacebox visual skin, dropdown popover surface, and modal sheet using CSS-only visual styling.
- Preserved the existing VitraWrt sidebar/menu JS behavior. No Apple reference click simulation, MutationObserver layout transformer, DOM wrapping, or LuCI component lifecycle override was copied.
- Kept process/package/startup/network-share/vnStat2 layout handling page-scoped. The process table grid was refined because PID, Owner, Command, CPU, Memory, and Actions have fixed operational meaning and were misaligned in prior screenshots.
- Added a scoped ifacebox tooltip visual correction that only affects hover/focus-visible tooltip opacity and material styling; it does not change display, visibility, pointer events, or tooltip lifecycle.

## Stage 1.17 Deviations After Implementation

| Reference pattern | Stage 1.17 decision | Reason |
|---|---|---|
| Apple reference uses JS to decorate live LuCI tables/cards | Rejected | It would move/wrap LuCI DOM and violate 25.12 lifecycle safety |
| Apple reference makes many native widgets into custom containers | Rejected | VitraWrt must remain a LuCI theme, not a dashboard/app shell |
| Reference-style saturated primary controls | Replaced with graphite/aqua glass controls | Keeps premium feel while avoiding generic blue OpenWrt skin |
| Fully custom network mini-card DOM | Replaced with CSS-only ifacebox material | Keeps native hover tooltip and OpenWrt plugin compatibility |
| Heavy global glass effects | Replaced with tokenized panel/sidebar/modal glass only | Better for embedded router hardware and fixed modal safety |
