# VitraWrt Theme Page Matrix

Each row describes a native LuCI page or common plugin page type. `Preview file` points to the static visual target under `previews/pages/`.

## A. Auth / Session

| Page | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login page | auth template | `/cgi-bin/luci/` | logo, username/password, submit | glass auth card, accent button, readable error area | form action, input names, auth flow | Bootstrap login field behavior | calm premium entry, no oversized watermark | `01-login.html` |
| Login failed | auth error state | `/cgi-bin/luci/` after failed auth | alert, form | warning/danger glass alert | error visibility, field names | Bootstrap error persistence | clear but non-alarming failure | `01-login.html` |
| Session timeout dialog | modal/session | any protected route after timeout | modal, buttons | modal surface, warning tone | timeout logic, close/redirect actions | Bootstrap modal behavior | glass dialog with explicit action | `19-components.html` |
| Loading view | async view | dynamic LuCI view load | `.spinning`, loading text | loading card, spinner accent | loading lifecycle, hidden/display | Bootstrap view replacement timing | quiet loading state | `19-components.html` |
| Applying changes dialog | apply overlay | after save/apply | modal/progress/buttons | apply modal surface, progress, accent action | apply state machine | Bootstrap apply flow | high-confidence operation feedback | `19-components.html` |

## B. Status

| Page | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Overview | native status view | `/admin/status/overview` | system table, memory/storage progress, ifacebox, network card | section glass, progress skin, ifacebox shell | native overview IA, ifacebox hover tooltips | Bootstrap/Argon hover and table metrics | native overview with VitraWrt polish, not dashboard | `02-status-overview.html` |
| Routes | table status view | `/admin/status/routes` | route tables, tabs/filters | table header/row skin, scroll containment if needed | route table layout, routes content | Bootstrap route table width | readable dense routing data | `03-status-routes.html` |
| Firewall / nftables | log/table status view | `/admin/status/nftables` | rule text, table/list, code blocks | code surface, table tone | rule rendering, pre/code wrapping logic | Bootstrap nftables readability | technical text remains scannable | `14-network-firewall.html` |
| System Log | log page | `/admin/status/syslog` | filter form, log pre/textarea | form skin, log panel | filter submit, log refresh | Bootstrap log width >= 70% main | terminal-like but calm log surface | `05-status-logs.html` |
| Kernel Log | log page | `/admin/status/dmesg` | log pre | log panel | content, wrapping | Bootstrap log width | readable diagnostic text | `05-status-logs.html` |
| Processes | action table | `/admin/status/processes` | process table, action buttons | table tone, compact buttons | kill/reload actions, table columns | Bootstrap process table fit | dense operations table without button stretching | `04-status-processes.html` |
| Realtime Information | graph/status view | `/admin/status/realtime` | charts, tabs, legends | chart panels, legend color | refresh loop, chart canvas | Bootstrap chart visibility | native realtime with glass frames | `19-components.html` |
| vnStat2 / Traffic Monitor | plugin chart page | `/admin/status/vnstat2` | plugin tabs, graph images | image container, tab visual skin | plugin tab init, image script, first-load state | Bootstrap/Argon tab behavior | traffic graphs inside restrained glass shell | `06-status-vnstat.html` |

## C. System

| Page | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| System | CBI form | `/admin/system/system` | tabs, inputs, dynlist, apply area | section cards, form skin, tabs skin | tab switching, dynlist add/remove, apply lifecycle | Bootstrap CBI behavior | settings page looks premium but remains native | `07-system-system.html` |
| Administration | CBI/security form | `/admin/system/admin` | password fields, SSH keys, ACL | form skin, danger/warning alerts | password field names, SSH key handling | Bootstrap form behavior | secure admin controls with clear hierarchy | `08-system-administration.html` |
| Software / Packages | package list/table | `/admin/system/package-manager` | search, tabs, package rows, action buttons | search input, natural-size buttons | package actions, apk/opkg behavior | Bootstrap/Argon button metrics | package manager remains list-first | `09-system-packages.html` |
| Startup | action table | `/admin/system/startup` | service table, enable/start buttons | table column rhythm, compact action buttons | init script actions | Bootstrap startup table alignment | operational table, no over-stretched buttons | `10-system-startup.html` |
| Scheduled Tasks | text/config page | `/admin/system/crontab` | textarea, save/apply | code textarea, action area | cron text content and save | Bootstrap textarea width | editor-like system surface | `07-system-system.html` |
| Mount Points | CBI table/form | `/admin/system/mounts` | disk table, form rows, buttons | table/card skin | disk actions, mount logic | Bootstrap CBI layout | storage settings remain native | `18-nas-network-share.html` |
| Backup / Flash Firmware | system action page | `/admin/system/flash` | upload, buttons, warning alerts | upload card, warning glass | file input, flash flow | Bootstrap flash warnings | clear risky operation hierarchy | `19-components.html` |
| Reboot | confirm action page | `/admin/system/reboot` | confirm button, warning | danger/confirm surface | reboot action | Bootstrap confirmation | explicit high-risk action | `19-components.html` |

