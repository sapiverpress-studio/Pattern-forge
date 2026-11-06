"""Deterministic, testable wool microstructure for Blender curves.

A smooth yarn cylinder is not wool. These paths follow the physical parent
course, with distinct surface filaments and curved flyaway hairs. They do not
stamp pixels, copy UV squares or grow detached V glyphs.
"""
import math
import random

TAU=2*math.pi

def plus(a,b):
    return tuple(x+y for x,y in zip(a,b))

def times(v,n):
    return tuple(x*n for x in v)

def sub(a,b):
    return tuple(x-y for x,y in zip(a,b))

def dot(a,b):
    return sum(x*y for x,y in zip(a,b))

def cross(a,b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2],
            a[0]*b[1]-a[1]*b[0])

def unit(v):
    n=math.sqrt(dot(v,v))
    if n<1e-10:
        return (1.,0.,0.)
    return times(v,1/n)

def distance(a,b):
    return math.sqrt(dot(sub(b,a),sub(b,a)))

def basis(path,i):
    tangent=unit(sub(path[min(i+1,len(path)-1)],
                     path[max(i-1,0)]))
    normal=unit(cross(tangent,(0.,0.,1.)))
    if dot(normal,normal)<.01 or abs(dot(tangent,(0.,0.,1.)))>.99:
        normal=unit(cross(tangent,(0.,1.,0.)))
    other=unit(cross(tangent,normal))
    return tangent,normal,other

def validate(paths,pitch,radius):
    if not paths or len(paths)>50 or not math.isfinite(pitch) or pitch<=0:
        raise ValueError("Invalid wool geometry dimensions")
    if not math.isfinite(radius) or not (.02*pitch)<radius<(.4*pitch):
        raise ValueError("Invalid yarn radius")
    for p in paths:
        if len(p)<5 or len(p)>10000:
            raise ValueError("Invalid yarn path length")
        if any(len(q)!=3 or not all(math.isfinite(x) for x in q) for q in p):
            raise ValueError("Wool geometry coordinates must be finite triples")

def create_fibres(paths,pitch,radius=.19,quality="preview",seed=3419):
    """Return grouped longer surface filaments and short curved loose fibres.

    All dimensions are in scene units. Preview is intentionally bounded so the
    GH Action can test this without exhausting CPU RAM. Quality controls the
    *number of real fibres*, not an upscaled base texture.
    """
    if quality not in ("preview","balanced","high"):
        raise ValueError("Invalid fibre quality")
    validate(paths,pitch,radius)
    count={"preview":44,"balanced":72,"high":120}[quality]
    fly_count={"preview":240,"balanced":480,"high":850}[quality]
    stride={"preview":4,"balanced":3,"high":2}[quality]
    grouped={0:[],1:[],2:[],3:[]}
    flyaways=[]
    rng=random.Random(seed)
    for row,path in enumerate(paths):
        idxs=list(range(0,len(path),stride))
        if idxs[-1]!=len(path)-1:idxs.append(len(path)-1)
        cumul=[0.]
        for a,b in zip(path,path[1:]):
            cumul.append(cumul[-1]+distance(a,b))
        frames={i:basis(path,i) for i in idxs}
        for strand in range(count):
            # Distributed around whole surface, with small low-frequency bends
            # and mixed-length slow turns typical of soft lightly spun merino.
            phase=TAU*(strand+.25*rng.random())/count
            winding=rng.uniform(.25,.72)
            wiggle=rng.uniform(.12,.34)
            salt=rng.uniform(0,TAU)
            rad_scale=rng.uniform(.965,1.025)
            pts=[]
            for i in idxs:
                _,n,bi=frames[i]
                t=cumul[i]/max(pitch,.001)
                angle=phase + t*winding + wiggle*math.sin(t*2.3+salt)
                r=radius*rad_scale*(1+.017*math.sin(t*3.2+salt))
                offset=plus(times(n,r*math.cos(angle)),
                            times(bi,r*math.sin(angle)))
                pts.append(plus(path[i],offset))
            grouped[strand%4].append(pts)
        for _ in range(fly_count):
            i=rng.randrange(2,len(path)-2)
            center=path[i]
            tangent,n,bi=basis(path,i)
            angle=rng.uniform(0,TAU)
            radial=unit(plus(times(n,math.cos(angle)),
                             times(bi,math.sin(angle))))
            start=plus(center,times(radial,radius*1.008))
            length=pitch*rng.uniform(.09,.29)
            along=pitch*rng.uniform(-.08,.08)
            sideways=unit(cross(tangent,radial))
            bend=length*rng.uniform(-.20,.20)
            q1=plus(start,plus(times(radial,length*.19),
                               times(tangent,along*.22)))
            q2=plus(start,plus(times(radial,length*.62),
                               plus(times(tangent,along*.67),
                                    times(sideways,bend))))
            tip=plus(start,plus(times(radial,length),
                                plus(times(tangent,along),
                                     times(sideways,bend*.7))))
            flyaways.append((start,q1,q2,tip))
    return grouped,flyaways
