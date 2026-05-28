# VitraWrt / 璃境 LuCI Theme

VitraWrt / 璃境 is a Stage 1R LuCI theme package for OpenWrt and ImmortalWrt.

This package only implements `luci-theme-vitrawrt`: a standalone Liquid Glass visual theme with a floating sidebar, light/dark/system color modes, a clean login page, responsive navigation, and conservative visual unification for native LuCI pages.

It does not implement dashboard service data, rpcd/ubus backends, OpenClash, AdGuard Home, MosDNS, FRP, DDNS, or any third-party service integration.

Native LuCI pages are not the VitraWrt Dashboard. The theme must not hijack, replace, move, expand, hide, or structurally rearrange LuCI runtime content.

## Project Scope

Included:

- LuCI theme package: `luci-theme-vitrawrt`
- Modern LuCI ucode templates
- Legacy LuCI Lua view templates
- Static CSS, JavaScript, and SVG assets
- UCI defaults for theme registration
- Package-manager detection helper

Not included in Stage 1R:

- `luci-app-vitrawrt-dashboard`
- `luci-lib-vitrawrt`
- rpcd/ubus backend
- Router dashboard service metrics
- Third-party service API integration

## Architecture Principle

Native LuCI pages are not Dashboard.

The following routes must remain native OpenWrt/LuCI pages:

- `Status -> Overview` (`/admin/status/overview`)
- `System -> System` (`/admin/system/system`)
- `Network -> Interfaces` (`/admin/network/network`)
- `Network -> Firewall` (`/admin/network/firewall`)
- `Statistics` / `vnStat` plugin pages

`luci-theme-vitrawrt` may provide:

- Shell, background, typography, color tokens, sidebar, topbar, login page, and responsive navigation.
- Conservative visual styling for native LuCI controls, forms, tables, alerts, and buttons.
- Safety CSS that preserves LuCI hidden states, tabs, tooltips, and form interactions.

`luci-theme-vitrawrt` must not:

- Treat `Status -> Overview` as the VitraWrt Dashboard.
- Hijack `/admin/status/overview`.
- Move, expand, hide, clone, or structurally reflow LuCI dynamic business content.
- Turn `ifacebox`, `cbi-section`, tabs, vnStat graphs, or firewall tables into dashboard cards.
- Fetch or display third-party service data.

The VitraWrt Dashboard belongs to Stage 2 and must be implemented as an independent LuCI app page such as:

```text
/admin/vitrawrt/dashboard
```

It must coexist with native `Status -> Overview` without replacing or modifying that page.

## Design Scope Notice

`luci-theme-vitrawrt` can only provide a safe LuCI shell and conservative visual theme foundation. It can improve the login screen, sidebar, theme colors, native control readability, focus states, dark mode, and basic surface consistency.

The professional dashboard shown in VitraWrt design previews is outside the responsibility of a theme package. Dedicated dashboard cards, network paths, service status tables, right-side settings centers, live metrics, and opinionated data layouts require Stage 2: `luci-app-vitrawrt-dashboard`.

Stage 1R intentionally does not try to make native LuCI pages look like a purpose-built dashboard mockup. It keeps native information architecture and interaction behavior intact.

## Theme Foundation Scope

Stage 1R establishes the VitraWrt theme foundation and design system for the LuCI shell without changing native page behavior.

`luci-theme-vitrawrt` is responsible for:

- Global Vitra layout, background, spacing, typography, motion, and color tokens.
- Floating Liquid Glass sidebar, mobile topbar, drawer behavior, logo, and bottom controls.
- Shared surface classes such as `vitra-surface`, `vitra-panel`, `vitra-card`, `vitra-glass`, `vitra-alert`, `vitra-toolbar`, and `vitra-section`.
- Conservative native LuCI styling for CBI sections, forms, tables, tabs, alerts, progress bars, and buttons.
- Safety rules for hidden states, tab panels, tooltips, and clickable controls.

Future `luci-app-vitrawrt-dashboard` work must reuse the same tokens and surface system from this theme. The dashboard app is not a replacement for the theme; it is a feature app built on top of the theme foundation.

