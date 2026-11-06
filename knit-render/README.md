# Sapiver knitted wool: hybrid open-source rendering proof

STATUS: isolated experimental branch, not connected to the live site.

The live /knit/ tool enlarges source material images. This isolated prototype
generates a completely different image from 3D yarn geometry, with no bitmap
tiling or artificial V-loop artwork. Visual quality is not yet accepted.

## Open-source tools and roles

- Blender (GPL): 3D connected knitted courses, two-ply twisted yarn,
  physical loose fibre hair geometry, PBR wool shaders, studio lighting.
- Material Maker (MIT; optional): procedural PBR maps for roughness and
  normals can be exported separately and passed as --roughness-map and
  --normal-map. This tool is not required to run the Blender proof.
- Python + Pillow (open source): validates rendered image dimensions and
  nonblank pixels and writes lossless PNG with 300 DPI metadata.

## Run the prototype

Requires Blender 3.6+, Python 3.10+ and Pillow.

    python3 -m unittest discover -s knit-render/tests -p 'test_*.py'
    blender -b -noaudio --python knit-render/render_blender.py -- \
       --style stockinette --gauge mega --colour '#e9dbc3' \
       --size 768 --samples 24 --output /tmp/wool-raw.png
    python3 knit-render/finish.py /tmp/wool-raw.png /tmp/wool-final.png --size 768

Production 5000 px is possible with --size 5000 for Blender and --size 5000
for Pillow. This must be rendered natively rather than enlarged from 768 px.
CPU-only render time and memory requirements will need measurement.

The independent GitHub Actions workflow knit-hybrid-render-prototype.yml
generates a 720 px visual sample and performs unit and output checks.
It does not publish the website.

## Acceptance before integrating into Pattern Forge

- Examine the physical fibre and interlocking stitch appearance.
- Reject shiny plastic, detached loop geometry or square image artefacts.
- Measure CPU rendering costs and genuine 5000 px output.
- The site will need a controlled server renderer with abuse prevention;
  do not expose tokens in the public site or imply Blender runs in mobile Chrome.
- Develop independent stitch geometries for rib, seed, cable and Fair Isle.
  Never reuse an incorrect stockinette path for other knitting techniques.

The existing Pattern Forge editor and live knitting workspace are unchanged.
