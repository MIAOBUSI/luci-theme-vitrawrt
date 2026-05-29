# VitraWrt Architecture

## Core Rule

Native LuCI pages are not Dashboard.

`luci-theme-vitrawrt` is a theme package. It provides the visual shell, shared tokens, sidebar, login page, dark/light/system modes, and conservative styling for LuCI controls. It must not replace LuCI applications or reinterpret native pages as VitraWrt product screens.

## Native Pages Stay Native

The following pages must remain OpenWrt/LuCI native pages:

| Native page | Route | Rule |
| --- | --- | --- |
| Status -> Overview | `/admin/status/overview` | Do not hijack or redesign as dashboard. |
| System -> System | `/admin/system/system` | Preserve CBI tab behavior and form layout. |
| Network -> Interfaces | `/admin/network/network` | Preserve LuCI interface page structure. |
| Network -> Firewall | `/admin/network/firewall` | Preserve firewall table and rule UI behavior. |
| Statistics / vnStat | plugin routes | Preserve plugin-native graph and tab behavior. |

The theme may improve readability through colors, borders, radius, focus states, and spacing. It must not move, expand, hide, clone, or structurally reflow dynamic LuCI business content.

## Stage 1R: Theme Foundation

Stage 1R owns:

- Theme package: `luci-theme-vitrawrt`
- Modern ucode theme templates
- Legacy Lua theme templates
- Static CSS/JS/SVG assets
- Floating sidebar and mobile drawer
- Light, dark, and system theme modes
- Conservative LuCI native page visual unification
- Runtime compatibility tests

Stage 1R does not own:

- Dashboard cards or dashboard routes
- Service status data
- Network topology views
- rpcd/ubus backend APIs
- Third-party service integrations
- Replacement views for native LuCI pages

## Stage 2: Independent Dashboard App

Stage 2 must be a separate package:

```text
luci-app-vitrawrt-dashboard
```

The dashboard must use its own LuCI route, for example:

```text
/admin/vitrawrt/dashboard
```

The dashboard must coexist with native LuCI pages. It must not redirect, override, or replace:

```text
/admin/status/overview
```

## Theme Safety Contract

Theme CSS may:

- Define tokens and surfaces.
- Style shell, sidebar, login, alerts, tables, forms, buttons, and focus states.
- Add borders, background colors, border radius, shadows, and text color.
- Limit images to `max-width: 100%` to avoid plugin page overflow.

Theme CSS must not:

- Force hidden LuCI nodes visible.
- Force inactive tab panels visible.
- Convert native `ifacebox` or `network-status-table` into dashboard cards.
- Reflow `.cbi-section-node`, `.cbi-value`, `.cbi-tab`, `.tabs`, or plugin tab containers.
- Use global layout rewrites on LuCI business content.

Theme JS may:

- Add diagnostic body classes such as `vwrt-view-ready`, `vwrt-has-cbi`, and `vwrt-page-system`.
- Manage theme shell interactions such as sidebar collapse, mobile drawer, and local visual preferences.

Theme JS must not:

- Move LuCI-rendered content nodes.
- Expand or hide LuCI business content.
- Replace native views.
- Fetch dashboard/service data.

## Stage 1.41A CSS Cascade

Stage 1.41A keeps Bootstrap as the native LuCI behavior baseline and applies only safe VitraWrt visual identity layers on top:

```text
/luci-static/bootstrap/cascade.css
tokens.css
light.css
dark.css
base.css
sidebar.css
luci-components-visual.css
luci-layout-exceptions.css
responsive.css
```

Deprecated files such as `luci-visual.css`, `glass.css`, `luci-overrides.css`, `luci-reset.css`, `luci-safe.css`, and `luci-native.css` are archived and no longer imported.

`sidebar.css` owns the VitraWrt shell navigation, including the local SVG menu icon system. It must not style or mutate `#maincontent` LuCI business components.

`luci-components-visual.css` is visual-only, and it is the only place allowed to skin native LuCI component surfaces such as tabs, form shells, progress bars, apply areas, modal/dialog surfaces, loading cards, and status/ifacebox shells. It must not alter display/hidden state, pointer events, positioning, table layout, modal lifecycle, dropdown lifecycle, dynlist lifecycle, apply lifecycle, or ifacebox tooltip behavior.

`luci-layout-exceptions.css` contains only audited page-scoped fixes for OpenClash, MosDNS, startup, processes, syslog, network-share, packages, and vnStat2. New table fixes must remain page-scoped and be justified by Bootstrap/Argon metric comparison.

## Regression Requirements

The runtime regression test must verify:

- Native routes remain native.
- System tabs show one active panel at a time.
- Hidden tab panels remain hidden.
- `ifacebox` tooltip-only content is not visible before hover.
- Native plugin pages are not replaced by dashboard markup.
- Buttons remain visibly styled.
- Graph images do not overflow main content.
