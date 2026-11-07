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
