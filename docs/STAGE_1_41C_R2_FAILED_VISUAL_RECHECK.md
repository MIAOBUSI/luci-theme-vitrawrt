# Stage 1.41C-R2 Failed Visual Recheck Fixes

- **Dropdowns:** Previously missing dropdown arrows and incorrect blue/cyan fills were resolved by injecting `::after` chevrons and removing radial-gradients.
- **Dynlists:** Added standard Apple styling (44px height, 18px radius) to `.cbi-dynlist` inputs and buttons, perfectly aligning the add row and existing items.
- **Tabs Dock:** Modal tabs background returning to a full bar was fixed by introducing `fit-content` and `inline-flex` natively to `.tabs` and `.cbi-tabmenu`.
