# Stage 1R8 Isolation Notes

Stage 1R8 resets VitraWrt to a conservative LuCI theme foundation:

- Native LuCI pages remain native pages, not VitraWrt Dashboard pages.
- VitraWrt runtime JavaScript does not click, hide, move, wrap, or mutate LuCI
  dynamic components.
- Bootstrap cascade is loaded first as the LuCI behavior baseline. VitraWrt then
  layers tokens, shell layout, sidebar, safe visual skin, and page-scoped layout
  exceptions on top.
- The only tab compatibility rule mirrors LuCI's own `data-tab-active` state. It
  does not infer active tabs and does not dispatch click events.

Known Stage 1R8 limitations:

- `vnStat2` and `/admin/network` first-load tab races are not fixed with fake
  clicks. If an app exposes multiple panels before LuCI sets `data-tab-active`,
  the fix must be app-specific or upstream.
- Native `ifacebox` and network upstream cards keep Bootstrap/LuCI sizing. Stage
  1R8 intentionally does not redesign ifacebox internals or convert Status ->
  Overview into a dashboard.
- Visual polish is intentionally deferred until after LuCI core container
  behavior remains stable.
