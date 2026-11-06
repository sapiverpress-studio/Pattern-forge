"""Portable structural checks (no Blender installation required)."""
import math
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from geometry import frame_geometry, row_centres, cumulative_length, catmull_rom

class YarnGeometry(unittest.TestCase):
    def test_continuous_courses(self):
        for cols in (6,8,12):
            path = row_centres(0,cols)
            self.assertGreater(len(path), cols*65)
            self.assertTrue(all(math.isfinite(x) for p in path for x in p))
            ds=[math.dist(a,b) for a,b in zip(path,path[1:])]
            self.assertLess(max(ds),.2,"Discontinuity in yarn centreline")

    def test_same_row_across_stitches(self):
        points=row_centres(0,8)
        self.assertGreater(cumulative_length(points)[-1],10)
        self.assertEqual(len(list(frame_geometry(8,8))),10)

    def test_validations(self):
        for args in ((1,8),(8,1),(60,8)):
            with self.assertRaises(ValueError):list(frame_geometry(*args))
        with self.assertRaises(ValueError):catmull_rom([])

if __name__=="__main__":
    unittest.main()
