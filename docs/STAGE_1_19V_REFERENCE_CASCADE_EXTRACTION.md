# Stage 1.19V Reference Cascade Extraction

Reference file inspected: `docs/reference/apple/cascade.css`.

The file is a visual sample, not implementation source. Stage 1.19V extracts palette and material principles while rejecting unsafe global layout behavior.

| Reference pattern | Purpose | Adopt / Adapt / Reject | VitraWrt equivalent |
|---|---|---|---|
| dark base with blue/violet radials | spatial atmosphere | Adapt | paired `--vw-bg-atmosphere` and mode-specific mesh tokens |
| translucent surface + inset highlight | glass material | Adopt | `--vw-glass-panel`, `--vw-glass-highlight`, `--vw-highlight-inner` |
| soft table shell shadow | depth for data surfaces | Adapt | lighter table header/row tokens, no global layout |
| Apple primary blue | action emphasis | Adapt | aqua/mint/cyan accent, less saturated than Bootstrap blue |
| compact radius scale | modern controls | Adopt | `--vw-radius-field/control/card/panel/modal` |
| button glass material | premium controls | Adapt | tokenized default/primary/destructive buttons |
| field capsule material | unified inputs | Adopt | input/select/textarea/file/cbi-dropdown field system |
| modal glass sheet | overlay hierarchy | Adopt | modal visual styling only, no lifecycle changes |
| progress color glow | progress material | Adapt | soft aqua/mint fill, no neon and no JS redraw |
| global `box-sizing` | safe reset | Reject in loaded theme | Bootstrap/LuCI already owns broad reset |
| global table display/width/layout | visual consistency | Reject | page-scoped process/package/startup exceptions only |
| global input/select widths | tidy forms | Reject | natural LuCI field widths preserved |
| forced hidden/display tab rules | tab repair | Reject | LuCI owns tab lifecycle |
| dropdown/modal lifecycle assumptions | consistency | Reject | visual-only menu/sheet skin |
| JS DOM/mutation behavior from reference-like themes | layout repair | Reject | VitraWrt JS only marks shell/page state |

## Safer VitraWrt Replacement

Stage 1.19V implements the reference atmosphere through semantic tokens, then applies scoped visual skins to LuCI native structures. Unsafe reference ideas are translated into:

- component skins instead of DOM rewrites;
- light/dark paired tokens instead of dark-only palette;
- page-scoped table fixes instead of global table normalization;
- complete internal control styling for dropdown/dynlist/modal without touching lifecycle;
- reduced visual weight to avoid industrial dashboard drift.
