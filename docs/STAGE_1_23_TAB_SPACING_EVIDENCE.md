# Stage 1.23 Tab Spacing Evidence

Evidence source:

- Host: `10.10.10.148`
- Script: temporary Playwright evidence collector
- Raw data: `audit-output/stage-1.23-evidence/stage-1.23-evidence.json`
- Screenshots: `audit-output/stage-1.23-evidence/`

LuCI safety rule: tab switching was performed only by the Playwright audit. Theme code must not fake clicks, force active tabs, or force show/hide tab panels.

## Measured Pages

| Page URL | Tab labels measured | Gap results | Screenshot evidence | Suspected CSS / DOM cause | Final fix strategy |
|---|---|---:|---|---|---|
| `/cgi-bin/luci/admin/network/routes` | `静态 IPv4 路由`, `静态 IPv6 路由`, `IPv4 规则`, `IPv6 规则` | all `10px` | `audit-output/stage-1.23-evidence/light-network-routes-tab-*.png` | Core CBI tab spacing is stable on Stage 1.22. Hidden tab panels exist but do not affect measured active content gap. | No global fix. Keep tab lifecycle untouched. |
| `/cgi-bin/luci/admin/network/network` | `接口`, `设备`, `全局网络选项` | all `10px` in light and dark | `audit-output/stage-1.23-evidence/light-network-network-tab-*.png`, `dark-network-network-tab-*.png` | Core CBI tab spacing is stable. Separate page-specific slab/rhythm issues remain inside active panels. | Fix network card/slab rhythm page-scoped only. |
| `/cgi-bin/luci/admin/network/dhcp` | `租约`, `dnsmasq`, `odhcpd` plus nested dnsmasq tabs | all measured `10px`, but nested tab clicks kept active parent text as `odhcpd` | `audit-output/stage-1.23-evidence/light-network-dhcp-tab-*.png` | Nested tabs share LuCI tab markup; the collector hit visible nested labels after parent tabs. No cumulative vertical growth was measured. | Do not crush global `.cbi-section` margins. Keep page tabs lighter visually only. |
| `/cgi-bin/luci/admin/status/vnstat2` | `图表`, `配置`, `摘要`, `顶部`, `5 分钟`, `每小时`, `每天`, `每月`, `按年` | `94px` on 图表, `108px` on later tab clicks | `audit-output/stage-1.23-evidence/light-vnstat2-tab-*.png` | vnStat2 combines plugin graph tabs and CBI config tabs. The first visible content is pushed by plugin tab/graph wrappers; current page-scoped rule only targets `.cbi-section[data-tab]`, not all graph wrapper spacing. | Page-scoped `body.vwrt-page-vnstat2` spacing fix for tab wrappers and graph/config containers only. Do not recolor or filter graph images/canvas. |

## Active Selectors Observed

- Tab links: `#maincontent .cbi-tabmenu a`, `#maincontent .tabs a`, `#tabmenu a`
- Core active tab parent: `li.cbi-tab`
- vnStat2 active tab parent examples: `tabmenu-item-graphs active cbi-tab`, `tabmenu-item-config active cbi-tab`
- Active content candidates:
  - routes: `div#cbi-network-route.cbi-section.cbi-tblsection`
  - network: `div#cbi-network-interface.cbi-section.cbi-tblsection`
  - DHCP: `div#cbi-dhcp-__leases__.cbi-section`
  - vnStat2 graph: `div.cbi-section`
  - vnStat2 config: `div#cbi-vnstat-vnstat.cbi-section`

## Acceptance Target

- Core pages should stay within the observed `10px` gap.
- vnStat2 should reduce the current `94-108px` gap to a visually similar rhythm without touching graph rendering internals.
- No lifecycle CSS such as forced `display`, `visibility`, `[hidden]`, `.hide`, or tab state overrides may be introduced.

## Final Stage 1.23 Verification

Final audit output: `audit-output/visual-direction-1.23/20260526-224900/`

- `/cgi-bin/luci/admin/network/routes`: light and dark tab gaps stayed at `10px` for all four tabs.
- `/cgi-bin/luci/admin/network/network`: light and dark tab gaps stayed at `10px` for `接口`, `设备`, and `全局网络选项`.
- `/cgi-bin/luci/admin/network/dhcp`: light and dark tab gaps stayed at `10px` across the visible top-level and nested dnsmasq/odhcpd tab links captured by the audit.
- `/cgi-bin/luci/admin/status/vnstat2`: `图表` measured `96px` and `配置` measured `108px`. The variance is within the 12px Stage 1.23 threshold, but the absolute graph-wrapper gap remains a known visual limitation for a future vnStat2-specific rhythm pass.

No tab lifecycle CSS or theme-side fake interaction was added.
