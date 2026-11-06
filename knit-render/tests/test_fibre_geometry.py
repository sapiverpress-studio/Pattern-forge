"""Wool filament regression checks, no Blender dependency."""
import math
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fibre_geometry import create_fibres

def yarn(rows=3,points=80):
    return [[(j*.075, i*.6+.11*math.sin(j*.11), .05*math.cos(j*.05))
             for j in range(points)] for i in range(rows)]

class FibreTests(unittest.TestCase):
    def test_deterministic_and_bounded(self):
        base=yarn()
        a,fly=create_fibres(base,1.0,.2,"preview",seed=37)
        b,fly_again=create_fibres(base,1.0,.2,"preview",seed=37)
        self.assertEqual(a,b)
        self.assertEqual(fly,fly_again)
        self.assertEqual(sum(map(len,a.values())),len(base)*30)
        self.assertEqual(len(fly),len(base)*130)
        self.assertEqual(len(fly[0]),3)
        self.assertTrue(all(math.isfinite(n) for group in a.values()
                            for strand in group for v in strand for n in v))
        self.assertTrue(all(math.isfinite(n) for strand in fly
                            for v in strand for n in v))
    def test_quality_and_validation(self):
        baseline=yarn(2,30)
        prev,short=create_fibres(baseline,1,.18,"preview")
        high,heavy=create_fibres(baseline,1,.18,"high")
        self.assertGreater(sum(map(len,high.values())),sum(map(len,prev.values())))
        self.assertGreater(len(heavy),len(short))
        for kwargs in ({"quality":"ultra"},{"pitch":0},{"radius":5}):
            with self.assertRaises(ValueError):
                create_fibres(baseline,**{"pitch":1,"radius":.18,"quality":"preview",**kwargs})
    def test_no_repeated_square_image(self):
        # Paths are actual independent 3D curves, not image-backed bitmap tiles.
        grouped, hairs=create_fibres(yarn(2),1,.18)
        self.assertTrue(all(len(points)>5 for paths in grouped.values()
                            for points in paths))
        self.assertTrue(all(len(h)==3 for h in hairs))

if __name__=="__main__":
    unittest.main()
