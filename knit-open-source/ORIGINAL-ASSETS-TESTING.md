## 7 November 2026 — Original CC0 shaders finally executed in Blender 4.0.2 (local proof)

**What was directly tested:** Original uploaded `Knittr v0.1.blend` (three materials) and `Weavr-v1_0.blend` (five materials) were imported with the exact Blender library data, rendered using a portable Blender 4.0.2 binary and tested with a full-square UV plane. A first render script accidentally used Catmull-Clark subdivision, rounding the four plane corners to circular swatches; corrected to **Simple** subdivision and reran original materials on a full square.

**Verified Knittr experiment:** `Knittr - Example 1` square, **384px** at 6 samples with `Division=12` to enlarge stitches; original shader was recognisably knitted but still overly regular V shapes. Then square **512px** at 8 samples with `Division=18`, `Fuzziness=1.2`, `Fibers=1.3`, `Fluff Amount=1.7`, `Shape [Thickness]=2.8`. Produces more fuzzy raised stitches but not the photoreal chunky interlocking cable look sought. *Raw unmodified* opposite-edge mean pixel errors X=**1.7142**, Y=**1.8210** (normal adjacent pixel differences 32.165 and 31.465): encouraging but **not** proof of no visible repeat seams at full scale. The 3×3 view must be visually inspected, not trusted from MAE alone.

**Verified Weavr experiment:** The five original materials rendered at 512px and the genuine `04 Weavr` material rendered on a square 384px plane. Raw seam MAEs X=**11.8342**, Y=**12.4418** versus adjacent differences 50.438 and 49.570. It produces a dense woven cloth surface, **not** cable-knit or soft chunky wool, so keep it as a separate optional textile category.

**Other file:** `B'rn_v0.1-1.blend` is the author's procedural FIRE material. Inspect/inventory only; deliberately excluded from knitted-wool render jobs.

**Verified editable node group sockets:** `knit-open-source/original-node-control-map.json` records Knittr's Division/Distortion/Fuzziness/Shear/Thickness/Fibers plus Fluff Amount and Weavr's Division/Threads1/Threads2/Gaps1/Gaps2/Distortion/Fibers/Fuzziness/Errors. These can power the future HTML designer directly instead of another invented browser V-stitch shader.

**Remaining gates:** No native 5000px render or 300 DPI final export from *these original node materials* has been run; no user-approved cosy phone-case visual quality and no exact seamlessness certification. No live Pattern Forge changes, no remote public service, no Work credits. The generated conversation archive contains all four untouched originals, verified checksums, tests, and review PNGs. This branch remains isolated and PR #26 must stay DRAFT.

# Original shader files supplied by Jim — tested inventory, native Blender test procedure

## Assets and suitability (verified directly from file headers and Blender ID blocks)

| Source | Saved version | Materials | Node groups | Scope |
| --- | --- | --- | --- | --- |
| Knittr v0.1.blend | 2.80 | Knittr - Example 1/2/3 | Knittr v0.1, Fluff | **Priority** — knitted wool and fibre detail |
| 2_79-Knittr v0.1.blend | 2.79 | Three Knittr examples plus Material | Knittr v0.1, Fluff | Legacy fallback only |
| Weavr-v1_0.blend | 2.81 | 01 Weavr through 05 Weavr | Weavr-v1_0 | **Secondary** — woven cloth, not cable knitting |
| B'rn_v0.1-1.blend | 2.80 | B'rn_v0.1 | B'rn_v0.1 | Volumetric fire; unrelated to wool generator |

Checksums and sizes are in \`knit-open-source/original-assets-manifest.json\`. Original file bytes have NOT been committed to GitHub: conversation uploads are not available to GitHub Actions. The four untouched originals and a standalone test script are included in the generated ChatGPT archive \`sapiver-original-knittr-weavr-material-tests.zip\` (available in the conversation).

## Source use and licences

All three are by Simon Thommes and the original listings describe CC0:
- [Knittr](https://simonthommes.gumroad.com/l/Knittr) — three basic knitted materials with procedural fibres and micro-displacement
- [Weavr](https://simonthommes.gumroad.com/l/w3avr) — five woven examples, Blender 2.81
- [B'rn](https://simonthommes.gumroad.com/l/BRNbl) — volumetric animated fire, Blender 2.8

These are not interchangeable: combining fire with wool would be an unrelated effect, not a knit-realism improvement.

## Render source materials using the existing Blender importer

Once the originals are present on a Blender-capable runner (do not call it tested until they are), for example:

\`\`\`sh
blender -b -noaudio --python-exit-code 5 --python knit-open-source/render_material.py -- \
  --mode knittr-original --knittr-blend "/path/to/Knittr v0.1.blend" \
  --knittr-material "Knittr - Example 1" \
  --size 720 --samples 24 --output "/tmp/knittr-example1-720.png"

blender -b -noaudio --python-exit-code 5 --python knit-open-source/render_material.py -- \
  --mode weavr-original --weavr-blend "/path/to/Weavr-v1_0.blend" \
  --weavr-material "01 Weavr" \
  --size 720 --samples 24 --output "/tmp/weavr-example1-720.png"
\`\`\`

The independent archive contains \`scripts/render_material_library.py\` to test *all three* Knittr and *all five* Weavr presets and produce a JSON material/node inventory. It also contains \`scripts/check_repeat.py\`, which measures raw opposite-edge errors before any post-processing and produces a 3×3 review grid. A corrected border alone does **not** prove that a source material is seamless.

## Current status and integration gate

**Asset inspection, SHA-256 validation, package CRC and Python syntax: PASSED.** Real renders of the two newly supplied original .blend files under modern Blender: **NOT RUN**, because the local execution environment lacks Blender and external download access. Existing Github CI only tests other freely downloadable PBR/material assets, so those pass results do not count as originals validation.

The live \`/knit-studio/\` remains unchanged. Do not merge this exploratory branch or replace the present 5000px generator until these *specific original* shader nodes visibly produce believable thick yarn, repeat seamlessly without false border repairs, and complete a native 5000×5000 at 300 DPI with acceptable runtime. Web studio inputs should be mapped to genuine Knittr Thickness/Fibers/Fluff and original Weavr threads instead of rewriting material shaders.
