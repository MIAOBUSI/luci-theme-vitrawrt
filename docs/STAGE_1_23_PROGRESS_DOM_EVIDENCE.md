# Stage 1.23 Progress DOM Evidence

Evidence source:

- Raw data: `audit-output/stage-1.23-evidence/stage-1.23-evidence.json`
- Screenshots: `audit-output/stage-1.23-evidence/light-status-overview-progress.png`, `audit-output/stage-1.23-evidence/dark-status-overview-progress.png`
- Pages inspected:
  - `/cgi-bin/luci/admin/status/overview`
  - `/cgi-bin/luci/admin/system/packages`
  - `/cgi-bin/luci/admin/network/network`

## DOM Map

| Page | Meter found | Outer selector | Fill selector | Text/value node | Inline style | Current winning visual rule |
|---|---:|---|---|---|---|---|
| status overview | 9 | `div.cbi-progressbar` | anonymous `div` child | none inside meter | fill has `style="width:NN.00%"` | `luci-components-visual.css` progress block matching `#maincontent .cbi-progressbar` and `#maincontent .cbi-progressbar div` |
| packages | 0 visible in captured top viewport | none | none | none | none | no meter in current package capture |
| network | 0 visible | none | none | none | none | no meter in current network capture |

## Computed Style Evidence

Observed status overview light meter:

- Outer: `height: 16px`, `border-radius: 999px`, `background-color: rgba(225, 234, 240, 0.82)`, inner-shadow present.
- Fill: `height: 14px`, `border-radius: 999px`, gradient `#d9e8ef -> #8fbccf -> #5f9ab7`, inline width preserved such as `width:91.00%`.

Observed status overview dark meter:

- Outer: `height: 16px`, `background-color: rgba(9, 19, 31, 0.78)`, border and inset shadow present.
- Fill: gradient `#466174 -> #7fb4c9 -> #a4c8de`, inline width preserved.

## Why Stage 1.22 Still Looked Native

The selector did apply. The problem is not a missing selector. The computed styles match VitraWrt tokens, but the geometry remains a long, thin LuCI bar:

- outer height is only `16px`;
- fill nearly fills the whole trough height (`14px` inside `16px`);
- no distinct meter shell, inset channel, or optical separation;
- no value label or material edge is visible in the meter itself;
- fill color is restrained but reads like a recolored flat strip at page scale.

## Final Implementation Strategy

- Keep LuCI value binding and inline width untouched.
- Only style `div.cbi-progressbar`, `.progressbar`, `.progress`, `progress`, and their fill child/pseudo nodes.
- Increase material separation through a slightly taller trough, inset channel, softer fill height, inner highlight, and low-alpha luminous edge.
- Do not fake progress values.
- Do not alter width calculation.
- Do not replace DOM.
- Do not hide text.

## Final Stage 1.23 Verification

Final audit output: `audit-output/visual-direction-1.23/20260526-224900/`

- Light progress close-up: `audit-output/visual-direction-1.23/20260526-224900/light-progress.png`
- Dark progress close-up: `audit-output/visual-direction-1.23/20260526-224900/dark-progress.png`
- Runtime selector still uses the LuCI DOM: `#maincontent .cbi-progressbar > div`.
- The fill inline `width:NN%` remains LuCI-owned and was not modified by JS.
- Stage 1.23 changed the material geometry and active visual state rather than adding another selector-only recolor.