If the theme tries to act like a dashboard, native LuCI pages become fragile. Stage 1R exists to prevent that split before Stage 2 begins.

## Stage 1.12 Native Component Visual System

Stage 1.12 keeps the Stage 1R8/1R9 compatibility reset and the Stage 1.11 sidebar icon work, then adds a VitraWrt component skin for native LuCI widgets.

The new visual layer is intentionally constrained:

- `sidebar.css` improves collapsed-sidebar icon recognition, hover continuity, and VitraWrt-owned tooltip styling.
- `menu-vitrawrt.js` only adds `aria-label`, `data-vwrt-tooltip`, and icon metadata to VitraWrt sidebar links. It does not change `href`, click handling, active route logic, or LuCI page content.
- `luci-components-visual.css` styles tabs, form controls, progress bars, status cards, apply areas, modal/dialog surfaces, and loading states using only visual properties.
- `luci-components-visual.css` must not set `display`, `position`, `z-index`, `pointer-events`, `transform`, table layout rules, global widths, or hidden/display state.

The Stage 1.12 component skin may make native widgets look like VitraWrt, but it must never take over CBI tabs, dropdowns, dynlists, modals, apply areas, ifacebox tooltips, or plugin page lifecycles.

## Stage 1.11 Visual Identity Layer

Stage 1.11 keeps the Stage 1R8/1R9 compatibility reset and adds a visual identity layer on top of native LuCI pages.

The active CSS cascade is:

- `/luci-static/bootstrap/cascade.css`: LuCI behavior and layout baseline.
- `tokens.css`: design tokens and aliases only.
- `light.css` / `dark.css`: semantic color variables.
- `base.css`: body background, shell layout, login page, base text, media, and scroll styling.
- `sidebar.css`: VitraWrt sidebar, mobile drawer, local menu icon system, and sidebar controls.
- `luci-visual.css`: safe visual skin for native LuCI sections, tables, forms, buttons, and alerts.
- `luci-components-visual.css`: safe visual skin for native LuCI tabs, progress, apply areas, modal/dialog surfaces, loading states, and status cards.
- `luci-layout-exceptions.css`: narrow page-scoped fixes for audited pages only.
- `responsive.css`: shell/sidebar/login responsive rules.

Stage 1.11 adds local SVG menu icons under `htdocs/luci-static/vitrawrt/img/menu-icons/`. The icons are used only inside the VitraWrt sidebar and do not change menu links, click handling, active routes, or LuCI page behavior.

The visual layer must still not style or control LuCI runtime internals such as tabs, dropdowns, dynlists, modals, apply areas, or ifacebox internals.

## Stage 1R3 Bootstrap-Preserving Vitra Skin

Stage 1R3 is a Bootstrap-preserving compatibility pass. It keeps the Stage 1R safety reset, then restores Bootstrap/Argon-like layout behavior for native LuCI pages while retaining VitraWrt colors, sidebar, and light visual skin.

Stage 1R3 must not alter LuCI tab logic, tooltip behavior, hidden states, form layout, button flow, `ifacebox` internals, or vnStat/plugin page content. Its baseline is Bootstrap metrics, with Argon used as a compatibility reference for custom-theme engineering.

## Stage 1R4 CBI Native Recovery

Stage 1R4 restores LuCI CBI runtime widgets after real-device comparison. It keeps VitraWrt as a skin and does not turn native pages into dashboard views.

- Current Stage 1.11 no longer relies on broad `luci-safe.css` / `luci-native.css` layers. It uses Bootstrap as the behavior baseline, `luci-visual.css` for safe visual skin, and `luci-layout-exceptions.css` for audited page-scoped layout exceptions.
- `luci-visual.css` must not force inactive panels visible, expose dropdown options before open, hide dynlist controls, force apply areas visible, or structurally reflow CBI business content.
- `scripts/cbi-component-audit.mjs` compares Bootstrap, Argon, and VitraWrt on CBI components and writes `docs/CBI_COMPONENT_AUDIT.md`.

