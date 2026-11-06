"""Pure-Python connected yarn centre-lines. No tile images, stamping or V decals."""
from __future__ import annotations
import math

# Yarn traverses an entire row as one connected path. Adjacent loop endpoints
# coincide, including outside the camera crop, so joins cannot expose a square.
STOCKINETTE = (
    (-0.50, 0.19, 0.02),
    (-0.34, 0.38, 0.07),
    (-0.24, 0.78, 0.15),
    (-0.13, 0.96, 0.23),
    (-0.03, 0.94, 0.20),
    ( 0.05, 0.70, 0.05),
    (-0.09, 0.35, 0.14),
    ( 0.00, 0.09, 0.26),
    ( 0.09, 0.35, 0.15),
    (-0.05, 0.70, 0.05),
    ( 0.03, 0.94, 0.20),
    ( 0.13, 0.96, 0.23),
    ( 0.24, 0.78, 0.15),
    ( 0.34, 0.38, 0.07),
    ( 0.50, 0.19, 0.02),
)

def catmull_rom(points, subdivisions=5):
    """Smooth interpolation that runs through control points (not detached glyphs)."""
    if len(points) < 2:
        raise ValueError("At least two control points are required")
    result = []
    for i in range(len(points) - 1):
        a = points[max(0, i - 1)]
        b = points[i]
        c = points[i + 1]
        d = points[min(len(points) - 1, i + 2)]
        for j in range(subdivisions):
            t = j / subdivisions
            t2, t3 = t*t, t*t*t
            result.append(tuple(0.5 * (
                2*b[k] + (-a[k] + c[k])*t
                + (2*a[k]-5*b[k]+4*c[k]-d[k])*t2
                + (-a[k]+3*b[k]-3*c[k]+d[k])*t3
            ) for k in range(3)))
    result.append(points[-1])
    return result

def row_centres(row, columns, pitch=1.0, margin=1):
    """One physically connected course extending beyond the final image boundary."""
    if columns < 2 or pitch <= 0 or margin < 0:
        raise ValueError("Invalid knit geometry parameters")
    origin_x = -(columns * pitch) / 2
    # Knitted courses physically overlap: the next row passes through the
    # preceding loop shoulders rather than leaving a disconnected V grid.
    origin_y = row * pitch * .70
    ctrl = []
    for col in range(-margin, columns + margin):
        ox = origin_x + (col + .5) * pitch
        for i, (x, y, z) in enumerate(STOCKINETTE):
            if col > -margin and i == 0:
                continue
            ctrl.append((ox+x*pitch, origin_y+y*pitch, z*pitch))
    return catmull_rom(ctrl, 6)

def frame_geometry(rows=8, columns=8, pitch=1.0):
    if not 2 <= rows <= 48 or not 2 <= columns <= 48:
        raise ValueError("Rows and columns must each be 2..48")
    for row in range(-1, rows+1):
        yield row_centres(row-rows/2, columns, pitch)

def cumulative_length(points):
    out = [0.0]
    for a,b in zip(points, points[1:]):
        out.append(out[-1]+math.dist(a,b))
    return out
