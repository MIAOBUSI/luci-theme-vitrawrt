# VitraWrt Theme Visual Rules

## 1. Design Language

VitraWrt / 璃境 is a restrained Liquid Glass router administration theme:

- Apple Liquid Glass / VisionOS / macOS inspired, but not decorative.
- UniFi-style professional router console: quiet, precise, data-first.
- Low-saturation ice blue, graphite, and soft violet accents.
- Clear information hierarchy for repetitive admin work.
- Not cyberpunk, not gaming HUD, not Web3 neon, not starry sci-fi.
- Never make native LuCI pages look like a fake dashboard.

## 2. Color System

Use semantic tokens rather than scattered hard-coded colors.

### Light

- Background: ice white, light blue-gray, white.
- Surface: translucent white glass, stronger white panel, subtle blue tint.
- Text: graphite primary, blue-gray muted, soft secondary.
- Border: low-opacity graphite/blue-gray.
- Accent: titanium/ice blue.
- Warning: amber glass.
- Danger: soft red.
- Success: calm green only for status, never the primary login/action color.

### Dark

- Background: `#07111f`, `#0b1220`, `#111827` family.
- Surface: graphite/navy translucent panels.
- Text: pale blue-white primary, blue-gray muted.
- Border: low-brightness blue-gray.
- Accent: readable blue, no neon glow.
- Alerts: subdued warning/danger surfaces with readable text.

## 3. Spacing

- Admin pages should stay dense but breathable.
- Sidebar gap: 24px desktop target.
- Panel spacing: 18-24px.
- Section padding: 16-22px, not oversized marketing cards.
- Form rows should preserve native LuCI rhythm; do not force global grid/flex.

## 4. Radius

- Small controls: 10-14px.
- Inputs/buttons: 14-999px depending shape.
- Panels: 20-24px.
- Sidebar: 28-30px.
- Modals: 20-24px.

## 5. Shadow

- Use soft depth, not glowing neon.
- Sidebar can have the strongest shadow.
- Panels get subtle multi-layer shadows.
- Buttons use small inset highlight and light elevation.

## 6. Blur

- Backdrop blur is allowed on sidebar, popovers, and panels.
- Keep blur moderate for router hardware and browser performance.
- Provide visual fallback through opaque/semi-opaque surfaces.
- Avoid nested heavy blur on every child.

## 7. Typography

- Use system UI fonts.
- No remote fonts.
- Headings are clear, compact, and task-oriented.
- Table text remains readable at admin density.
- Do not use huge hero typography inside LuCI pages.

## 8. Icons

- Local SVG only.
- Stroke style: linear, 1.6-1.8px, round caps/joins.
- Sidebar icons: 18-21px.
- Active icon uses accent; inactive icon uses muted graphite/blue-gray.
- Collapsed sidebar must remain understandable without text.

## 9. Motion

- Short transitions: 120-180ms.
- Use transform/opacity only on VitraWrt-owned shell elements when safe.
- Respect `prefers-reduced-motion`.
- Do not animate LuCI lifecycle components in a way that changes state timing.

## 10. Accessibility

- Visible focus states everywhere.
- Color contrast must remain readable in light and dark.
- Icon-only controls require labels.
- Touch targets should be at least 40px where practical.
- Do not hide native errors, validation text, or help text.

## 11. Router Admin Readability

- Data pages must remain scannable.
- Tables should not become decorative cards at the expense of columns.
- Logs and code should preserve monospaced readability.
- Dangerous actions must remain clear.
- Status colors should be subtle but unambiguous.

## 12. Performance Limits

- Avoid heavy global filters, transforms, and fixed overlays.
- Do not apply large blur to many nested panels.
- Do not use remote assets.
- Prefer CSS variables and simple gradients.
- Keep image/SVG assets small.
- Low-power routers and old clients must get stable fallback visuals.

## 13. Behavioral Guardrails

- Do not repair LuCI behavior by simulating user clicks.
- Do not globally normalize tables.
- Do not change `display`, `hidden`, `aria-selected`, or lifecycle state for tabs/dropdowns/dynlists/modals/apply/ifacebox.
- Do not move, wrap, or replace LuCI dynamic DOM.
- If a LuCI app has first-load behavior issues, document the root cause and limitation.

