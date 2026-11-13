"""Validate a Blender-rendered wool tile, reconcile ONLY the narrow tile border.

This does not upscale and never constructs a central grid from photos.
The shader/geometry generates the surface. Pillow only guarantees printable
PNG DPI metadata and an exact opposite-edge match for 3x3 repeats.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


def edge_reconcile(src, width=0.008):
    """Periodise a narrow (<1% per edge) band, leaving the interior intact."""
    arr = np.asarray(src.convert("RGB"), dtype=np.uint8).copy()
    h, w, _ = arr.shape
    band = max(3, min(45, int(min(w, h)*width)))
    # symmetric pairwise crossfade, exact edge matching by construction
    for i in range(band):
        alpha = 0.5*(1.0-i/band)**2
        left = arr[:, i, :].astype(np.float32).copy()
        right = arr[:, w-1-i, :].astype(np.float32).copy()
        arr[:, i, :] = np.rint(left*(1-alpha)+right*alpha).astype(np.uint8)
        arr[:, w-1-i, :] = np.rint(right*(1-alpha)+left*alpha).astype(np.uint8)
    for i in range(band):
        alpha = 0.5*(1.0-i/band)**2
        top = arr[i, :, :].astype(np.float32).copy()
        bottom = arr[h-1-i, :, :].astype(np.float32).copy()
        arr[i, :, :] = np.rint(top*(1-alpha)+bottom*alpha).astype(np.uint8)
        arr[h-1-i, :, :] = np.rint(bottom*(1-alpha)+top*alpha).astype(np.uint8)
    return Image.fromarray(arr, mode="RGB")


def audit(image):
    arr = np.asarray(image.convert("RGB"), dtype=np.float32)
    seam_x = float(np.mean(np.abs(arr[:, 0] - arr[:, -1])))
    seam_y = float(np.mean(np.abs(arr[0] - arr[-1])))
    near_x = float(np.mean(np.abs(arr[:, 1] - arr[:, 0])))
    near_y = float(np.mean(np.abs(arr[1] - arr[0])))
    std = float(np.std(arr))
    return dict(width=image.width,height=image.height,seam_x_mae=seam_x,
                seam_y_mae=seam_y,adjacent_x_mae=near_x,
                adjacent_y_mae=near_y,pixel_std=std)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--size", type=int, required=True)
    p.add_argument("--report", default="")
    a = p.parse_args()
    if not 256 <= a.size <= 5000:
        raise ValueError("Invalid export size")
    with Image.open(a.input) as src:
        if src.size != (a.size,a.size):
            raise ValueError("REFUSING upscale: source must already be rendered at native size")
        output = edge_reconcile(src)
    stats = audit(output)
    if stats["seam_x_mae"] > .01 or stats["seam_y_mae"] > .01:
        raise AssertionError("Output tile edges do not match")
    if stats["pixel_std"] < 4:
        raise AssertionError("Output appears uniform, not knitted wool")
    dest=Path(a.output).resolve()
    dest.parent.mkdir(parents=True,exist_ok=True)
    output.save(dest,format="PNG",dpi=(300,300),optimize=True)
    with Image.open(dest) as im:
        if im.size!=(a.size,a.size) or abs(im.info["dpi"][0]-300)>.2:
            raise AssertionError("PNG failed native dimensions or 300DPI metadata")
    if a.report:
        Path(a.report).write_text(json.dumps(stats,indent=2))
    print("VALIDATED WOOL PNG:",dest,stats,flush=True)


if __name__=="__main__":
    main()
