# Stage 1.11 Visual Identity Notes

Stage 1.11 upgrades VitraWrt's visual identity without changing native LuCI page behavior.

## Scope

- Sidebar local SVG icon system.
- Stronger Floating Liquid Glass sidebar surface.
- Safer visual polish for LuCI native sections, tables, forms, buttons, and alerts.
- Minor login page polish that preserves the original authentication form.
- Light and dark token refinements.

Stage 1.11 does not implement dashboard, rpcd, ubus backends, service metrics, or third-party integrations.

## Sidebar Icon Mapping

The sidebar renderer adds a VitraWrt-owned icon span inside each sidebar link:

```html
<span class="vwrt-menu-icon vwrt-icon-network" aria-hidden="true"></span>
```

This does not change link URLs, click handling, active route detection, child menu rendering, or LuCI page content.

| Icon class | Local SVG | Match hints |
| --- | --- | --- |
| `vwrt-icon-status` | `status.svg` | status, overview, log, process |
| `vwrt-icon-system` | `system.svg` | system, admin, startup, software, package |
| `vwrt-icon-services` | `services.svg` | services, plugin, daemon |
| `vwrt-icon-network` | `network.svg` | network, interface, firewall, dhcp, route |
| `vwrt-icon-wireless` | `wireless.svg` | wireless, wifi, wlan, radio |
| `vwrt-icon-vpn` | `vpn.svg` | vpn, proxy, tunnel, route |
| `vwrt-icon-nas` | `nas.svg` | nas, samba, ksmbd, nfs, share, storage |
| `vwrt-icon-statistics` | `statistics.svg` | statistics, vnStat, traffic, monitor |
| `vwrt-icon-logout` | `logout.svg` | logout, exit, reboot, shutdown |
| `vwrt-icon-generic` | `generic.svg` | unknown top-level menu |
| `vwrt-icon-dot` | `dot.svg` | unknown submenu item |

## Safety Rules

- Do not repair LuCI behavior by simulating user clicks.
- Do not globally normalize tables.
- Do not style or control LuCI tabs, dropdowns, dynlists, modals, apply areas, or ifacebox internals from `luci-visual.css`.
- Any table layout correction must stay in `luci-layout-exceptions.css` and be scoped to an audited page class.

## Known Limitation

If a LuCI app or third-party plugin exposes first-load tab content before its own initialization finishes, the theme records the behavior as an app compatibility limitation. The theme must not hide it by fake-clicking tabs or implementing a parallel tab system.
