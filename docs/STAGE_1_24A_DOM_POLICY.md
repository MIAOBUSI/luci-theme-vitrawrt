# Stage 1.24A DOM Policy

Stage 1.24A continues from Stage 1.23. The goal is not to ban all DOM work forever; the rule is to separate VitraWrt-owned shell DOM from LuCI-owned runtime DOM.

## Theme-Owned DOM

VitraWrt may redesign and restructure theme-owned areas:

- header shell
- footer shell
- sidebar and theme control dock
- login page shell
- page background
- outer shell wrappers created by VitraWrt templates
- theme-owned navigation containers and tooltips

Allowed work in those areas includes adding/removing/restructuring theme-owned nodes, adding local SVG/icons, and creating non-interactive visual containers.

## LuCI-Owned DOM

LuCI-owned DOM includes CBI maps/sections/values, `.cbi-dropdown`, `.cbi-dynlist`, `.cbi-tabmenu`, LuCI tables, modal body internals, apply lifecycle nodes, ifacebox internals, and plugin-generated forms/tables/logs.

Forbidden work on LuCI-owned DOM:

- moving existing nodes
- wrapping rendered CBI nodes after render
- replacing input/select/button/dropdown/dynlist/table nodes
- rewriting containers with `innerHTML`
- cloning controls
- deleting controls
- forcing display/hidden/active state
- fake clicking or dispatching interaction events
- MutationObserver layout transformation
- changing form values, UCI, RPC, or LuCI lifecycle state

## Safe Enhancement

Allowed on LuCI-owned DOM:

- CSS-first visual styling
- passive CSS classes or `data-*` attributes
- body/page route classes
- CSS pseudo-elements
- theme-owned wrapper only when created before LuCI renders, or when lifecycle risk is documented and regression-tested
- optional LuCI UI prototype hook only when it adds passive classes/data, returns the same element, and is documented before implementation

Preferred order:

1. CSS-first.
2. Passive page/body/component class annotation.
3. Theme-owned wrapper created by templates.
4. LuCI prototype class hook only with evidence.
5. Never use fake interaction repair.

## Stage 1.24A Decision

No JS enhancement is needed for Stage 1.24A.

- vnStat2 rhythm can be adjusted with page-scoped CSS under `body.vwrt-page-vnstat2`.
- Progress meter polish can be done with existing `.cbi-progressbar > div` and `progress` selectors.
- No passive class injection is required.
- No theme-owned wrapper is needed.
- No LuCI prototype hook is used.

