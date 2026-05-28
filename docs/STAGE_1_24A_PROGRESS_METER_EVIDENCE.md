# Stage 1.24A Progress Meter Evidence

Evidence source:

- Host: `10.10.10.148`
- Raw evidence: `audit-output/stage-1.24A-evidence/evidence-before.json`
- Before screenshots:
  - `audit-output/stage-1.24A-evidence/light-status-progress-before.png`
  - `audit-output/stage-1.24A-evidence/dark-status-progress-before.png`

## DOM Evidence

Status Overview exposes memory/storage/load meters as:

- Outer selector: `div.cbi-progressbar`
- Fill selector: `div.cbi-progressbar > div`
- Text/value node: none inside the meter
- Fill value: inline style such as `style="width:90.00%"`

No visible package progress meter was found in the captured package top viewport during Stage 1.23/1.24A evidence collection.

## Computed Styles Before

Representative light meter:

- outer height: `22px`
- outer padding: `4px`
- outer border radius: `999px`
- outer background: `rgba(225, 234, 240, 0.82)` plus gradients
- outer shadow: inset highlight plus weak inset shadow
- fill height: `12px`
- fill inline width: `width:90.00%`
- fill background: top highlight plus low-saturation cyan gradient
- fill shadow: inset highlight plus low glow

Representative dark meter:

- outer height: `22px`
- outer padding: `4px`
- outer border radius: `999px`
- outer background: `rgba(9, 19, 31, 0.78)` plus gradients
- fill height: `12px`
- fill inline width: `width:90.00%`
- fill background: top highlight plus low-saturation cyan gradient

## Why Stage 1.23 Still Felt LuCI-Native

Stage 1.23 selectors were correct. The visual issue is micro-geometry:

- the meter remains a long uninterrupted strip;
- the fill has little optical separation from the track;
- very small values still look like tiny color slivers;
- the fill has no clear leading bead/edge;
- there is no stronger recessed channel inside the trough;
- the page scale still reads as "LuCI bar with nicer paint".

## Matched Rule Source

Final active visual rules are in:

- `htdocs/luci-static/vitrawrt/css/luci-components-visual.css`
- selectors:
  - `#maincontent .cbi-progressbar`
  - `#maincontent .progressbar`
  - `#maincontent .progress`
  - `#maincontent progress`
  - `#maincontent .cbi-progressbar > div`
  - `#maincontent .progressbar > div`
  - `#maincontent .progress > div`
  - `#maincontent progress::-webkit-progress-value`

Inline width only controls the LuCI value and must stay intact.

## Final CSS Strategy

- keep LuCI inline width and values unchanged;
- retain compact height but improve shell/channel separation;
- add a subtle recessed track and calmer highlight;
- reduce heavy glow;
- add a soft leading-edge illusion using CSS pseudo-elements where safe;
- keep table/form layout unchanged;
- no JS and no DOM replacement.

## After Verification

Final audit:

- `audit-output/visual-direction-1.24A/20260526-235753/`
- `docs/VISUAL_DIRECTION_AUDIT_1_24A.md`

Representative light status meter after 1.24A:

- outer selector: `div.cbi-progressbar`;
- fill selector: `div.cbi-progressbar > div`;
- outer height: `24px`;
- outer padding: `6px`;
- fill height: `10px`;
- fill min-height: `10px`;
- fill inline width preserved: `width:90.00%`;
- fill background: layered low-saturation cyan/silver gradient with a soft leading-edge highlight;
- filter: `none`.

Representative package meter after 1.24A:

- fill inline width preserved: `width: 7%;`.

The meter now has a more distinct recessed channel and a separated inner fill. The LuCI value binding remains intact because the inline `width` style is not modified by CSS or JavaScript.
