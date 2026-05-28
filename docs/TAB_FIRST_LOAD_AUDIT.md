# Tab First Load Audit

Generated: 2026-05-22T03:33:57.085Z

Target: 10.10.10.148

Original mediaurlbase: `/luci-static/vitrawrt`

Restored mediaurlbase: `/luci-static/vitrawrt`

## Summary

### bootstrap
- bootstrap/network-root: before=1, after-return=1, clicked=true/true, class=normal
- bootstrap/vnstat2: before=1, after-return=1, clicked=true/true, class=normal
- bootstrap/system-system: before=1, after-return=1, clicked=true/true, class=normal
### argon
- argon/network-root: before=1, after-return=1, clicked=true/true, class=normal
- argon/vnstat2: before=1, after-return=1, clicked=true/true, class=normal
- argon/system-system: before=1, after-return=1, clicked=true/true, class=normal
### vitrawrt
- vitrawrt/network-root: before=1, after-return=1, clicked=true/true, class=normal
- vitrawrt/vnstat2: before=1, after-return=1, clicked=true/true, class=normal
- vitrawrt/system-system: before=1, after-return=1, clicked=true/true, class=normal

## Diagnosis

- network-root: normal-or-no-candidates
- vnstat2: normal-or-no-candidates
- system-system: normal-or-no-candidates

## Artifacts

- Output root: audit-output/tab-first-load
- JSON summary: audit-output/tab-first-load/summary.json
- Per-page files: `*.before-click.png`, `*.after-second-click.png`, `*.after-return-click.png`, `*.before-click.html`, `*.after-click.html`, `*.tab-report.json`
