# Real Device DOM & CSS Audit

Stage 1.8A is an evidence-only audit pass for VitraWrt on a real ImmortalWrt/OpenWrt LuCI device.

This stage does not change CSS, templates, dashboard code, rpcd/ubus code, or third-party service integrations. It captures the deployed theme loading chain and the actual LuCI HTML/class structure so later fixes can target the real DOM instead of guessing.

## Target

Default target:

```text
root@10.10.10.148
```

LuCI default login:

```text
user: root
password: empty
```

## Run

```sh
./scripts/audit-real-device.sh --host 10.10.10.148
```

Optional arguments:

```sh
./scripts/audit-real-device.sh \
	--host 10.10.10.148 \
	--user root \
	--luci-user root \
	--luci-password '' \
	--output-dir audit-output/manual-run
```

## Generated Artifacts

By default, artifacts are written to:

```text
audit-output/<host>-<timestamp>/
```

Key files:

```text
ssh-audit.txt
login-get.html
login-post.html
html/status-overview.html
html/system-system.html
html/status-iptables.html
html/status-overview.headers
html/system-system.headers
html/status-iptables.headers
dom-classes.md
summary.txt
cookies.txt
```

## SSH Evidence

The SSH part captures:

1. Current `luci.main.mediaurlbase`.
2. `/www/luci-static/vitrawrt` file tree.
3. Full deployed `/www/luci-static/vitrawrt/cascade.css` content.
4. Modern `ucode` template path and file list.
5. Legacy `luasrc` template path and file list.
6. `vitrawrt`, `VitraWrt`, `cascade.css`, `menu-vitrawrt`, and `data-vitrawrt` resource references.

## curl Evidence

The curl part logs into LuCI with the configured credentials and captures:

```text
/cgi-bin/luci/admin/status/overview
/cgi-bin/luci/admin/system/system
/cgi-bin/luci/admin/status/iptables
```

The captured HTML is used as the source of truth for current LuCI DOM classes and structure.

## DOM Class Extraction

The helper can be run directly against saved HTML:

```sh
node scripts/extract-dom-classes.mjs \
	audit-output/<run>/html/status-overview.html \
	audit-output/<run>/html/system-system.html \
	audit-output/<run>/html/status-iptables.html
```

It reports:

- Class frequency.
- Page counts for tables, forms, inputs, buttons, alerts, ifaceboxes, and tabs.
- Structural snippets for:
  - `cbi-map`
  - `cbi-section`
  - `cbi-section-node`
  - `cbi-section-table`
  - `ifacebox`
  - `ifacebox-head`
  - `ifacebox-body`
  - `ifacebox-network`
  - `network-status-table`
  - `tabs`
  - `cbi-tabmenu`
  - `cbi-tab`
  - `cbi-tab-disabled`
  - `alert-message`
  - `alert`
  - `table`
  - `tr`
  - `td`
  - `th`
  - `form`
  - `cbi-value`
  - `cbi-value-title`
  - `cbi-value-field`

## What To Look For

Use the generated reports to answer:

- Is `luci.main.mediaurlbase` really `/luci-static/vitrawrt`?
- Is deployed `cascade.css` the expected version and import chain?
- Is LuCI using modern `ucode` templates or legacy `luasrc` templates?
- Are theme CSS/JS/logo/menu resources referenced in deployed templates?
- What exact classes wrap status overview, system tabs, firewall/iptables tables, alerts, forms, and ifacebox port status?
- Are the system tabs rendered as anchors, buttons, nested `ul`, or LuCI CBI tab classes?
- Is the ifacebox structure table-based, flex-like, or nested in another status container?

Only after this audit should Stage 1.8B make targeted CSS or template fixes.
