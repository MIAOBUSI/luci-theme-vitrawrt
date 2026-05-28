# Visual Components 1.12 Audit

Output: audit-output/visual-components-1.12/20260523-193257

## Source Safety
- check-js-safety status: 0
- check-css-safety status: 0
- fake click detected: no
- global table normalize detected: no

## Login
- light 1920x1080: audit-output/visual-components-1.12/20260523-193257/login-light-1920x1080.png logo={"width":108,"height":108,"x":641,"y":448} button=rgb(36, 120, 212)
- light 390x844: audit-output/visual-components-1.12/20260523-193257/login-light-390x844.png logo={"width":72,"height":72,"x":159,"y":238} button=rgb(36, 120, 212)
- dark 1920x1080: audit-output/visual-components-1.12/20260523-193257/login-dark-1920x1080.png logo={"width":108,"height":108,"x":641,"y":448} button=rgb(116, 185, 255)
- dark 390x844: audit-output/visual-components-1.12/20260523-193257/login-dark-390x844.png logo={"width":72,"height":72,"x":159,"y":238} button=rgb(116, 185, 255)

## Native Pages
- light status-overview 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-status-overview-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - collapsed tooltip: {"content":"状态","visibility":"visible","opacity":1,"color":"rgb(20, 34, 51)","background":"rgba(255, 255, 255, 0.9)"}
  - tabs: 0
  - progress: 9
  - status cards: 3
- light network-network 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-network-network-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 1
  - progress: 0
  - status cards: 1
  - modal opened: true
- light system-system 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-system-system-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 1
  - progress: 0
  - status cards: 0
- light syslog 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-syslog-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 0
  - progress: 0
  - status cards: 0
- light processes 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-processes-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 0
  - progress: 0
  - status cards: 0
- light packages 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-packages-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 1
  - progress: 1
  - status cards: 0
- light vnstat2 1920x1080: audit-output/visual-components-1.12/20260523-193257/light-vnstat2-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 2
  - progress: 0
  - status cards: 0
- dark status-overview 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-status-overview-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - collapsed tooltip: {"content":"状态","visibility":"visible","opacity":1,"color":"rgb(237, 245, 251)","background":"rgba(17, 27, 42, 0.9)"}
  - tabs: 0
  - progress: 9
  - status cards: 3
- dark network-network 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-network-network-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 1
  - progress: 0
  - status cards: 1
  - modal opened: true
- dark system-system 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-system-system-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 1
  - progress: 0
  - status cards: 0
- dark syslog 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-syslog-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 0
  - progress: 0
  - status cards: 0
- dark processes 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-processes-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 0
  - progress: 0
  - status cards: 0
- dark packages 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-packages-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 1
  - progress: 1
  - status cards: 0
- dark vnstat2 1920x1080: audit-output/visual-components-1.12/20260523-193257/dark-vnstat2-1920x1080.png
  - overflow: false
  - sidebar expanded groups: 1
  - tabs: 2
  - progress: 0
  - status cards: 0

## Notes
- Stage 1.12 is visual-only: it does not implement dashboard, rpcd, service data, or fake tab recovery.
- vnStat2/network first-load tab behavior remains documented as an app/plugin compatibility limitation when observed; this audit does not hide it with simulated interactions.
- Table layout fixes remain page-scoped and are not introduced by this visual component pass.
