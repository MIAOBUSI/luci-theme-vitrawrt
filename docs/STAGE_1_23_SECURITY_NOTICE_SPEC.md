# Stage 1.23 Security Notice Spec

Evidence source:

- Current light screenshot: `audit-output/stage-1.23-evidence/light-status-overview-components.png`
- Current dark screenshot: `audit-output/stage-1.23-evidence/dark-status-overview-components.png`
- Current DOM selector: `#maincontent .alert-message` / `#maincontent .alert`
- Current button selector: `.alert-message .btn` or `.alert .btn`

## Current Problem

- Notice width is `1578px` at 1920px viewport.
- Height is `130px`.
- It reads as a dominant top banner and competes with page content.
- Amber semantics exist but the treatment is still too abrupt and full-width.

## Target: Security Notice Card

- Keep LuCI warning logic and link intact.
- Do not hide the warning.
- Compact, content-aligned, and calmer.
- Use soft amber recommendation styling, not error styling.
- Button is a compact pill with warning-neutral material.
- Layout resembles Apple Settings security recommendation: concise title, supporting text, compact action.

## Allowed CSS

- `max-width`, margins, padding, border radius, background, border color, shadow, text color, button skin.
- Responsive wrapping for action button.

## Forbidden CSS

- Hiding the warning.
- Removing the action link.
- Changing auth/security behavior.
- Reordering DOM with JS.

## Screenshot Targets

- Before: `audit-output/stage-1.23-evidence/light-status-overview-components.png`
- Before dark: `audit-output/stage-1.23-evidence/dark-status-overview-components.png`
- After: `audit-output/visual-direction-1.23/<timestamp>/light-unset-password-warning.png`
- After dark: `audit-output/visual-direction-1.23/<timestamp>/dark-unset-password-warning.png`

## Final Stage 1.23 Verification

Final audit output: `audit-output/visual-direction-1.23/20260526-224900/`

- Light after: `audit-output/visual-direction-1.23/20260526-224900/light-unset-password-warning.png`
- Dark after: `audit-output/visual-direction-1.23/20260526-224900/dark-unset-password-warning.png`
- The notice is still present, keeps its LuCI action, and is styled as a compact soft-amber security recommendation card instead of a full-width native warning banner.
