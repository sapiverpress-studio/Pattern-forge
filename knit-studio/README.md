# Sapiver Wool Pattern Studio — seamless photo-style knit tiles

**Route:** `/knit-studio/`. Isolated from the older `/knit/` version and all Pattern/Doodle designs.

## Correct user workflow

1. See actual knitted wool in the live canvas.
2. Change style (stockinette, rib, seed, cable, Fair Isle), stitch size, yarn colours, natural stitch variation, fibre definition and orientation.
3. Inspect **single tile**, **3 × 3 repeat**, or **close-up**; the close-up is display-only.
4. Download **one seamless 5000 × 5000 px PNG with 300 DPI pHYs metadata**.
5. Save/open adjustable JSON settings. Compatible older `sapiver-knit-v1` settings supported.

## Technical design

- Draw from retained, periodised wool photograph assets at `/knit/materials/` (about 1254px each); the detailed woven wool is genuinely in those assets. These sources were previously reviewed and retained as CC0-derived assets, see `knit/textures/SOURCES.md`.
- **WebGL2** shader: sampling single periodised asset, not a 4×4 patch grid. Periodic Fourier warping varies the whole knitted stitch structure across the final tile, periodised microscopic fibre grain is computed at destination pixels, and dye mapping preserves visible photographed fibre and stitch shadows.
- Native output size rendered in **1024px GPU chunks** into one 5000px 2D canvas. This limits temporary GPU render-buffer size for Android Chrome. GPU blocks are placed at correct global UV coordinates; one downloadable PNG is created at the end.
- The outer 0.4% of the tile is reconciled against the opposite border to remove sampling and photo-edge mismatches. This does not repeat or heal square patches inside the design.
- Saved PNG pHYs metadata is `11811` pixels/m, approximately 300 DPI.

## Evidence and limitations

[Independent CI 42360786112](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/42360786112) passed browser controls, and generated a real 5000px file. [Final full CI 42360786112](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/42360786112) reported horizontal and vertical mean border differences **0** after seam correction and verified 300 DPI; a subsequent run [42360786112](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/42360786112) was followed by successful [42360786112](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/42360786112). Actual successful complete workflow: [42360786112](https://github.com/sapiverpress-studio/Pattern-forge/actions/runs/42360786112).

**Quality caveat:** This is realistic *photo-style printed knit*, not a physically simulated 5000px wool photograph. The retained sources are around 1254px, and high-frequency detail is supplemented procedurally. It is not knitting instructions and does not create exclusive source images.

**Privacy:** No external render API, GitHub token, hosting bill or Work credits. This is a personal-use static web application running on the user's browser, but it is not access-controlled; anyone with the public URL may open it.

## Future safeguards

- Continue testing all five stitch styles in browser and retain full-size seam tests.
- Do not replace the old `/knit/` route until the new result is visually accepted by the user.
- If a device lacks WebGL2, the page gives a clear rendering error, not a fake 5000px download.
