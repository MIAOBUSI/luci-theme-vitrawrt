# Tab Structure Findings

Stage: 1R6 Evidence-Based First-load Tab Fix

Status: Superseded by Stage 1R7.

Stage 1R7 explicitly rolls back the 1R6 JavaScript recovery helper because
simulating tab clicks hides the symptom instead of fixing the LuCI/app
initialization state. Theme code must not call `click()` or dispatch synthetic
events to repair native tab behavior.

Current policy:

- If VitraWrt CSS overrides LuCI hidden states, remove that CSS.
- If a LuCI app or plugin initializes tab panes late or incorrectly, document it
  as an app/upstream limitation.
- The theme must not choose a tab, hide panes, move DOM nodes, or simulate user
  interaction.

Source evidence:

- `docs/TAB_FIRST_LOAD_VISUAL_AUDIT.md`
- `audit-output/tab-first-load-visual/20260522-115722/clean/vitrawrt/network-root/normal/t05.metrics.json`
- `audit-output/tab-first-load-visual/20260522-115722/persistent/vitrawrt/network-root/normal/t05.metrics.json`
- `audit-output/tab-first-load-visual/20260522-115722/clean/vitrawrt/vnstat2/normal/t05.metrics.json`
- `audit-output/tab-first-load-visual/20260522-115722/persistent/vitrawrt/vnstat2/normal/t05.metrics.json`
- `audit-output/tab-first-load-visual/20260522-115722/clean/vitrawrt/system-system/normal/t05.metrics.json`
- `audit-output/tab-first-load-visual/20260522-115722/persistent/vitrawrt/system-system/normal/t05.metrics.json`

## network-root

Path: `/cgi-bin/luci/admin/network`

Tab menu selector:

- `#maincontent ul.cbi-tabmenu`
- tab item selector: `#maincontent ul.cbi-tabmenu > li[data-tab]`
- clickable selector: `#maincontent ul.cbi-tabmenu > li[data-tab] > a`

Active tab:

- active item: `li.cbi-tab[data-tab="interface"]`
- active content: `#cbi-network-interface[data-tab="interface"][data-tab-active="true"]`

Tab content selector:

- `#maincontent .cbi-section[data-tab]`

First-load visible content in Stage 0C:

- `#cbi-network-interface[data-tab="interface"][data-tab-active="true"]`
- `#cbi-network-device[data-tab="device"]`
- `#cbi-network-globals[data-tab="globals"]`

Visible content count:

- clean profile: `3`
- persistent profile: `3`

The inactive panes have no `data-tab-active="false"` and no inline `display:none` on first load. This means the content is not being shown because the theme overrides an existing hidden state; the LuCI tab initialization state has not been fully applied to these panes.

## vnstat2

Path: `/cgi-bin/luci/admin/status/vnstat2`

Top menu selector:

- `#tabmenu`
- top menu items: Graphs / Configuration

Inner graph tab menu selector:

- `#maincontent ul.cbi-tabmenu`
- tab item selector: `#maincontent ul.cbi-tabmenu > li[data-tab]`
- clickable selector: `#maincontent ul.cbi-tabmenu > li[data-tab] > a`

Active tab:

- active item: `li.cbi-tab[data-tab="s"]`
- active content: `.cbi-section[data-tab="s"][data-tab-active="true"]`

Tab content selector:

- `#maincontent .cbi-section[data-tab]`

First-load visible content in Stage 0C:

- `.cbi-section[data-tab="s"][data-tab-active="true"]`
- `.cbi-section[data-tab="t"]`
- `.cbi-section[data-tab="5"]`
- `.cbi-section[data-tab="h"]`
- `.cbi-section[data-tab="d"]`
- `.cbi-section[data-tab="m"]`
- `.cbi-section[data-tab="y"]`

Visible content count:

- clean profile: `7`
- persistent profile: `7`

Visible graph images:

- `14`

Image groups:

- `7`

As with `network-root`, inactive graph panes have no `data-tab-active="false"` and no inline `display:none` on first load. The top Graphs / Configuration menu must not be treated as the graph-content tab group; recovery must target the inner `li[data-tab]` tab menu.

## system-system control

Path: `/cgi-bin/luci/admin/system/system`

Tab menu selector:

- `#maincontent ul.cbi-tabmenu`

Tab content selector:

- `#maincontent .cbi-section-node-tabbed > [data-tab]`

First-load state:

- active pane: `#container.system.cfg01e48a.general[data-tab="general"][data-tab-active="true"]`
- inactive panes: `logging`, `timesync`, `language`
- inactive panes have `data-tab-active="false"` and computed `display:none`

Visible content count:

- clean profile: `1`
- persistent profile: `1`

This page is already correct and must not be touched by first-load recovery.

## LuCI native tab behavior

The deployed LuCI `ui.js` tab switcher does the actual state update:

- menu items are switched between `cbi-tab` and `cbi-tab-disabled`
- the active pane receives `data-tab-active="true"`
- inactive panes receive `data-tab-active="false"`
- the stylesheet then hides inactive panes

Important detail: LuCI `switchTab()` returns immediately when the clicked tab is already active. Therefore clicking the current active tab alone does not recover first-load state. A safe recovery must trigger native LuCI behavior by clicking an inactive tab, then clicking the original active tab again.

## Why not global CSS

The broken pages and the healthy page use different content structures:

- `network-root` and `vnstat2`: `.cbi-section[data-tab]`
- `system-system`: `.cbi-section-node-tabbed > [data-tab]`

The broken inactive panes are visible because they do not yet carry the expected inactive state, not because a hidden state is overridden. A global CSS rule such as hiding all `.cbi-section[data-tab]` would guess at LuCI state and risks breaking native or plugin pages.

Stage 1R6 therefore uses a narrow JavaScript recovery helper scoped only to:

- `/admin/network`
- `/admin/status/vnstat2`

The helper does not manually hide content. It only dispatches native tab clicks to make LuCI apply its own tab state.
