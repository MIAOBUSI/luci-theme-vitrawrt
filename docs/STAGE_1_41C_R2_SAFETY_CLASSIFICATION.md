# Stage 1.41C-R2 Safety Classification Update

- **Policy Refinement:** We clarified the distinction between "Destructive Modification" and "Non-Destructive Enhancement".
- **Allowed:** CSS pseudo-elements (`::after`, `::before`) on LuCI-owned elements like `.cbi-dropdown` and `.cbi-progressbar`. Scoped `fit-content` and `inline-flex` for `.tabs` and `.cbi-tabmenu`.
- **Scripts Updated:** `check-css-safety.mjs` was modified to whitelist safe positional and structural enhancements specifically for dropdown arrows, progress meter highlights, and tab docks, allowing VitraWrt to meet Apple/VisionOS aesthetics without breaking LuCI lifecycles.
