# Human Visual Reproduction Guide

Stage 0C treats automated output as trustworthy only when Playwright screenshots match the human screenshot.

## Manual Steps

1. Open an incognito/private browser window.
2. Clear site data for the router host if using a normal browser window.
3. Visit the exact path, for example:
   - `http://10.10.10.148/cgi-bin/luci/admin/network`
   - `http://10.10.10.148/cgi-bin/luci/admin/status/vnstat2`
4. Log in as `root` with an empty password if prompted.
5. Do not click any tab.
6. Capture an immediate screenshot.
7. Wait 5 seconds and capture another screenshot.
8. Click another tab, then click the original tab again.
9. Capture the restored-state screenshot.

## Playwright Matching Steps

Use the same viewport as the real browser window:

```sh
node scripts/tab-first-load-audit.mjs --host 10.10.10.148 --profile clean --viewport 1920x1080 --headed --pause
node scripts/tab-first-load-audit.mjs --host 10.10.10.148 --profile persistent --viewport 1920x1080 --headed --pause
```

For laptop-sized windows, replace the viewport, for example:

```sh
node scripts/tab-first-load-audit.mjs --host 10.10.10.148 --profile clean --viewport 1512x982 --headed --pause
```

## Trust Rule

- Playwright screenshots must match the human screenshot before using the audit as a CSS or JS repair basis.
- If screenshots differ, do not continue styling fixes from the automated metrics alone.
- Compare clean profile, persistent profile, headed mode, paused observation, and cache-busting runs before drawing a conclusion.

## Common Mismatch Causes

- viewport differs from the human browser size
- cache, cookies, or localStorage differ between clean and persistent profiles
- LuCI dynamic view timing differs from the manual screenshot moment
- the tested route differs from the human route or redirects differently
- LuCI async rendering race is intermittent
- browser engine or font/layout differences change the visible first frame
