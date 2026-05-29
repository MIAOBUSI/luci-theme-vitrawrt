# Stage 1.41C-R2 Dropdown and Dynlist DOM Evidence

- **Selector Confirmed:** `.cbi-dropdown` native structures remain fully intact. Arrow affordances are created via `::after`.
- **Selector Confirmed:** `.cbi-dynlist .item` and `.cbi-dynlist .cbi-button-add` share identical metrics (min-height 44px, padding, radius 18px).
- **No InnerHTML / appendChild:** We confirmed no DOM destructive actions were required to attain the Apple/VisionOS compound control aesthetic.