If a CBI component cannot be safely styled without changing behavior, it should fall back toward Bootstrap-compatible native behavior before any visual polish is attempted.

## Stage 2 Direction

Stage 2 must create a separate package:

```text
luci-app-vitrawrt-dashboard
```

Required Stage 2 route:

```text
VitraWrt -> Dashboard
/admin/vitrawrt/dashboard
```

Stage 2 must not replace, redirect, or override:

```text
/admin/status/overview
```

## Support Matrix

| Platform | Package format | Package manager | Notes |
| --- | --- | --- | --- |
| OpenWrt 23.05 | `.ipk` | `opkg` | Supported through legacy and modern-compatible LuCI theme files. |
| OpenWrt 24.10 | `.ipk` | `opkg` | Supported for opkg/ipk based builds. |
| OpenWrt 25.x / SNAPSHOT | `.apk` | `apk` | Supported for apk based package ecosystems. |
| ImmortalWrt 25.x / SNAPSHOT | `.apk` | `apk` | Supported for apk based package ecosystems. |

Modern LuCI uses:

```text
ucode/template/themes/<theme>/*.ut
```

Older LuCI versions may still use:

```text
luasrc/view/themes/<theme>/*.htm
```

This package ships both paths. Modern LuCI should prefer the `ucode` templates, while older trees can still use the `luasrc` templates.

## File Layout

```text
luci-theme-vitrawrt/
├── Makefile
├── README.md
├── htdocs/
│   └── luci-static/
│       ├── resources/
│       │   └── menu-vitrawrt.js
│       └── vitrawrt/
│           ├── cascade.css
│           ├── mobile.css
│           ├── css/
│           ├── js/
│           └── img/
├── luasrc/
│   └── view/themes/vitrawrt/
├── root/
│   └── etc/uci-defaults/30_luci-theme-vitrawrt
├── scripts/
│   ├── detect-package-manager.sh
│   └── dev-deploy.sh
└── ucode/
    └── template/themes/vitrawrt/
```

## Build

Copy this package into an OpenWrt or ImmortalWrt buildroot:

```sh
cp -a /path/to/luci-theme-vitrawrt package/luci-theme-vitrawrt
```

Update and install LuCI feed dependencies:

```sh
./scripts/feeds update luci
./scripts/feeds install luci-base
```

Enable the package:

```sh
make menuconfig
```

Menu path:

```text
LuCI -> Themes -> luci-theme-vitrawrt
```

Build only this package:

```sh
make package/luci-theme-vitrawrt/compile V=s
find bin/packages -name 'luci-theme-vitrawrt_*'
```

Expected output depends on the target package ecosystem:

- opkg/ipk builds produce `luci-theme-vitrawrt_*.ipk`
- apk builds produce `luci-theme-vitrawrt_*.apk`

## Install With opkg/ipk

For OpenWrt 23.05, OpenWrt 24.10, or other opkg based systems:

```sh
scp bin/packages/*/*/luci-theme-vitrawrt_*.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1
opkg install /tmp/luci-theme-vitrawrt_*.ipk
/etc/init.d/uhttpd restart
```

If upgrading an already installed local package:

```sh
opkg install /tmp/luci-theme-vitrawrt_*.ipk --force-reinstall
/etc/init.d/uhttpd restart
```

## Install With apk

For OpenWrt/ImmortalWrt 25.x or SNAPSHOT apk based systems:

```sh
scp bin/packages/*/*/luci-theme-vitrawrt_*.apk root@192.168.1.1:/tmp/
ssh root@192.168.1.1
apk add --allow-untrusted /tmp/luci-theme-vitrawrt_*.apk
/etc/init.d/uhttpd restart
```

Self-built `.apk` packages usually need `--allow-untrusted` unless they are signed by a package key trusted by the router.

## 开发态实体机测试

`scripts/dev-deploy.sh` can deploy Stage 1 theme files directly to a real OpenWrt/ImmortalWrt test device without building an `.ipk` or `.apk` package.

Default target:

```text
root@10.10.10.148
```

Basic deploy:

```sh
./scripts/dev-deploy.sh
```

Deploy, enable the theme, and restart LuCI web service:

