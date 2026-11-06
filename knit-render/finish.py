"""Pillow (HPND licence) validates and finishes true-resolution Blender renders.

Never enlarges a small raster. Blender must render the requested native size.
"""
import argparse
import os
from PIL import Image, ImageStat

def finish(source, destination, expected, dpi=300):
    if not 256 <= expected <= 5000:
        raise ValueError("Output dimension outside allowed range")
    with Image.open(source) as image:
        if image.size != (expected, expected):
            raise ValueError(f"Low-resolution render rejected: {image.size}, expected {expected}²")
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        stats = ImageStat.Stat(image.convert("RGB"))
        if max(stats.stddev) < 3.0:
            raise ValueError("Blank or almost flat image; refusing deliverable")
        os.makedirs(os.path.dirname(os.path.abspath(destination)), exist_ok=True)
        image.save(destination, format="PNG", dpi=(dpi,dpi), optimize=True)
    with Image.open(destination) as check:
        if check.size != (expected,expected):
            raise AssertionError("Final image has incorrect pixel dimensions")
        if abs(check.info.get("dpi",(0,0))[0]-dpi) > .05:
            raise AssertionError("Final PNG lost DPI metadata")
    return destination

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("destination")
    parser.add_argument("--size",type=int,required=True)
    args=parser.parse_args()
    print(finish(args.source,args.destination,args.size))
