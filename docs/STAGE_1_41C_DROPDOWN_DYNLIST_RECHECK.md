# Stage 1.41C Dropdown and Dynlist Re-check

## Verification Items
- [x] `.cbi-dropdown` and native `<select>` have visible SVG chevron (`background-image`).
- [x] Closed `.cbi-dropdown` internal `li[display="0"]` background color pollution is correctly suppressed without hiding the active option value.
- [x] Dynlist components successfully use `.cbi-dynlist .item` flex layouts to perfectly align input fields with action buttons.
- [x] Semantic success color (`#28c973`) restored for `.cbi-button-add` instead of fallback primary blue.
- [x] Semantic danger color (`#ff4145`) restored for `.cbi-button-remove` instead of fallback primary blue.
- [x] Native Dropdown behaviors (opening/closing/selection) remain purely handled by LuCI's vanilla DOM methods.