```sh
./scripts/dev-deploy.sh --host 10.10.10.148 --user root --enable --restart
```

Deploy only modern LuCI ucode templates:

```sh
./scripts/dev-deploy.sh --modern-only --enable --restart
```

Deploy only legacy Lua view templates:

```sh
./scripts/dev-deploy.sh --legacy-only --enable --restart
```

Rollback to Bootstrap and restart `uhttpd`:

```sh
./scripts/dev-deploy.sh --host 10.10.10.148 --rollback
```

The script deploys:

```text
htdocs/luci-static/vitrawrt/                  -> /www/luci-static/vitrawrt/
htdocs/luci-static/resources/menu-vitrawrt.js -> /www/luci-static/resources/menu-vitrawrt.js
ucode/template/themes/vitrawrt/               -> detected modern LuCI ucode template path
luasrc/view/themes/vitrawrt/                  -> /usr/lib/lua/luci/view/themes/vitrawrt/
```

For modern LuCI templates, the script detects the remote target directory and prefers:

```text
/usr/share/ucode/luci/template/themes/vitrawrt/
```

If the target uses another known LuCI template root, the script uses that path instead. It also backs up the current value of `luci.main.mediaurlbase` to:

```text
/tmp/vitrawrt-mediaurlbase.backup
```

Options:

| Option | Description |
| --- | --- |
| `--host <ip>` | Target host. Default: `10.10.10.148`. |
| `--user <user>` | SSH user. Default: `root`. |
| `--enable` | Set `luci.themes.VitraWrt` and `luci.main.mediaurlbase`. |
| `--restart` | Restart `uhttpd` after deployment. |
| `--rollback` | Restore `/luci-static/bootstrap` and restart `uhttpd`. |
| `--legacy-only` | Deploy only legacy `luasrc` templates. |
| `--modern-only` | Deploy only modern `ucode` templates. |

The deploy script uses `rsync`. If `rsync` is unavailable locally or on the target device, it prints equivalent manual `scp` commands and exits without changing files.

## Package Manager Auto Detection

The repository includes:

```sh
scripts/detect-package-manager.sh
```

Run it on the router:

```sh
sh scripts/detect-package-manager.sh
```

It prints one of:

```text
apk
opkg
unknown
```

Install helper snippet:

```sh
pkg_mgr="$(sh scripts/detect-package-manager.sh)"

case "$pkg_mgr" in
	apk)
		apk add --allow-untrusted /tmp/luci-theme-vitrawrt_*.apk
		;;
	opkg)
		opkg install /tmp/luci-theme-vitrawrt_*.ipk
		;;
	*)
		echo "No supported package manager found" >&2
		exit 1
		;;
esac
```

Equivalent inline detection:

```sh
if command -v apk >/dev/null 2>&1; then
	apk add --allow-untrusted /tmp/luci-theme-vitrawrt_*.apk
elif command -v opkg >/dev/null 2>&1; then
	opkg install /tmp/luci-theme-vitrawrt_*.ipk
else
	echo "No supported package manager found" >&2
	exit 1
fi
```

## Enable Theme In LuCI

LuCI Web UI:

```text
System -> System -> Language and Style -> Design -> VitraWrt
Save & Apply
```

Command line:

```sh
uci set luci.themes.VitraWrt=/luci-static/vitrawrt
uci set luci.main.mediaurlbase=/luci-static/vitrawrt
uci commit luci
/etc/init.d/uhttpd restart
```

Verify:

```sh
uci get luci.main.mediaurlbase
```

Expected:

```text
/luci-static/vitrawrt
```

## Roll Back To Default Theme

Roll back to Bootstrap:

```sh
uci set luci.main.mediaurlbase=/luci-static/bootstrap
uci commit luci
/etc/init.d/uhttpd restart
```

If the web UI is hard to use, run the rollback over SSH.

Remove the package on opkg systems:

```sh
opkg remove luci-theme-vitrawrt
/etc/init.d/uhttpd restart
```

Remove the package on apk systems:

```sh
apk del luci-theme-vitrawrt
/etc/init.d/uhttpd restart
```

