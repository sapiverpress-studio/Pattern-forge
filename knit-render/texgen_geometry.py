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

def build(wales=8,courses=8,course_overlap=0.27):
    import pytexgen as tg
    if not 2<=wales<=24 or not 2<=courses<=24:
        raise ValueError("wales/courses must each be 2..24")
    if not 0 <= course_overlap <= .45 or not math.isfinite(course_overlap):
        raise ValueError("course_overlap must be finite and between 0 and .45")
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
        # TexGen describes a knit as a master stitch with repeat vectors.
        # Expand its actual master path into connected course strands instead
        # of returning only the source unit cell or stamping a square image.
        dx=points[-1][0]-points[0][0]
        ymin=min(p[1] for p in points)
        ymax=max(p[1] for p in points)
        dy=ymax-ymin
        if dx<=0 or dy<=0:
            raise RuntimeError("TexGen unit cell must advance in X and Y")
        for row in range(courses):
            course=[]
            for col in range(wales):
                for k,p in enumerate(points):
                    if col and k==0:continue
                    local_y=(p[1]-ymin)/dy
                    # Physically separate TexGen yarn courses need projected
                    # overlap: neighbouring courses pass through preceding loops,
                    # not merely touch at a horizontal join. Lower crossovers
                    # are tucked behind upper ones in Z for over/under shading.
                    # This is a render-oriented layout, not a knitting CAM plan.
                    # Stockinette's descending/ascending legs catch light
                    # in front; the rounded upper crown and lower connectors
                    # are tucked *behind* their neighbours, not drawn as
                    # solid horizontal bars across the knitted fabric.
                    crossover_z = .40*math.sin(math.pi*local_y)-.18
                    # Gentle reproducible hand-knit variation. The shared
                    # stitch endpoint stays exact, so the course never breaks.
                    if k in (0,len(points)-1):
                        jx=jy=jz=0.
                    else:
                        jx=.014*math.sin(row*1.73+col*2.17+k*.61)
                        jy=.018*math.sin(row*2.11+col*1.39+k*.44)
                        jz=.014*math.cos(row*1.41+col*1.87+k*.57)
                    course.append([
                        p[0]+col*dx+jx,
                        p[1]+row*dy*(1-course_overlap)+jy,
                        p[2]+crossover_z+jz
                    ])
            result.append(course)
        diagnostics.append({"yarn":idx,"unit_nodes":len(points),
                            "expanded_courses":courses,
                            "wales_per_course":wales,
                            "nodes_per_course":len(result[0]),
                            "source":method})
    if not result:
        raise RuntimeError("TexGen generated zero yarns")
    return {"format":"sapiver-texgen-centrelines-v1",
            "engine":"PyTexGen GPL-2.0-or-later",
            "structure":"weft-knit",
            "wales":wales,"courses":courses,
            "course_overlap":course_overlap,
            "paths":result,"diagnostics":diagnostics}

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--wales",type=int,default=8)
    p.add_argument("--courses",type=int,default=8)
    p.add_argument("--course-overlap",type=float,default=.27,
                   help="Fraction of loop height adjacent projected yarn courses overlap")
    p.add_argument("--output",required=True)
    args=p.parse_args()
    result=build(args.wales,args.courses,args.course_overlap)
    dest=Path(args.output)
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(result,separators=(",",":")),encoding="utf8")
    print(json.dumps({"output":str(dest),"yarn_count":len(result["paths"]),
                      "first":result["diagnostics"][:3]},indent=2))
