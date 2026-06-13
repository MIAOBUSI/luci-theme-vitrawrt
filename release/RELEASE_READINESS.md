# Release Readiness

## 1. Release boundary

This release contains the VitraWrt LuCI theme, its Vite/TailwindCSS source, compiled runtime assets, modern ucode templates, packaging metadata, release scripts, README, license, screenshots, and concise verification records. No visual redesign was performed during release readiness.

## 2. Visual freeze point

- Freeze: Pass 28
- Release marker: `1.41.90-r30`
- Dashboard: untouched

## 3. Files included

- `frontend/` source and lockfile
- `htdocs/luci-static/vitrawrt/cascade.css`
- `htdocs/luci-static/vitrawrt/dist/`
- Theme images and menu icons
- `ucode/template/themes/vitrawrt/`
- Package lifecycle metadata and UCI defaults
- Release packaging whitelist and build script
- Public README, LICENSE, screenshots, and release verification summaries

## 4. Files excluded

- Pass reports and development notes
- Evidence directories, traces, raw screenshots, and audit output
- Development deployment and temporary audit scripts
- Deprecated bridge CSS and standalone runtime JavaScript
- Legacy preview pages and local build caches
- `node_modules`, package artifacts, logs, and temporary files

## 5. README and screenshots

The public README is release-oriented and contains installation, source build, compatibility, scope, and license information. Five current-router screenshots are included and were checked for device-specific or account information.

## 6. opkg/ipk matrix

Pass. A real IPK was built and tested with OpenWrt 24.10.7 opkg in an isolated root. Install, uninstall, and reinstall completed successfully. Core hashes match the development payload and runtime residual count after uninstall was zero.

## 7. apk matrix

Pass. A real APK v3 package was built with the OpenWrt 25.12.4 SDK and apk-tools 3.0.5. Clean install, uninstall, and reinstall completed successfully on an apk-based test system. Package-owned runtime files use `root:root`.

## 8. Router installed payload hash

Pass. All 37 runtime files under the static and ucode payload paths match the development manifest. The installed version and runtime marker are `1.41.90-r30`.

## 9. Dashboard untouched proof

`git diff --name-only | rg -i 'dashboard|dash'` returned no paths. The release screenshots avoid the separate Dashboard application and use native LuCI pages.

## 10. Runtime bridge CSS zero proof

The runtime bridge CSS directory contains zero files. Package file lists contain no bridge CSS path, and the deleted bridge URL returns HTTP 404 after package installation.

## 11. Sensitive scan

Pass. No private test address, local home path, personal identifier, credential, or blank-credential instruction is present in the published files. Broad `root` and `password` matches were reviewed as normal source semantics.

## 12. GitHub commit hash

Validated source commit: `8a4d9a18a4e888159f1a07fc6b61b3c2061fa273`

## 13. GitHub push result

Success. The validated source commit was pushed to `origin/main`.

## 14. Known risks

- Self-built APK artifacts are unsigned and require a trusted release signature or `--allow-untrusted`.
- Third-party LuCI plugins may require targeted compatibility work.
- Package artifacts are intentionally excluded from Git and still need to be attached to a GitHub Release.

## 15. Next release steps

Create the `1.41.90-r30` Git tag and GitHub Release, attach the verified IPK and APK artifacts, publish checksums, and sign release artifacts where applicable.