## Test Instructions

Basic package checks in the source tree:

```sh
sh -n root/etc/uci-defaults/30_luci-theme-vitrawrt
sh -n scripts/detect-package-manager.sh
sh -n scripts/dev-deploy.sh
node --check scripts/runtime-regression-test.mjs
node scripts/check-css-safety.mjs
```

Theme baseline comparison audit:

```sh
node scripts/theme-baseline-audit.mjs --host 10.10.10.148 --themes bootstrap,argon,vitrawrt
```

This audit switches LuCI between Bootstrap, Argon if installed, and VitraWrt on the same test device, captures screenshots/DOM/layout metrics for native LuCI pages, then restores the original `luci.main.mediaurlbase`. It writes artifacts to `audit-output/theme-baseline/` and the summary report to `docs/THEME_BASELINE_AUDIT.md`.

Runtime compatibility regression on a test router:

```sh
node scripts/runtime-regression-test.mjs --host 10.10.10.148
```

The regression must verify:

- `Status -> Overview` remains `/admin/status/overview` and is not replaced by a VitraWrt dashboard.
- `System -> System` tabs switch one native panel at a time.
- `Network -> Interfaces` and `Network -> Firewall` remain native LuCI pages.
- vnStat/plugin pages keep native tab links and graph images do not overflow.
- LuCI buttons keep visible background, border, and radius.
- `ifacebox` hover-only tooltip content is not visible before hover.

Browser checks after installation:

- Open `/cgi-bin/luci/`
- Confirm the login page renders correctly.
- Log in and confirm the selected theme is `VitraWrt`.
- Confirm desktop shows a floating sidebar with content shifted to the right.
- Confirm mobile width shows a top bar and drawer instead of the desktop sidebar.
- Switch theme mode between System, Light, and Dark.
- Reload the page and confirm the mode persists.
- Visit common LuCI pages: Status, System, Network, Services, and Logs.
- Check forms, tables, buttons, tabs, alerts, and modals for readability.
- Confirm native pages are not redirected to, or visually converted into, a VitraWrt dashboard.

HTTP smoke test:

```sh
curl -I http://192.168.1.1/cgi-bin/luci/
```

Unauthenticated LuCI commonly returns `403` with `x-luci-login-required: yes`, depending on the LuCI version and auth setup.

After login, protected admin pages should return `200 OK` with a valid auth cookie.

## Common Questions

### Does Stage 1 include the VitraWrt dashboard?

No. Stage 1R only includes `luci-theme-vitrawrt`.

### Is Status -> Overview the VitraWrt Dashboard?

No. `Status -> Overview` is the native OpenWrt/LuCI status page and must stay native.

### Where will the VitraWrt Dashboard live?

Stage 2 should add `luci-app-vitrawrt-dashboard` with an independent route such as `/admin/vitrawrt/dashboard`.

### Does this theme read OpenClash, AdGuard Home, MosDNS, FRP, or DDNS data?

No. No third-party service data is fetched or displayed.

### Why are both `ucode` and `luasrc` templates present?

Modern LuCI uses `ucode/template/themes/.../*.ut`. Older LuCI trees may still use `luasrc/view/themes/.../*.htm`. Shipping both keeps the package compatible across current OpenWrt and ImmortalWrt generations.

### Why does apk installation use `--allow-untrusted`?

Local self-built `.apk` packages are usually unsigned from the router's point of view. Use `--allow-untrusted` for local testing, or sign packages for production feeds.

### Can this be installed on a clean LuCI system?

Yes. The only declared LuCI dependency is `luci-base`.

## Known Limitations

- Stage 1R is theme-only; there is no dashboard app or backend library.
- Native LuCI pages are only conservatively restyled; they are not redesigned into VitraWrt Dashboard pages.
- The theme settings controls persist browser-local visual preferences through `localStorage`.
- Very old LuCI versions may need additional compatibility work.
- Visual QA still needs to be performed on real OpenWrt/ImmortalWrt devices and common router browsers.
- Self-built apk packages need signing or `apk add --allow-untrusted`.