## D. Network

| Page | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Interfaces | native network list | `/admin/network/network` | interface cards/tables, action buttons | interface shell, action buttons, tabs | list actions, card dimensions | Bootstrap/Argon network metrics | professional network list, not topology dashboard | `11-network-interfaces.html` |
| Interface Edit Modal | CBI modal | `/admin/network/network` edit | modal, tabs, form, dropdown, dynlist | modal surface, form skin | modal open/close, tab/dropdown/dynlist behavior | Bootstrap modal lifecycle | native modal with Vitra shell | `12-network-interface-edit-modal.html` |
| Devices | network list | `/admin/network/devices` | device table/cards | table/card skin | device actions | Bootstrap width | clear device inventory | `11-network-interfaces.html` |
| DHCP/DNS | CBI form/table | `/admin/network/dhcp` | forms, tables, dynlist | form/table skin | leases/static host logic | Bootstrap CBI behavior | dense but readable config | `13-network-dhcp-dns.html` |
| Firewall | rule tables/forms | `/admin/network/firewall` | tabs, zone table, rule tables | table skin, badges, danger buttons | rule order/actions, modal logic | Bootstrap firewall layout | serious rule editor, no dashboard rewrite | `14-network-firewall.html` |
| Routing | route tables/forms | `/admin/network/routes` | static route tables | table/form skin | route add/remove | Bootstrap route table | compact technical controls | `03-status-routes.html` |
| Diagnostics | command form | `/admin/network/diagnostics` | inputs, action buttons, result pre | form/action/result panel | command execution flow | Bootstrap diagnostics behavior | clear network toolbox | `13-network-dhcp-dns.html` |

## E. Services / Plugins

| Page | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OpenClash | plugin dashboard/config | `/admin/services/openclash` | status cards, tabs, config tables | card/table/form skin only | plugin JS, service data, polling | Plugin/Argon comparison | plugin page feels integrated without data rewrite | `15-services-openclash.html` |
| AdGuard Home | plugin config/external entry | `/admin/services/AdGuardHome` | status, buttons, iframe/external link | entry card, form/table skin | external app link, service status | Plugin native behavior | bridge page looks Vitra but stays plugin-owned | `16-services-adguardhome.html` |
| MosDNS | config-heavy plugin | `/admin/services/mosdns` | CBI forms, logs, buttons | CBI skin, log panel | daemon config behavior | Bootstrap CBI behavior | readable service config | `17-services-mosdns.html` |
| DDNS | table/form plugin | `/admin/services/ddns` | service table, edit modal | table/action skin | DDNS actions | Bootstrap action table | service list with compact actions | `19-components.html` |
| FRP | config-heavy plugin | `/admin/services/frp` | tabs, forms, tables | CBI skin | tunnel config logic | Bootstrap CBI | structured tunnel config | `19-components.html` |
| NAS / Network Share | wide config table | `/admin/services/samba4` or `/admin/nas/*` | wide share table, path inputs | page-scoped overflow, button skin | share actions, table columns | Bootstrap/Argon wide-table metrics | wide table safely contained | `18-nas-network-share.html` |
| qBittorrent | plugin/external app entry | `/admin/services/qbittorrent` | status, external link, config | entry card/form skin | external app behavior | plugin native behavior | integrated entry, no iframe restyle | `19-components.html` |
| Transmission | plugin table/config | `/admin/services/transmission` | CBI form, status | form/card skin | daemon actions | Bootstrap CBI | native service config | `19-components.html` |
| Disk / Mount / Storage plugin | table-heavy plugin | plugin-specific | disk tables, progress, action buttons | progress/table skin | disk actions | Bootstrap disk table | serious storage management surface | `18-nas-network-share.html` |

