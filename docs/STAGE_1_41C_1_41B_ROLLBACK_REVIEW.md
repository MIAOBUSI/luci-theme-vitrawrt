# Stage 1.41C / 1.41B Rollback Review

## 1. Maintained 1.41B Cleanups
We successfully preserved the underlying structural and repository hygiene from Stage 1.41B:
- **No deprecated CSS re-imports**: `luci-visual.css`, `final-fix.css`, etc. remain excluded.
- **Destructive JS removal**: All `innerHTML` wipes, synthetic `.click()` invocations, and destructive DOM clones remain deleted from `boot.js`.
- **Closed Dropdown Artifact Fixes**: The `li[display="0"]` background color pollution correctly remains neutral.
- **Dropdown Chevrons**: Pure CSS SVG chevron injection on `.cbi-dropdown` and `select` successfully retained.

## 2. Erroneous 1.41B Rollbacks (Overly Conservative)
Due to the strictness of the 1.41B safety script versions, several layout elements visually regressed:
- **Tab Dock Structure**: Banning `inline-flex` forced `.cbi-tabmenu` elements to stretch full-width rather than tightly wrapping the navigation items (Apple Dock style).
- **Dynlist Compound Layout**: Banning `flex` layout inside `.cbi-dynlist` input rows caused the add-input box and the green Add button to misalign vertically.
- **Semantic Button Roles**: Strict contrast and dimension assertions led to overriding action/success/danger `.cbi-button` classes with generic primary blue backgrounds on hover/active states, eliminating semantic context.

## 3. Recovery Strategy in 1.41C
- Recover Tab Dock with bounded `display: inline-flex` safely.
- Recover `.cbi-dynlist` inputs row flex layout safely.
- Reassign correct primary, warning, danger, and success semantic colors (`#28c973` for Add, `#ff4145` for Remove, etc.).
- Ensure that the CSS Progress meter fallback remains true to VisionOS style since it safely passes the DOM modification rules.
