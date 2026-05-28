# Stage 1.22 Component DOM Evidence

Evidence source: live host `10.10.10.148`, LuCI 25.12, Stage 1.21 deployed, Playwright WebKit fallback where Chromium was unavailable.

## cbi-dynlist

System page NTP server list:

```text
div#cbid.system.cfg01e48a.server.cbi-dynlist
  div.item
    span                 visible existing item text, e.g. ntp.tencent.com
    input[type=hidden]   stored value, 0x0 visual box
  div.item
  div.item
  div.item
  div.add-item.control-group
    input#widget.cbid.system.cfg01e48a.server.cbi-input-text[type=text]
    div.btn.cbi-button.cbi-button-add
```

Network edit modal also exposes:

```text
div#cbid.network.lan.dns.cbi-dynlist
  div.item
    span                 visible existing DNS value, e.g. 10.10.10.1
    input[type=hidden]
  div.add-item.control-group
    input.cbi-input-text[type=text]
    div.btn.cbi-button.cbi-button-add
```

Selector consequence: style `.cbi-dynlist > .item`, `.cbi-dynlist > .item > span`, `.cbi-dynlist > .item > input[type="hidden"]`, `.cbi-dynlist > .add-item.control-group`, `.cbi-dynlist .cbi-input-text`, `.cbi-dynlist .cbi-button-add`, and any `.cbi-button-remove` when LuCI exposes removable edit state. Do not target lifecycle display.

## cbi-dropdown

System interface dropdown:

```text
div#cbid.system.cfg01e48a.interface.cbi-dropdown
  ul
    li[data-value]       selected/option row, visible first item
    li[data-value]       hidden non-selected item until LuCI opens layout
  script[type=item-template]
  span.more
  span.open              arrow
  div                    sizing helper
```

Apply split button dropdown also uses `div.cbi-dropdown.btn.cbi-button...`; component field styles must exclude `.btn` / `.cbi-button` dropdowns so the apply split keeps button behavior.

Selector consequence: style `div.cbi-dropdown:not(.btn):not(.cbi-button)`, direct `> ul`, direct `> ul > li`, `.more`, `.open`, and inputs inside dropdown. Do not force `display`, `visibility`, `open`, or selected state.

## Modal Tabs

Network edit modal:

```text
div.modal.cbi-modal
  ul.cbi-tabmenu
    li.cbi-tab
      a
    li.cbi-tab-disabled
      a
    li.cbi-tab-disabled[display=none]
      a
```

Two tab menus may appear in one modal. Current Stage 1.21 tab links are 43px high while the `ul.cbi-tabmenu` itself is 33px high, which creates overlap and strip residue risk.

Selector consequence: modal `ul.cbi-tabmenu` owns no background/border/strip. `li` owns no surface. `a` owns the pill. Modal density should be smaller than page tabs and line-height must keep the link inside the wrapper.

## Progressbar

Status overview:

```text
div.cbi-progressbar
  div                 anonymous fill node; width encodes LuCI value
```

Observed outer width: about 677px, height 18px. Fill node width changes with actual value. Fill node has no class.

Selector consequence: style `.cbi-progressbar` as meter track and `.cbi-progressbar > div` as fill. Preserve widths and values; do not add JS.

## Sidebar Menu Row

Expanded sidebar:

```text
div.vwrt-menu-row
  a
    span.vwrt-menu-icon
    span.vwrt-menu-label
  button.vwrt-menu-expander
```

Child rows omit the expander. Stage 1.21 evidence still shows active child `a` with background and border while parent row also has state material.

Selector consequence: hover/active background belongs to `.vwrt-menu-row`; `a` and `.vwrt-menu-expander` must be transparent children. Active/selected classes must not be removed by JS.