## F. Component Patterns

| Pattern | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tabs | nav/CBI/plugin | many | `.tabs`, `.cbi-tabmenu` | segmented glass skin | panel display/hidden, active logic | Bootstrap click behavior | pill tabs without lifecycle changes | `19-components.html` |
| Forms | CBI | many | labels, inputs, help text | input/select/textarea skin | CBI value layout, validation | Bootstrap CBI behavior | quiet glass controls | `19-components.html` |
| Select | native/CBI | many | select/dropdown | shell skin | option display | Bootstrap dropdown behavior | modern shell, native choices | `19-components.html` |
| Dropdown | CBI custom | system/network | `.cbi-dropdown` | border/radius/background | open/close classes | Bootstrap dropdown lifecycle | integrated custom dropdown shell | `19-components.html` |
| Dynlist | CBI dynamic list | system/dhcp | `.cbi-dynlist` | item shell/buttons | add/remove/up/down | Bootstrap dynlist lifecycle | compact repeatable list | `19-components.html` |
| Buttons | actions | all | `.btn`, `.cbi-button` | primary/secondary/danger skin | action click behavior | Bootstrap button flow | consistent action language | `19-components.html` |
| Apply area | CBI apply | config pages | save/apply/reset | glass action area | apply display lifecycle | Bootstrap apply state | product-grade save area | `19-components.html` |
| Tables | native/table | status/system/network | table, action cells | colors, rows, headers | table layout globally | Bootstrap widths | dense but polished data | `19-components.html` |
| Progress bars | status | overview/packages | progress bars | track/fill skin | value/width calculation | Bootstrap value display | precise resource readouts | `19-components.html` |
| Badges | status/service | many | status tags | badge skin | status data | native values | calm state labels | `19-components.html` |
| Alerts | warning/error | all | `.alert-message` | glass warning/danger | visibility and meaning | Bootstrap alert lifecycle | readable system alerts | `19-components.html` |
| Modal / dialog | dialogs | edit/apply/session | modal content/buttons | modal surface | open/close/position lifecycle | Bootstrap modal behavior | Vitra dialog surface | `12-network-interface-edit-modal.html` |
| Loading spinner | async | dynamic views | `.spinning` | loading card/spinner | loading lifecycle | Bootstrap async flow | quiet loading feedback | `19-components.html` |
| Ifacebox / interface badge | status overview | overview | ifacebox, badge tooltip | shell/badge skin | hover tooltip | Bootstrap/Argon hover | native port card with subtle polish | `02-status-overview.html` |
| Sidebar expanded | shell | all | menu, submenus, controls | glass shell/icons/active | menu routing | current sidebar regression | premium navigation console | `02-status-overview.html` |
| Sidebar collapsed | shell | all | icons, tooltip | icon clarity/tooltip | menu routing | current sidebar regression | compact but identifiable nav | `20-sidebar-collapsed.html` |
| Mobile drawer | responsive shell | all | topbar, drawer | drawer shell | mobile routing | mobile LuCI access | usable touch navigation | `21-mobile.html` |

## G. Responsive / Theme Modes

| Mode | LuCI page type | Typical route | Core components | Safe visual targets | Must-not-touch behaviors | Baseline requirement | VitraWrt design goal | Preview file |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light desktop | all | all | shell/sidebar/content | light glass surfaces | page behavior | Bootstrap layout metrics | calm ice-blue console | `02-status-overview.html` |
| Dark desktop | all | all | shell/sidebar/content | dark graphite glass | page behavior | Bootstrap layout metrics | readable low-glow console | `22-dark-mode.html` |
| Collapsed sidebar desktop | shell | all | icon nav/tooltip | collapsed icon system | routing/menu state | current regression test | compact power-user nav | `20-sidebar-collapsed.html` |
| Tablet layout | responsive | all | narrower shell/drawer | spacing/touch targets | CBI behavior | Bootstrap mobile behavior | usable mid-size router admin | `21-mobile.html` |
| Mobile layout | responsive | all | topbar/drawer/tables | touch navigation, contained tables | form and table logic | Bootstrap mobile behavior | no horizontal breakage | `21-mobile.html` |

