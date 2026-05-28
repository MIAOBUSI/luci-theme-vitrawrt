# Stage 1.22 Selector Fix Matrix

| Component | Problem | Final selector strategy | Allowed properties | Forbidden properties |
|---|---|---|---|---|
| CSS imports | duplicate `luci-visual.css` ownership | remove `luci-visual.css` import from `cascade.css` | import order/version | deleting historical file |
| tokens | mixed namespaces | final `--vw-*` role layer; legacy aliases only | custom properties | new `--vitra-*` component rules |
| sidebar row | hover/active split between `a` and chevron | `.selected > .vwrt-menu-row`, `.active > .vwrt-menu-row`; transparent `a`/expander | background, border, shadow, color, opacity | removing active/selected classes |
| sidebar pruning | JS removes active/selected | prune only theme-owned `expanded` | classList remove `expanded` only | removing `active`, `selected` |
| `.cbi-value` | over-cardified rows | lightweight row with separator; section owns card | padding, gap, border-bottom, display flex | heavy row background/shadow by default |
| normal fields | oversized broad controls | field token with 38-40px normal height | min-height, padding, border, bg | global width forcing |
| modal fields | same as normal but slightly compact | `.modal ...` 36-38px | min-height/padding | lifecycle visibility |
| table/plugin fields | need compact density | table/plugin page scoped 30-34px | min-height/padding | global table layout |
| cbi-dropdown | wrapper-only styling incomplete | `div.cbi-dropdown:not(.btn):not(.cbi-button) > ul > li` | background, border, radius, padding, color | force display/visibility |
| cbi-dynlist | real item rows are `.item > span + hidden input` | style `.item`, `.item > span`, `.add-item.control-group`, add/remove buttons | background, border, gap, padding | hide controls, alter input values |
| modal tabs | rectangular strip residue | zero wrapper and li surface; smaller `a` pill | background, border, radius, height | force tab panel display |
| progress | flat recolored LuCI bar | `.cbi-progressbar` track, `> div` fill | height, bg, shadow | JS value redraw |
| apply dock | bulky/detached | compact island and natural buttons | width fit-content, gap, padding | force show |
| loading/session dialogs | native sheet | `.modal`, `.dialog`, `.ui-dialog`, `.modal-overlay` | material, text, button skin | close/apply behavior |
| overview info table | too raw | `body.vwrt-page-overview` read-only table rows only | separators, row surface, text | package/process/startup selectors |
| OpenClash/MosDNS | raw plugin blue/card look | `body.vwrt-page-openclash`, `body.vwrt-page-mosdns`, `body.vwrt-page-plugin` | page-scoped card/button/log skin | plugin JS or global table rules |

