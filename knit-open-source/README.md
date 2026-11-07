# Open-source wool rendering: first independent Blender experiment

**Status: development branch only. Existing live /knit-studio/ remains unchanged.**

## What we actually have

- [Knittr by Simon Thommes](https://simonthommes.gumroad.com/l/Knittr) is a **CC0** procedural knit shader, originally made for Blender 2.8.
- Its original `.blend` is delivered after a free/pay-what-you-want Gumroad checkout. It is **not bundled here**, because it has not been obtained, and compatibility cannot be claimed.
- The independent [CJT-Jackton CC0 knitting shader example](https://github.com/CJT-Jackton/URP-Knitwear-Shader-Example) says its textures were generated from Thommes's original procedural work. It explicitly licenses its *own* textures and code CC0. We fetch three genuine PBR texture maps at **pinned commit** `efa6f0d91be64ca0decb1500e1855dcab19b1bbc`. No questionable mirror of the original .blend is used.
- Blender Cycles uses those baked maps as a material with normal/AO/roughness and optional fine-scale procedural fibres. This is **not** the same as running Knittr's actual original node tree, and should never be described as such.

## To run first material proof

The isolated GitHub Actions workflow `.github/workflows/knittr-cc0-material-proof.yml` downloads these licensed maps, installs Blender, creates an actual editable `.blend` scene, renders an orthographic wool swatch at native resolution, and uses Pillow to write a 300-DPI PNG with exactly matching edges. It attaches a 3×3 repeat and an edge audit.

The experiment runs at 720px first to establish that the material looks believable. **Do not upscale 720px to 5000px or publish it as finished artwork.** If visual QA is good, run a native-size benchmark and feed this material into the editor's existing design settings.

## Using the actual original Knittr (only after obtaining it legitimately)

```bash
blender -b -noaudio --python-exit-code 5 \
  --python knit-open-source/render_material.py -- \
  --mode knittr-original --knittr-blend /path/to/Knittr.blend \
  --size 720 --samples 20 --output /tmp/knittr-original-raw.png
python knit-open-source/finish.py /tmp/knittr-original-raw.png /tmp/knittr-original-720-300dpi.png --size 720
```

The importer looks for a material with "knit" in its name and fails with explicit errors when the asset is missing. Older Blender 2.8 node networks may have broken nodes under newer Blender versions; this needs empirical testing, *not* assumptions.

## Actual release requirements

1. Original knitted yarn structure visually passes the phone-case reference comparison, including thick cable and real wool fibres.
2. A single tile joins on all four edges, including a 3×3 repeated preview, with no central square-patch artifacts.
3. Native 5000×5000 px PNG is **rendered** (not resampled) and tagged 300 DPI.
4. Mobile editor retains live editing/colour/scale/visual previews. External compute access can run only for final renders.
5. Render time, cost, and download work in the user's own workflow; keep everything private-use without unnecessary public backend.

No modifications to live Pattern Forge, saved projects or Netlify configuration in this experiment.
