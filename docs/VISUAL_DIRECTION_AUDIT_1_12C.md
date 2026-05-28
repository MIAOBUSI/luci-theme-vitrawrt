# Visual Direction Audit 1.12C

Output: audit-output/visual-direction-1.12C/20260525-151345

## Source Safety
- check-js-safety status: 0
- check-css-safety status: 0
- fake click detected: no
- global table normalize detected: no

## Login
- light 1920x1080: audit-output/visual-direction-1.12C/20260525-151345/login-light-1920x1080.png; logo={"x":641,"y":448,"width":108,"height":108}; button=rgb(63, 127, 184)
- light 390x844: audit-output/visual-direction-1.12C/20260525-151345/login-light-390x844.png; logo={"x":159,"y":238,"width":72,"height":72}; button=rgb(63, 127, 184)
- dark 1920x1080: audit-output/visual-direction-1.12C/20260525-151345/login-dark-1920x1080.png; logo={"x":641,"y":448,"width":108,"height":108}; button=rgb(136, 185, 222)
- dark 390x844: audit-output/visual-direction-1.12C/20260525-151345/login-dark-390x844.png; logo={"x":159,"y":238,"width":72,"height":72}; button=rgb(136, 185, 222)

## Pages
- light status-overview: audit-output/visual-direction-1.12C/20260525-151345/light-status-overview.png
  - blue usage ratio: 0.122
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light system-system: audit-output/visual-direction-1.12C/20260525-151345/light-system-system.png
  - blue usage ratio: 0.07
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light network-network: audit-output/visual-direction-1.12C/20260525-151345/light-network-network.png
  - blue usage ratio: 0.077
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
  - modal opened: true
- light vnstat2: audit-output/visual-direction-1.12C/20260525-151345/light-vnstat2.png
  - blue usage ratio: 0.093
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light packages: audit-output/visual-direction-1.12C/20260525-151345/light-packages.png
  - blue usage ratio: 0.027
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light processes: audit-output/visual-direction-1.12C/20260525-151345/light-processes.png
  - blue usage ratio: 0.015
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light syslog: audit-output/visual-direction-1.12C/20260525-151345/light-syslog.png
  - blue usage ratio: 0.052
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark status-overview: audit-output/visual-direction-1.12C/20260525-151345/dark-status-overview.png
  - blue usage ratio: 0.122
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark system-system: audit-output/visual-direction-1.12C/20260525-151345/dark-system-system.png
  - blue usage ratio: 0.085
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark network-network: audit-output/visual-direction-1.12C/20260525-151345/dark-network-network.png
  - blue usage ratio: 0.101
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
  - modal opened: true
- dark vnstat2: audit-output/visual-direction-1.12C/20260525-151345/dark-vnstat2.png
  - blue usage ratio: 0.14
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark packages: audit-output/visual-direction-1.12C/20260525-151345/dark-packages.png
  - blue usage ratio: 0.04
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark processes: audit-output/visual-direction-1.12C/20260525-151345/dark-processes.png
  - blue usage ratio: 0.015
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark syslog: audit-output/visual-direction-1.12C/20260525-151345/dark-syslog.png
  - blue usage ratio: 0.052
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0

## Direction Checks
- Visual target: docs/previews/vitrawrt-preview-premium-v4.html. The audit checks whether the live theme follows that low-saturation glass direction without copying preview DOM.
- Blue should remain an accent. Use the per-page blue usage ratio as a rough computed-style signal, not a pixel-perfect measurement.
- Default sidebar icons must not all be blue.
- Tabs should read as independent glass pills, not pill-on-pill layers.
- Progress should show a glass trough and restrained fill while keeping original values.
- Apply/save controls should read as compact neutral glass controls, not saturated blue bars spanning the page.
- Dropdown, modal, loading and session dialogs should use glass-sheet visual treatment without changing LuCI lifecycle.
- Modal/dropdown/apply behavior is checked by runtime regression; this audit only records visual state and screenshots.

## Known Limitations
- VitraWrt theme does not repair app/plugin first-load tab issues with simulated clicks.
- Status -> Overview remains native LuCI overview; VitraWrt Dashboard is a future independent luci-app page.
- Table layout fixes remain page-scoped and are not expanded by this visual direction pass.
