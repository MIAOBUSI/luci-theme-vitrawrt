# Stage 1.22 Auto Iteration Plan

## Loop Contract

Run up to three loops:

1. Audit CSS ownership and DOM evidence.
2. Apply rebase/consolidation changes.
3. Deploy to `10.10.10.148`.
4. Run safety checks.
5. Run runtime regression.
6. Run visual audit.
7. Inspect screenshots and metrics.
8. Patch remaining visual defects or document limitations.

## Stop Conditions

Stop only when:

- duplicate component ownership is reduced by removing `luci-visual.css` import or equivalent consolidation;
- runtime regression passes, or failures are documented with evidence;
- visual audit output exists;
- remaining native-looking areas are honestly marked partial/limited.

## Repair Loop Checks

Each loop must inspect:

- import ownership and loaded CSS order;
- token namespace usage;
- sidebar hover row/chevron integration;
- sidebar bottom dock containment;
- `.cbi-value` row density;
- field density in normal/modal/plugin/table contexts;
- System NTP dynlist existing/add rows;
- network modal dynlist rows;
- cbi-dropdown closed/open list;
- network modal tabs and hover;
- progress close-up;
- apply dock;
- loading/apply/session dialogs when reproducible;
- OpenClash/MosDNS/plugin visual fit;
- process/package/startup layout safety.

## Logging

Append loop evidence to `docs/STAGE_1_22_AUTO_ITERATION_LOG.md` with:

- loop number;
- ownership changes;
- token changes;
- selectors changed;
- screenshots inspected;
- visible defects found;
- root cause;
- CSS changed;
- JS changed, if any;
- why LuCI-safe;
- light/dark result;
- duplication reduction status;
- remaining failures.

