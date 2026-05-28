# Stage 1.22 Unused / Deprecated CSS Cleanup Audit

This audit was added during the Stage 1.22 continuation pass. It checks deprecated or historical CSS files before any cleanup decision. No CSS file is deleted in this stage.

## Scope

Files explicitly audited:

- `htdocs/luci-static/vitrawrt/css/luci-visual.css`
- `htdocs/luci-static/vitrawrt/css/luci-native.css`
- `htdocs/luci-static/vitrawrt/css/luci-reset.css`
- `htdocs/luci-static/vitrawrt/css/luci-safe.css`

References checked:

- `htdocs/luci-static/vitrawrt/cascade.css`
- `ucode/template/themes/vitrawrt/header.ut`
- `luasrc/view/themes/vitrawrt/header.htm`
- `Makefile`
- `README.md`
- `docs/`
- `scripts/`
- `htdocs/`
- `ucode/`
- `luasrc/`

Command used:

```sh
rg -n "luci-(visual|native|reset|safe)\.css" .
rg -n "luci-static/vitrawrt/css|css/.*\.css|luci-(visual|native|reset|safe)" Makefile README* docs scripts htdocs ucode luasrc
```

## Import And Template Result

`cascade.css` currently imports only:

- `/luci-static/bootstrap/cascade.css?v=1.22-base`
- `./css/tokens.css?v=1.22`
- `./css/light.css?v=1.22`
- `./css/dark.css?v=1.22`
- `./css/base.css?v=1.22`
- `./css/sidebar.css?v=1.22`
- `./css/luci-components-visual.css?v=1.22`
- `./css/luci-layout-exceptions.css?v=1.22`
- `./css/responsive.css?v=1.22`

`header.ut` and `header.htm` reference only `cascade.css?v=1.22`, theme scripts, and theme icon assets. They do not directly reference `luci-visual.css`, `luci-native.css`, `luci-reset.css`, or `luci-safe.css`.

No JavaScript file dynamically loads these deprecated CSS files.

## File Status Matrix

| File | Current import status | Non-import references | Audit / script dependency | Status | Cleanup decision |
|---|---|---|---|---|---|
| `luci-visual.css` | not imported | referenced by `README.md`, `docs/ARCHITECTURE.md`, Stage 1.11/1.22 docs, `scripts/check-css-safety.mjs`, `scripts/visual-direction-audit.mjs` report text | `check-css-safety.mjs` explicitly treats it as a deprecated/removed owner and guards against re-import | not imported but referenced by docs/scripts; deprecated historical fallback | retain for now; safe-to-archive candidate only after README/docs/script wording is updated |
| `luci-native.css` | not imported | referenced by `README.md`, `docs/ARCHITECTURE.md`, Stage 1.22 docs, `scripts/check-css-safety.mjs`, and a comment inside the file | safety check rejects re-import of this deprecated file | deprecated historical fallback | retain for now; safe-to-archive candidate, not safe-to-delete in this pass |
| `luci-reset.css` | not imported | referenced by `docs/ARCHITECTURE.md`, Stage 1.22 docs, and `scripts/check-css-safety.mjs` | safety check rejects re-import of this deprecated file | deprecated historical fallback | retain for now; safe-to-archive candidate, not safe-to-delete in this pass |
| `luci-safe.css` | not imported | referenced by `README.md`, `docs/ARCHITECTURE.md`, Stage 1.22 docs, and `scripts/check-css-safety.mjs` | safety check rejects re-import of this deprecated file | deprecated historical fallback | retain for now; safe-to-archive candidate, not safe-to-delete in this pass |

## Decisions

- `luci-visual.css` has been removed from the live cascade and no longer owns LuCI component visuals.
- `luci-components-visual.css` is the active LuCI component visual owner for Stage 1.22.
- `luci-native.css`, `luci-reset.css`, and `luci-safe.css` remain unimported deprecated fallback files.
- The files are retained because documentation and audit scripts still reference them as historical or safety-boundary artifacts.
- No file is moved to `docs/archive/css/` in this pass because doing so would create documentation/script drift and is unnecessary for runtime safety.

## Future Cleanup Path

Safe archive flow for a later stage:

1. Update `README.md` and `docs/ARCHITECTURE.md` to state that `luci-components-visual.css` is the sole component owner.
2. Keep `scripts/check-css-safety.mjs` rejecting deprecated imports by filename, even if the physical files are archived.
3. Move deprecated CSS files to `docs/archive/css/` only after packaging and install rules are checked.
4. Re-run `node scripts/check-css-safety.mjs` and verify no package/audit script expects the files in `htdocs/luci-static/vitrawrt/css/`.

Safe-to-delete status:

- None of the four files is marked safe-to-delete in Stage 1.22.
- All four are safe-to-archive candidates only after documentation and script references are intentionally updated.
