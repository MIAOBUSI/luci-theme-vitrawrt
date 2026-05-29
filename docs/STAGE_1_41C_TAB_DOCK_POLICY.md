# Stage 1.41C Tab Dock Policy

## Background
In 1.41B, the strict ban on layout properties (such as `display: inline-flex`) for `.cbi-tabmenu` removed the Apple segmented dock styling, regressing tabs back into full-width horizontal containers. 

## Revised Policy
- **Flex Layout Permitted**: `.cbi-tabmenu` elements inside page and modal scopes are explicitly allowed to use `display: inline-flex`, `gap`, `align-items`, and `width: fit-content`.
- **Background Container**: The background of the dock must visually wrap around the tabs exactly rather than spanning the full available screen or modal width. 
- **Tab State Governance**: Tab interactions, visibility toggling of panels, and `.selected` class assignment MUST remain under the exclusive domain of LuCI's vanilla JS lifecycle. No custom script overrides will manually toggle `.hidden` based on tab clicks.
