# Visual Direction Audit 1.12B

Output: audit-output/visual-direction-1.12B/20260525-112107

## Source Safety
- check-js-safety status: 0
- check-css-safety status: 0
- fake click detected: no
- global table normalize detected: no

## Login
- light 1920x1080: audit-output/visual-direction-1.12B/20260525-112107/login-light-1920x1080.png; logo={"x":641,"y":448,"width":108,"height":108}; button=rgb(79, 143, 200)
- light 390x844: audit-output/visual-direction-1.12B/20260525-112107/login-light-390x844.png; logo={"x":159,"y":238,"width":72,"height":72}; button=rgb(79, 143, 200)
- dark 1920x1080: audit-output/visual-direction-1.12B/20260525-112107/login-dark-1920x1080.png; logo={"x":641,"y":448,"width":108,"height":108}; button=rgb(134, 188, 231)
- dark 390x844: audit-output/visual-direction-1.12B/20260525-112107/login-dark-390x844.png; logo={"x":159,"y":238,"width":72,"height":72}; button=rgb(134, 188, 231)

## Pages
- light status-overview: audit-output/visual-direction-1.12B/20260525-112107/light-status-overview.png
  - blue usage ratio: 0.295
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light system-system: audit-output/visual-direction-1.12B/20260525-112107/light-system-system.png
  - blue usage ratio: 0.244
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light network-network: audit-output/visual-direction-1.12B/20260525-112107/light-network-network.png
  - blue usage ratio: 0.292
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
  - modal opened: true
- light vnstat2: audit-output/visual-direction-1.12B/20260525-112107/light-vnstat2.png
  - blue usage ratio: 0.287
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light packages: audit-output/visual-direction-1.12B/20260525-112107/light-packages.png
  - blue usage ratio: 0.297
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light processes: audit-output/visual-direction-1.12B/20260525-112107/light-processes.png
  - blue usage ratio: 0.324
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- light syslog: audit-output/visual-direction-1.12B/20260525-112107/light-syslog.png
  - blue usage ratio: 0
  - default icons all blue: false
  - overflow: false
  - expanded groups: 0
  - dropdown options visible before open: 0
- dark status-overview: audit-output/visual-direction-1.12B/20260525-112107/dark-status-overview.png
  - blue usage ratio: 0.295
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark system-system: audit-output/visual-direction-1.12B/20260525-112107/dark-system-system.png
  - blue usage ratio: 0.244
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark network-network: audit-output/visual-direction-1.12B/20260525-112107/dark-network-network.png
  - blue usage ratio: 0.298
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
  - modal opened: true
- dark vnstat2: audit-output/visual-direction-1.12B/20260525-112107/dark-vnstat2.png
  - blue usage ratio: 0.287
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark packages: audit-output/visual-direction-1.12B/20260525-112107/dark-packages.png
  - blue usage ratio: 0.302
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0
- dark processes: audit-output/visual-direction-1.12B/20260525-112107/dark-processes.png
  - blue usage ratio: 0
  - default icons all blue: false
  - overflow: false
  - expanded groups: 0
  - dropdown options visible before open: 0
- dark syslog: audit-output/visual-direction-1.12B/20260525-112107/dark-syslog.png
  - blue usage ratio: 0.219
  - default icons all blue: false
  - overflow: false
  - expanded groups: 1
  - dropdown options visible before open: 0

## Direction Checks
- Blue should remain an accent. Use the per-page blue usage ratio as a rough computed-style signal, not a pixel-perfect measurement.
- Default sidebar icons must not all be blue.
- Tabs should read as independent glass pills, not pill-on-pill layers.
- Progress should show a glass trough and restrained fill while keeping original values.
- Modal/dropdown/apply behavior is checked by runtime regression; this audit only records visual state and screenshots.

## Known Limitations
- VitraWrt theme does not repair app/plugin first-load tab issues with simulated clicks.
- Status -> Overview remains native LuCI overview; VitraWrt Dashboard is a future independent luci-app page.
- Table layout fixes remain page-scoped and are not expanded by this visual direction pass.
