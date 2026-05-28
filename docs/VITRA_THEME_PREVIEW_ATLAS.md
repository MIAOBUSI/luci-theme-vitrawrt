# VitraWrt LuCI Theme Preview Atlas

Stage 0D establishes a static visual target atlas for `luci-theme-vitrawrt`.
It is a design reference for a LuCI theme, not a dashboard implementation.

## Principles

- `Status -> Overview` remains the native OpenWrt/LuCI overview page.
- The future VitraWrt dashboard must be a separate `luci-app-vitrawrt-dashboard` page, for example `/admin/vitrawrt/dashboard`.
- The theme may provide shell, sidebar, color, typography, spacing, and safe visual skins for native LuCI components.
- The theme must not rewrite LuCI page logic, replace native page information architecture, fake-click tabs, or take over dropdown, dynlist, modal, apply area, or ifacebox lifecycles.
- Table layout fixes must be page-scoped and justified by Bootstrap/Argon metric comparison.

## Atlas Files

- [Page Matrix](VITRA_THEME_PAGE_MATRIX.md): route coverage, safe targets, and preview mapping.
- [Component Spec](VITRA_THEME_COMPONENT_SPEC.md): component-level visual targets and interaction boundaries.
- [Visual Rules](VITRA_THEME_VISUAL_RULES.md): color, spacing, radius, shadow, motion, accessibility, and performance rules.
- Static preview entry: `../previews/index.html`
- Snapshot script: `../scripts/preview-snapshot.mjs`

## Preview Coverage

The static previews cover:

- Auth/session: login, failed login, loading, session timeout, applying changes.
- Native status pages: overview, routes, logs, processes, nftables/firewall, realtime, vnStat2.
- Native system pages: system CBI form, administration, packages, startup, cron, mount points, backup/flash, reboot.
- Native network pages: interfaces, interface edit modal, devices, DHCP/DNS, firewall, routing, diagnostics.
- Common plugin page types: configuration-heavy, table-heavy, dashboard-like, iframe-like external entry.
- Component patterns: tabs, forms, dropdowns, dynlists, buttons, tables, progress, badges, alerts, modals, loading, ifacebox, sidebar states.
- Modes and viewports: light, dark, collapsed sidebar, tablet, mobile drawer.

## Implementation Use

Future implementation stages should use this atlas as a visual target, then verify changes against the real device and existing safety scripts:

```sh
node scripts/check-js-safety.mjs
node scripts/check-css-safety.mjs
node scripts/runtime-regression-test.mjs --host 10.10.10.148
```

The atlas is intentionally static. It must not be copied into LuCI runtime templates as replacement page markup.

## Theme Scope

Theme scope:

- Shell background and spacing.
- Floating sidebar, collapsed sidebar, mobile drawer visual states.
- Login page visual skin.
- Safe skin for native LuCI sections, tables, forms, tabs, buttons, alerts, progress, apply surfaces, modal surfaces, loading surfaces, and status cards.
- Dark/light/system modes.

Not theme scope:

- Replacing `Status -> Overview` with dashboard content.
- Fetching OpenClash, MosDNS, AdGuard Home, FRP, DDNS, or other service data.
- Rewriting CBI model structure.
- Rewriting plugin page JavaScript.
- Simulating user clicks to fix first-load behavior.
- Globally normalizing all tables.

## Stage 2 Boundary

The following belong to `luci-app-vitrawrt-dashboard`, not the theme:

- Professional dashboard home.
- Network topology/path view.
- Aggregated service health and latency cards.
- Cross-service status summaries.
- VitraWrt-specific settings center.
- Any backend data collection through rpcd/ubus.

