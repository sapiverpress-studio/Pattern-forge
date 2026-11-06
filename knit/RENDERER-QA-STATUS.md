# Knitted Fabric renderer: visual QA and implementation decisions (6 November 2026)

## User-defined acceptance standard
- Knitted fabric is formed by **interconnected yarn paths and actual stitch charts**, not repeated photographs or symbols drawn over knit.
- Stockinette: correctly joined V loops. Rib: raised knit / recessed purl columns. Seed: alternating knit/purl. Cable: actual crossings. Fair Isle: whole *yarn stitches* change colour.
- Fine, medium, chunky and **super-chunky cosy** scales; background yarn is not a flat synthetic colour.
- Tiled preview and final 5000×5000 PNG must have no photographic square patches, visible seams or discontinuous stitches.
- Must work on user's Android phone without breaking the current Pattern Forge motifs/editor.

## Verified baseline
Main branch's current photographic /knit tool is **not acceptable** to user: visible square patches in larger repeats and V-shaped colourwork not integrated into yarn. This branch is isolated and **must not merge on automated tests alone**.

## Work performed on branch
- New procedural stitch-geometry Canvas path renderer, 5 styles × 4 gauges, boundary and PNG tests. Tests passed but visual render looked like linked chains — **rejected**.
- Added depth-sorted Canvas occlusion. Tests passed; visual looked like mesh/pipes — **rejected**.
- Trialled CC BY 4.0 tileable front/back/alpha displacement maps from a physical yarn model. Seam/colourwork visual tests found flat yarn and contrast-block artefacts; **not release-ready**.
- Pinned MIT **Three.js 0.187.0** locally with licence; added 3D tube geometry, PBR material and genuine front/back yarn crossings. Camera framing corrected. Render from reverse geometric face gives visible knit V loops; still too smooth without high-frequency wool material.
- Added thin twisted 3D plies and derived micro-fibre bump colour from existing CC0 wool source (used as surface material only, never as pattern geometry). Await current visual review. 3D screenshot automation runs in Chromium/SwiftShader.
- No code under the original Pattern/Doodle editors has been touched. Main branch is unchanged.

## OSS licences / provenance
- [Keenan Crane plain-knit-yarn](https://github.com/keenancrane/plain-knit-yarn): mathematical centreline code MIT; reference model and displacement map imagery CC BY 4.0. Attribution retained in geometry module and this note.
- [Three.js](https://github.com/mrdoob/three.js): 0.187.0, MIT. Vendored licence at knit/vendor/THREE-LICENSE.txt.
- CC0 photo source used for high-frequency wool surface microtexture: Meshy Grey Chunky Knit, documented in knit/textures/SOURCES.md.
- CC BY 4.0 displacement assets under knit/displacement/, not used in current 3D preview but remain available for comparison. Attribution must appear in any public renderer that uses them.

## Release block
Do **not** merge PR #18 or deploy to production until:
1. Actual close-up screenshots of **all five modes** look like knitted yarn and distinctly match the named knit construction.
2. Both sides of the yarn are correctly modelled; the default shows the real V-loop face.
3. 3×3 preview and 5000×5000 export have no visible rectangles (structural and lighting seams).
4. Android mobile viewport interaction and 5000px PNG export pass without memory or latency problems.
5. Colourwork swaps whole stitch yarn, not flat colour masks.
6. User's cosy-knit reference has been used for visual comparison; no claim of photorealism before it is achieved.

Current source branch: fix/geometry-knit-without-square-tiles-20261106.
Current draft PR: https://github.com/sapiverpress-studio/Pattern-forge/pull/18
Current production page (unchanged by this work): https://sapiver-pattern-forge.netlify.app/knit/
