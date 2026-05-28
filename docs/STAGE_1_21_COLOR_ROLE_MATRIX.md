# Stage 1.21 Color Role Matrix

Stage 1.21 corrects Stage 1.20R's green-glass drift. Mint/green is no longer the global UI color. Neutral ice/mist/silver surfaces carry light mode; graphite/ink glass carries dark mode. Cyan and blue-violet are atmospheric and focus details. Green is reserved for success/status.

| Role | Light intent | Dark intent | Shared system rule |
|---|---|---|---|
| Background | Ice white with mist-blue and faint violet/cyan diffusion | Graphite ink with low aqua/violet spatial haze | Atmosphere lives in page background, not on every control. |
| Panel surface | Translucent white/silver, low saturation | Translucent graphite/navy, low border contrast | Panels are neutral glass, not green panels. |
| Elevated surface | Slightly brighter neutral white | Slightly lifted blue-black graphite | Elevation changes luminance and shadow, not hue. |
| Field surface | Frosted white with graphite text | Frosted graphite with ice text | Inputs/selects/textareas/dropdowns/dynlists share this material. |
| Field active | White/ice with a very subtle cyan edge | Graphite with cyan edge light | Focus is cyan, not mint fill. |
| Control island | Neutral glass dock surface | Neutral graphite glass dock | Dock material is calm; buttons provide role emphasis. |
| Tab active | Neutral luminous pill with cool blue-cyan edge | Neutral luminous pill with cyan/violet edge | Active tab is not a green badge. |
| Tab inactive | Soft neutral chip | Soft graphite chip | Same geometry across light/dark. |
| Progress track | Sunken pale silver trough | Sunken graphite trough | Track is visible material, not a flat bar. |
| Progress fill | Cyan-to-silver-blue restrained fill | Cyan-to-blue-violet restrained fill | Progress uses cyan/blue material; green only for semantic success meters if added later. |
| Focus ring | Thin low-alpha cyan halo | Thin cyan halo with lower opacity | Focus is accessible but not neon. |
| Primary action | Graphite/cool neutral filled material | Ice/cyan-tinted graphite material | Primary is not green and not Bootstrap blue. |
| Neutral action | Transparent neutral glass | Transparent graphite glass | Used for most LuCI controls and table actions. |
| Danger action | Soft rose tint | Low-noise rose tint | Destructive action is recognizable but calm. |
| Success state | Desaturated green/mint | Desaturated green/mint | Only for online/status/success, never global surfaces. |
| Text primary | Graphite/ink | Ice text | Strong contrast without harsh black/white. |
| Text secondary | Slate grey | Muted slate/ice | Helps admin density remain readable. |
| Border/separator | Hairline graphite alpha | Hairline ice alpha | Borders are thin; depth comes from material and highlight. |
| Shadow | Soft cool grey shadow | Softer black shadow plus faint chromatic depth | Avoid heavy industrial slabs. |
| Ambient glow | Cyan/violet/aqua at low opacity | Cyan/violet/aqua at low opacity | Glow is background atmosphere, not component paint. |

## Effective Token Direction

- `--vw-aqua`: restrained atmospheric detail, not default surface paint.
- `--vw-success`: success/status only.
- `--vw-button-primary-bg`: neutral cool material.
- `--vw-sidebar-active-bg`: neutral/cyan-laced material, not mint fill.
- `--vw-field-bg-focus`: neutral field with cyan edge, not green field.
- `--vw-progress-fill-*`: cyan/silver-blue material.
- `--vw-glow-*`: low opacity background atmosphere.

## Rejection Rules

- Do not use green/mint for primary buttons, active tabs, table hover, plugin buttons, or generic sidebar rows.
- Do not use saturated OpenWrt/Bootstrap blue for primary actions.
- Do not add border thickness to create "premium" feeling.
- Do not create a separate dark industrial theme; dark mode must match light geometry.
