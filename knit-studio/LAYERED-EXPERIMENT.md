# Experimental three-layer yarn colouring

## Requested concept
The user proposed laying three identical wool-texture renders together: main yarn on top, colour 2 behind, colour 3 behind, and letting the knitted pattern reveal the appropriate coloured yarn. They want to *draw onto the wool itself*, rather than only colouring a separate square chart.

## What is implemented
- **Opt-in** `Try three-layer knitted yarn` (off by default). Untick to restore the previous appearance, randomiser, custom chart and 5000px export. Do not remove the prior shader branch.
- The shader samples the **same photographed wool at the same UV, with the same fibres and illumination**. It constructs three differently dyed versions and composites using per-stitch colour selection. There are no separate tinted photo files and no upload service.
- To keep masking from forming visible squares, `stitch-ownership.mjs` traces low-luminance knitted **grooves** in the underlying 1254px material. Each groove-bounded region is assigned a source stitch ID and a feathered opacity. This map is precomputed *once per style*, cached in the browser, and rendered via two WebGL textures: nearest (unmixed stitch IDs) and bilinear (edge feathering). It does **not** simply reveal coloured chart-cell rectangles or draw artificial V lines.
- UI lets the user select one of three actual yarn colours and tap or drag on the live single-tile wool itself to edit the same underlying stitch chart. Save/Open editable JSON, Undo/Redo, Mirror, Randomise, 3×3 repeat and native 5000px 300DPI export still work.
- **This first release enables the experimental layers for Stockinette and Fair Isle only** (both use the photographed stockinette yarn loops). Source stitch count is approximately 16×11. Tests showed poor colour segmentation on cable and rib, so their checkboxes are disabled and the untouched original renderer is retained for Cable, Rib and Seed. Non-square photo loop counts mean the 12/16/24/32 square editor grids may resample the design unevenly. This is **an experiment**, not knitting instructions.

## Quality and safety
Automated browser QA checks the opt-in, switching off and back preserving previous output exactly, mobile finger editing/undo/redo, patterned colour visibility, save/reload, selection of knitted materials and a **single 5000×5000 PNG with 300DPI metadata and exact opposite-edge matches**. Review the native-resolution image, not only the preview. The photography is about 1254px, so native 5000px photographic detail is not claimed.

This is image-based colour placement, **not physically simulated yarn topology**. Photo seam segmentation can be approximate in cable/seed materials, and an isolated edge stitch may look cut when its colour differs from its matching neighbour. The user can always switch the experimental method off without losing the underlying editable colour chart.

## Rollback
Revert the single PR containing this experiment. Existing original colourwork renderer remains in the shader `else if(motifEnabled>.5)` branch. No other Pattern Forge files, Netlify settings, paid services or external APIs are changed.
