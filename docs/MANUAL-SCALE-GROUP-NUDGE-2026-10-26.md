# Manual scale entry and grouped nudge — 26 October 2026

## Scope
Branch: `feature/manual-motif-scale-20261026` (isolated from main; NOT deployed).

### Exact motif and artwork scale
- Select an item, then type its desired percentage into the number field beside the existing bottom Scale slider.
- Accepts 1–600%, at increments of 0.1%. Enter commits; the slider and numeric field stay coordinated.
- The underlying editable project artwork is not flattened or re-imported.
- Multi-selection/group scaling has a typed percentage input as well. This is a **relative scale**, with 100% representing the size of the group when the selection control appears (not the absolute percentage of each member).

### Group movement
- Selecting Group switches off additive selection mode so tapping a group member can drag the whole group.
- When two or more items are selected, bottom toolbar exposes Nudge arrow buttons and a step picker.
- Step presets: 1, 10, 25 (default), 50, 100 and 250 artwork pixels; buttons move all selected items by the same delta.
- Movement preserves member scale and group ID, including when items wrap around the repeat tile.
- One operation creates one undo entry. Works for imported image placements and drawn marks.

## Validation
- Source syntax parsed: `app/js/editor.js`, `app/js/canvas-first-v2.js`, and browser test file.
- Direct execution of the exact extracted nudge routine: PASS for two grouped images plus a drawn mark, tile-boundary wrapping, X and Y movements, preserved member scales and one history snapshot per command.
- `tests/ux2-complete-ux-audit.mjs` extended to exercise numeric scale entry, slider sync, grouped nudge, and group retention.
- Full Playwright/browser workflow and physical Android touch interaction have **not yet been verified in this session**. Do not treat this as a tested live release.

## Release
Do not merge to main or deploy Netlify until regression/Android verification is complete and the user authorises the release.
