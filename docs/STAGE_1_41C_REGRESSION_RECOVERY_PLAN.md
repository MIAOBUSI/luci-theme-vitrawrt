# Stage 1.41C Regression Recovery Plan

## Context
During Stage 1.41B, we replaced unstable layout behaviors and Javascript injections with pure CSS alternatives, effectively standardizing the DOM interaction boundary. However, our internal testing scripts (`check-js-safety.mjs` and `check-css-safety.mjs`) had blanket bans on several flex-based properties that prevented faithful reproduction of Apple/VisionOS UI components. 

## Recovery Focus
- **Component Layout:** `.cbi-tabmenu` and `.cbi-dynlist`.
- **Button Roles:** `.cbi-button-add` (success green), `.cbi-button-remove` (danger red).

## Execution Method
1. Modify CSS and JS testing scripts to lift `inline-flex` block on `.cbi-tabmenu`.
2. Modify `luci-components-visual.css` to inject missing Flexbox utilities in specific target areas without cascading globally.
3. Validate output without introducing regressions to native LuCI component behavior.
