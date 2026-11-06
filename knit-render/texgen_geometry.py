"""TexGen / PyTexGen GPL-2.0+ true weft-knit geometry to Blender-friendly JSON.

TexGen is a specialist textile modeller, not a shader. This probe uses its
official CTextileWeftKnit class rather than inventing identical U paths.
It generates *geometry data* only. Blender can later shade its yarns.

Installation: pip install pytexgen==1.2.1
Usage: python knit-render/texgen_geometry.py --output /tmp/texgen-weft.json
"""
import argparse
import json
import math
from pathlib import Path

def point_xyz(position):
    xyz=[]
    for label in ("x","y","z"):
        attr=getattr(position,label,None)
        if attr is None:
            attr=getattr(position,label.upper(),None)
        if attr is None:
            raise TypeError(f"Cannot extract {label} coordinate from {type(position).__name__}")
        xyz.append(float(attr() if callable(attr) else attr))
    if not all(math.isfinite(c) for c in xyz):
        raise ValueError("Nonfinite yarn node position")
    return xyz

def nodes_for_yarn(yarn):
    errors=[]
    for method in ("GetSlaveNodes","GetMasterNodes"):
        f=getattr(yarn,method,None)
        if not callable(f):continue
        try:
            nodes=list(f())
            if len(nodes)<2:continue
            paths=[]
            for node in nodes:
                pos=node.GetPosition() if hasattr(node,"GetPosition") else node
                paths.append(point_xyz(pos))
            if len(paths)>1:
                return paths,method
        except Exception as exc:
            errors.append(f"{method}: {exc}")
    raise RuntimeError(f"No readable yarn geometry from {type(yarn)}: {errors}")

def build(wales=8,courses=8):
    import pytexgen as tg
    if not 2<=wales<=24 or not 2<=courses<=24:
        raise ValueError("wales/courses must each be 2..24")
    if not hasattr(tg,"CTextileWeftKnit"):
        raise RuntimeError("PyTexGen build does not expose CTextileWeftKnit")
    # From the documented TexGen WeftKnitClass example:
    # wales, courses, wale width, loop height, refine, yarn thickness.
    textile=tg.CTextileWeftKnit(wales,courses,1.0,1.2,1,0.15)
    if hasattr(textile,"SetLoopModel") and hasattr(tg,"RAVANDI_2021"):
        textile.SetLoopModel(tg.RAVANDI_2021)
    textile.SetResolution(18,48)
    textile.AssignDefaultDomain()
    # Force generated yarn construction before reading centerlines.
    if hasattr(textile,"BuildTextile"):
        textile.BuildTextile()
    yarns=textile.GetYarns()
    result=[]
    diagnostics=[]
    for idx,yarn in enumerate(yarns):
        points,method=nodes_for_yarn(yarn)
        result.append(points)
        diagnostics.append({"yarn":idx,"nodes":len(points),"source":method})
    if not result:
        raise RuntimeError("TexGen generated zero yarns")
    return {"format":"sapiver-texgen-centrelines-v1",
            "engine":"PyTexGen GPL-2.0-or-later",
            "structure":"weft-knit",
            "wales":wales,"courses":courses,
            "paths":result,"diagnostics":diagnostics}

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--wales",type=int,default=8)
    p.add_argument("--courses",type=int,default=8)
    p.add_argument("--output",required=True)
    args=p.parse_args()
    result=build(args.wales,args.courses)
    dest=Path(args.output)
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,separators=(",",":")),encoding="utf8")
    print(json.dumps({"output":str(dest),"yarn_count":len(result["paths"]),
                      "first":result["diagnostics"][:3]},indent=2))
