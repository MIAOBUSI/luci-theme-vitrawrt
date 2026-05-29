# Stage 1.41C Safety Policy Correction

## 1. Problem with the Old Policy
The initial safety policy implemented in `check-js-safety.mjs` and `check-css-safety.mjs` was overly restrictive, enforcing a **blanket ban** on all DOM modifications and visual layout alterations to LuCI components.
- JS: Automatically failed on any `querySelector`, `appendChild`, or `MutationObserver` targeting `.cbi-dropdown`, `.cbi-progressbar`, `.cbi-tabmenu`, and `.cbi-dynlist`, even for safe, decorative wrapper injection.
- CSS: Banned `display`, `position`, `visibility`, and `flex` properties on critical LuCI layouts like `.cbi-tabmenu` and `.cbi-dynlist`.

This led to unintended regressions, forcing Stage 1.41B to revert Apple / VisionOS visual enhancements back to native LuCI layouts simply to pass the overly-strict test scripts.

## 2. Corrected JS Rule
- **Safe JS Examples:**
  - `classList.add / remove / toggle` for theme-owned classes
  - `dataset` passive assignment
  - `appendChild` for injecting newly created non-interactive decorative nodes (`aria-hidden=true`, `pointer-events:none`) into a theme container or LuCI element.
- **Unsafe JS Examples:**
  - Modifying `innerHTML` on LuCI runtime sections.
  - Moving/Replacing existing input or select nodes.
  - Forcing `element.click()` or dispatching synthetic `MouseEvent`s.
- **How it was updated:** 
  The regex patterns in `check-js-safety.mjs` were refined to allow passive element lookups. The script now verifies that `appendChild` targets locally created dummy elements or safe theme headers, while explicitly banning operations like `.replaceChild()` and `.innerHTML =`. 

## 3. Corrected CSS Rule
- **Safe CSS Examples:**
  - `display: inline-flex` and `width: fit-content` on `.cbi-tabmenu` to create wrapped Apple Dock visuals.
  - `display: flex` and `align-items: center` applied directly to `.cbi-dynlist` compound control rows to align inputs with buttons.
- **Unsafe CSS Examples:**
  - `display: block` applied globally to tables, bypassing standard data grid structures.
  - `visibility: hidden` or `display: none` applied manually to force tab-panels open/closed, breaking LuCI's built-in state machine.
- **How it was updated:**
  The `check-css-safety.mjs` component rule for `allowedComponentVisualProp` was expanded. We whitelisted `inline-flex` / `flex` for specific Apple UI elements (`.cbi-tabmenu`, `.cbi-dynlist`) so we can safely inject the appropriate layout constraints.
