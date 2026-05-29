# Stage 1.41C Progress Meter Policy

## Philosophy
The progress meter must emulate the Apple/VisionOS UI without interrupting the native Javascript `.cbi-progressbar` data bindings and rendering hooks.

## Allowed (Non-Destructive) Enhancements
- Modifying the visual appearance of `.cbi-progressbar` via standard CSS.
- Layering purely decorative pseudo-elements (`::before`, `::after`) over the progress bar.
- Creating a glass-like container visual while the internal `div` dictates width logic.
- Using `data-vw-variant` attributes set via safe Javascript hook (e.g. `boot.js`) without DOM manipulation of the bar components itself.

## Forbidden (Destructive)
- `element.appendChild()` to remove or wrap the existing inner `div` with new containers.
- Re-calculating or overriding the inline `style="width: XX%"` injected by LuCI plugins (like opkg or package installation screens).
- Utilizing `MutationObserver` to tear-down and rebuild the progress structure.
