# Stage 1.23 Sidebar State Audit

Evidence source:

- Raw data: `audit-output/stage-1.23-evidence/stage-1.23-evidence.json`
- Current screenshots:
  - `audit-output/stage-1.23-evidence/light-status-overview-components.png`
  - `audit-output/stage-1.23-evidence/light-network-network-components.png`
  - `audit-output/stage-1.23-evidence/light-openclash-components.png`

## DOM Evidence

- Row root: `.vwrt-menu-row`
- Link child: `.vwrt-menu-row > a`
- Expander: `.vwrt-menu-row > button.vwrt-menu-expander`
- Active route classes stay on `li`: `selected active expanded`
- `sidebar.js` currently removes only `expanded`; it does not remove `active` or `selected`.

## Current Computed-State Problem

Active child examples:

- `概览`: row background is a very subtle surface, but link background is stronger.
- `接口`: row background is subtle, link background is stronger.
- `OpenClash`: row background is subtle, link background is stronger.

This means the visual selected state is still owned mostly by the inner `a`, creating the short filled capsule inside the longer row outline.

## Fix Strategy

- Move active/selected material ownership to `.selected > .vwrt-menu-row` and `.active > .vwrt-menu-row`.
- Make active link background transparent.
- Keep expander background transparent/subtle and visually part of the row.
- Keep the left active indicator on the row.
- Do not change router behavior or state classes.
- Do not use JS.

## Screenshot Targets

- expanded active parent
- expanded active child
- parent hover
- child hover
- collapsed tooltip
- bottom control dock

Expected after evidence:

- `audit-output/visual-direction-1.23/<timestamp>/light-sidebar-active-child.png`
- `audit-output/visual-direction-1.23/<timestamp>/light-sidebar-parent-hover.png`
- `audit-output/visual-direction-1.23/<timestamp>/light-sidebar-child-hover.png`
- dark equivalents where captured

## Final Stage 1.23 Verification

Final audit output: `audit-output/visual-direction-1.23/20260526-224900/`

- Parent hover: `audit-output/visual-direction-1.23/20260526-224900/light-sidebar-hover-parent.png`, `audit-output/visual-direction-1.23/20260526-224900/dark-sidebar-hover-parent.png`
- Child hover: `audit-output/visual-direction-1.23/20260526-224900/light-sidebar-hover-child.png`, `audit-output/visual-direction-1.23/20260526-224900/dark-sidebar-hover-child.png`
- Expanded/sidebar state: `audit-output/visual-direction-1.23/20260526-224900/light-sidebar-expanded.png`, `audit-output/visual-direction-1.23/20260526-224900/dark-sidebar-expanded.png`
- Collapsed tooltip and bottom dock: `audit-output/visual-direction-1.23/20260526-224900/light-sidebar-collapsed-tooltip.png`, `audit-output/visual-direction-1.23/20260526-224900/light-sidebar-bottom-dock.png`

The active/hover material is now owned by `.vwrt-menu-row`; the inner link and expander are transparent visual children. `sidebar.js` still does not remove `active` or `selected`.
