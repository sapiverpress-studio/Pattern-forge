# Pattern Forge: magnetic alignment and motif remix
Date: 2026-10-23
Branch: `feature/magnetic-guides-and-motif-swap-20261023`
Draft PR: https://github.com/sapiverpress-studio/Pattern-forge/pull/8

## Problem
The old Smart Snap only covered the tile centre, edges and a fixed grid. It could not automatically align motif centres/edges with other motifs or detect equal centre spacing. Saved colourway variations did not replace original motif image assets, so a repeat arrangement had to be rebuilt for a new set of artwork.

## Implemented in branch
- Extra **Align to other motifs** and **Equal-spacing guides** switches (default on). When Smart Snap is enabled, dragged motifs reveal temporary guide lines at other visible motifs' centres, matching edges, touching edges and evenly spaced positions.
- Repeated artwork in straight, brick and half-drop tiles uses repeat-lattice candidate positions.
- Real-time object/spacing snapping begins only after a deliberate >=24 CSS pixel drag. Short nudges remain unmagnetised for fine touch positioning. Grid snapping continues at release.
- Multi-selection: align left, centre X, right, top, centre Y, bottom; distribute centres evenly on X/Y. Distribute requires >=3 elements. Operations are undoable and work in visible-tile coordinates so whole-tile rows do not wrap out of order.
- **Duplicate & replace motifs** in Design setup or Export & save: choose 1–10 new PNG/JPEG/WebP files, map each to a distinct placed original motif type, then create a separate editable project. Each replacement is applied to all placed instances of its motif asset. Import and decoding complete before writing the new project; the original project autosaves before the new one is opened.
- Original item centres, layer/group associations, rotations, opacity, flips and repeat mode are preserved. New source images are fitted inside the old bounding rectangle to avoid expansion and collision; mismatched aspect ratios may look smaller and need visual review.
- The duplicated project starts with no old colourway snapshots. Guide/grid overlays are editor-only and do not alter the PNG/SVG export path.

## Usage
1. Open an existing Pattern Project, and download its editable project ZIP as a portable backup.
2. For alignment, open **Design setup**: enable Smart snapping, Align to other motifs, and Equal-spacing guides. Drag near another motif's centre or edge; temporary guide lines appear. Select two or more motifs for the alignment toolbar; select three or more for even distribution.
3. For motif substitutions, open **Design setup → Duplicate & replace motifs**, give the copy a new name, and select up to ten new image files simultaneously.
4. Match each uploaded replacement file with a *different* original placed motif type shown in the list (includes instance count). Choose **Create separate design**.
5. Visually inspect the copied repeat, particularly differently shaped motifs, then export or download an editable ZIP for backup.

## Quality gates
- New end-to-end Chromium: `tests/magnetic-remix-smoke.mjs` (up to ten replacements, duplicate source mapping rejection, preserve placement properties, source project safety and reload).
- Real-pointer Chromium: `tests/object-magnet-browser.mjs`.
- Android-sized UX2 emulation: `tests/ux2-magnetic-remix-mobile.mjs`.
- Previous snapping regression: `tests/smart-snapping-smoke.mjs`.
- CI workflow: `.github/workflows/magnetic-remix-checks.yml`.
- Work remains behind draft PR; no production deployment or Android build authorised by this branch.

## Further checks before release
- Verify real Android touch responsiveness with ~100–500 motifs, including straight, brick and half-drop seamless tiles.
- Inspect alignment overlays at different zoom levels and confirm invisible PNG/SVG guides.
- Check browser IndexedDB capacity with ten full-resolution PNGs; local storage is not portable backup.
- Do not merge, publish or deploy merely because GitHub checks are green.
