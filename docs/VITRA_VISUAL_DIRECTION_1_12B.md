# VitraWrt Stage 1.12B Visual Direction

Stage 1.12B corrects the theme direction from a generic blue LuCI skin toward a restrained vitreous router console. This is still `luci-theme-vitrawrt`; it does not implement or replace a dashboard page.

## Why 1.12A Still Felt Generic

- Blue was used too broadly across active states, icons, buttons, progress bars, borders, and glows.
- Glass was mostly translucent color plus blur, without consistent surface, border, inner highlight, and shadow layers.
- Sidebar icons and controls existed, but default states were too visually similar and too blue-oriented.
- Native LuCI components still read as original LuCI widgets with new colors rather than a coherent Vitra material system.

## Visual Keywords

- vitreous
- frosted glass
- premium router console
- calm
- precise
- layered
- ice grey
- mist blue
- graphite text
- subtle violet diffusion
- restrained accent

Avoid cyberpunk, neon, gaming HUD, Web3 dashboard, pure SaaS dashboard styling, pure black dark mode, oversized toy-like radius, and heavy shadows.

## Color Ratio Rules

Light mode should read roughly as:

- 70 percent ice grey, pale blue grey, and frosted background
- 20 percent translucent glass surfaces
- 7 percent graphite text, neutral controls, muted borders
- 3 percent accent blue

Blue is allowed for active states, focus rings, primary actions, selected badges, progress fill, and small highlights. Blue is not a panel color, default icon color, default menu text color, table background, or default border color.

Dark mode uses deep graphite and dark navy surfaces. It must not become pure black or neon blue.

## Glass Material Tokens

1. `--vitra-glass-bg`: default readable translucent surface.
2. `--vitra-glass-bg-strong`: stronger elevated surface for dialogs and auth.
3. `--vitra-glass-bg-subtle`: quieter inner component surface.
4. `--vitra-glass-border`: soft hairline border.
5. `--vitra-glass-highlight`: top/inner highlight.
6. `--vitra-glass-shadow`: ambient material shadow.
7. `--vitra-glass-inner-shadow`: inset highlight and muted lower depth.
8. `--vitra-glass-blur`: restrained blur budget.

Glass must come from these layers, not from “more blue plus more blur”.

## Sidebar Rules

- Default icons and text are muted graphite/slate, not blue.
- Active items use a pale glass pill, accent icon/text, and a subtle left indicator.
- Hover uses surface elevation only; it must not change menu height.
- Collapsed sidebar must remain understandable through icon shape plus tooltip/aria-label.
- Bottom controls form a centered glass control dock.
- No menu auto-expand as a substitute for poor icon recognition.

## Progress Rules

- Track is a glass trough with subtle border and inner depth.
- Fill is restrained mist/ice accent gradient, not saturated neon.
- Text and original values remain visible.
- Theme CSS must not alter width/value computation or replace progress DOM.

## Tabs Rules

- Tabs are independent floating pills.
- Active state is a pale accent glass pill, not a solid blue layer on top of another pill.
- Theme CSS must not alter tab content display, hidden state, active class, or click behavior.
- First-load app/plugin tab issues are limitations unless fixed by the app or LuCI itself.

## Buttons And Apply Area

- Default buttons use neutral glass.
- Primary buttons use restrained accent blue only for high-value actions.
- Danger buttons use soft red, not large harsh red blocks.
- Apply area must appear only when LuCI shows it.
- When visible, action controls should read as a compact floating glass dock.

## Dropdown And Select

- Closed select/dropdown uses glass input styling.
- Open menu uses glass popover styling only if LuCI lifecycle remains native.
- No option exposure, display forcing, pointer event override, or JS lifecycle control.

## Modal And Dialog

- Dialogs use glass sheet visual treatment with subtle border, radius, and material shadow.
- Modal open/close, tabs, dropdowns, dynlists, and forms remain native.
- Do not apply transform/filter/perspective to shell ancestors because that can break fixed modal positioning.

## Dark Mode

- Deep graphite and navy base.
- Dark glass surfaces retain depth through borders and highlights.
- Text contrast remains clear.
- No global image filters; plugin charts stay untouched.

## Responsive Rules

- Desktop supports expanded and collapsed floating sidebar.
- Mobile uses drawer/topbar behavior.
- Sidebar controls must not overflow in collapsed mode.
- Modal and apply areas must remain usable on small screens.
- Do not force all buttons full width.

## Performance Limits

- Use backdrop blur sparingly.
- Avoid nested heavy blur stacks.
- Avoid continuous animation.
- Keep transitions short.
- Use tokenized shadows instead of many unique heavy shadows.

## LuCI Behavior Boundaries

The theme must not:

- simulate user clicks
- force show/hide tabs
- force show/hide apply areas
- manipulate modal/dropdown/dynlist/ifacebox lifecycle
- globally normalize tables
- hijack `/admin/status/overview`
- fetch ubus/rpcd/service data

## Known Limitations

- `Status -> Overview` remains native LuCI overview, not the VitraWrt dashboard.
- The future dashboard belongs in an independent `luci-app-vitrawrt-dashboard`.
- If a LuCI app or plugin has a first-load tab issue, this theme records the limitation instead of hiding it with fake interactions.
- Wide table fixes remain page-scoped and require Bootstrap/Argon metric comparison before expansion.
