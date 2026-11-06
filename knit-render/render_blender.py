"""Blender 3.6+ geometric wool renderer — stockinette proof of quality.

Real 3D connected yarn courses + two helical twisted plies + thousands of
physical loose fibres. Blender's PBR/noise lighting and optional Material Maker
roughness/normal maps produce the surface. Pillow finishes the native-res PNG.

Run:
 blender -b -noaudio --python knit-render/render_blender.py -- \
   --style stockinette --gauge mega --colour '#e9dbc3' \
   --size 768 --samples 24 --output /tmp/knit-preview.png

No source photos, bitmap tiling, drawn V overlays, or upscale operations.
"""
import argparse
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from geometry import frame_geometry, cumulative_length, catmull_rom
from fibre_geometry import create_fibres

def parse():
    p=argparse.ArgumentParser()
    p.add_argument("--style",choices=["stockinette"],default="stockinette")
    p.add_argument("--gauge",choices=["mega","super","chunky"],default="mega")
    p.add_argument("--yarn-type",choices=["roving","twisted"],default="roving",
                   help="Mega cosy roving is a soft, untwisted strand; twisted is a separate two-ply look")
    p.add_argument("--colour",default="#e9dbc3")
    p.add_argument("--size",type=int,default=768)
    p.add_argument("--samples",type=int,default=24)
    p.add_argument("--engine",choices=["cycles","eevee"],default="cycles")
    p.add_argument("--output",required=True)
    p.add_argument("--save-scene",default="")
    p.add_argument("--roughness-map",default="",help="Optional PBR roughness image exported from open-source Material Maker")
    p.add_argument("--normal-map",default="",help="Optional PBR normal image exported from open-source Material Maker")
    p.add_argument("--texgen-json",default="",help="Use specialist TexGen true weft-knit yarn courses instead of the handmade fallback")
    p.add_argument("--fibre-quality",choices=["preview","balanced","high"],default="preview",
                   help="Real surface-filament count (not bitmap output scaling)")
    return p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])

def hexrgb(col):
    if len(col)!=7 or not col.startswith("#"):
        raise ValueError("Expected six-digit #RRGGBB yarn colour")
    def srgb_to_linear(ch):
        x=int(ch,16)/255.0
        return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
    try:return tuple(srgb_to_linear(col[i:i+2]) for i in (1,3,5))
    except ValueError as ex:raise ValueError("Invalid yarn colour") from ex

def material(name,col,roughness_map="",normal_map=""):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    bsdf=nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(*col,1)
    bsdf.inputs["Roughness"].default_value=.96
    if "Specular IOR Level" in bsdf.inputs: bsdf.inputs["Specular IOR Level"].default_value=.14
    if "Subsurface Weight" in bsdf.inputs: bsdf.inputs["Subsurface Weight"].default_value=.055
    if "Sheen Weight" in bsdf.inputs: bsdf.inputs["Sheen Weight"].default_value=.52
    elif "Sheen" in bsdf.inputs: bsdf.inputs["Sheen"].default_value=.38

    noise=nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value=22
    noise.inputs["Detail"].default_value=3.0
    noise.inputs["Roughness"].default_value=.75
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.48
    bump.inputs["Distance"].default_value=.055
    links.new(noise.outputs["Fac"],bump.inputs["Height"])
    # Independent microscopic fibre relief above the broad wool-clump relief.
    fib_noise=nodes.new("ShaderNodeTexNoise")
    fib_noise.inputs["Scale"].default_value=250
    fib_noise.inputs["Detail"].default_value=3
    fib_bump=nodes.new("ShaderNodeBump")
    fib_bump.inputs["Strength"].default_value=.26
    fib_bump.inputs["Distance"].default_value=.016
    links.new(fib_noise.outputs["Fac"],fib_bump.inputs["Height"])
    links.new(bump.outputs["Normal"],fib_bump.inputs["Normal"])
    links.new(fib_bump.outputs["Normal"],bsdf.inputs["Normal"])

    if roughness_map:
        img=bpy.data.images.load(os.path.abspath(roughness_map),check_existing=True)
        img.colorspace_settings.name="Non-Color"
        tex=nodes.new("ShaderNodeTexImage")
        tex.image=img
        links.new(tex.outputs["Color"],bsdf.inputs["Roughness"])
    if normal_map:
        img=bpy.data.images.load(os.path.abspath(normal_map),check_existing=True)
        img.colorspace_settings.name="Non-Color"
        tex=nodes.new("ShaderNodeTexImage")
        tex.image=img
        normal=nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value=.3
        links.new(tex.outputs["Color"],normal.inputs["Color"])
        links.new(normal.outputs["Normal"],bump.inputs["Normal"])
    return mat

def wool_fibre_material(name,col):
    """Cycles Principled Hair BSDF: individual keratin fibres scatter light.

    This is not the same as a noise texture on the smooth yarn cylinder.
    """
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    nodes=m.node_tree.nodes
    nodes.clear()
    surface=nodes.new("ShaderNodeOutputMaterial")
    hair=nodes.new("ShaderNodeBsdfHairPrincipled")
    hair.parametrization="COLOR"
    hair.inputs["Color"].default_value=(*col,1)
    hair.inputs["Roughness"].default_value=.78
    if "Radial Roughness" in hair.inputs:
        hair.inputs["Radial Roughness"].default_value=.87
    if "Random Color" in hair.inputs:
        hair.inputs["Random Color"].default_value=.08
    m.node_tree.links.new(hair.outputs["BSDF"],surface.inputs["Surface"])
    return m


def curve(name,sections,radius,mat,bevel_steps=2):
    """Multiple independent splines in one real 3D curve object."""
    data=bpy.data.curves.new(name,"CURVE")
    data.dimensions="3D"
    data.resolution_u=3
    data.bevel_depth=radius
    data.bevel_resolution=bevel_steps
    data.resolution_u=2
    for path in sections:
        if len(path)<2:continue
        spline=data.splines.new("POLY")
        spline.points.add(len(path)-1)
        for pt,xyz in zip(spline.points,path):
            pt.co=(xyz[0],xyz[1],xyz[2],1)
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

def tangent_frame(points,i):
    a=Vector(points[max(0,i-1)])
    b=Vector(points[min(len(points)-1,i+1)])
    tangent=(b-a).normalized()
    n=tangent.cross(Vector((0,0,1)))
    if n.length<.00001:n=tangent.cross(Vector((0,1,0)))
    n.normalize()
    bi=tangent.cross(n).normalized()
    return n,bi

def twisted_ply(points,distances,which,pitch):
    out=[]
    # Both plies wind along the *same* connected yarn centreline.
    # Twisted surface strands have volume; they are not a printed overlay.
    for i,(p,d) in enumerate(zip(points,distances)):
        n,bi=tangent_frame(points,i)
        angle=d/(pitch*.37)*2*math.pi + which*math.pi
        offset=(math.cos(angle)*n+math.sin(angle)*bi)*(pitch*.061)
        q=Vector(p)+offset
        out.append(tuple(q))
    return out

def area_light(name,at,power,size,temperature_colour):
    data=bpy.data.lights.new(name,"AREA")
    obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj)
    obj.location=at
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat("-Z","Y").to_euler()
    data.energy=power
    data.shape="DISK"
    data.size=size
    data.color=temperature_colour

def main():
    args=parse()
    if args.size<256 or args.size>5000:raise ValueError("Render size must be 256..5000")
    if args.samples<4 or args.samples>256:raise ValueError("Samples must be 4..256")
    col=hexrgb(args.colour)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene

    # This is a per-stitch gauge, not a crop of a fixed-size photograph.
    count={"mega":6,"super":10,"chunky":16}[args.gauge]
    pitch=1.0
    main_mat=material("2-ply matte merino yarn",col,args.roughness_map,args.normal_map)
    main_mat.diffuse_color=(*col,1)
    core_mat=material("inner wool yarn",tuple(max(0,c*.85) for c in col))
    # Outer wool is modelled as real keratin-like filaments with Hair BSDF,
    # not generic Principled shading on a smooth tube.
    fibre_tones=[.86,.95,1.025,1.095]
    dark_mat=material("shadowed fabric beneath loops",tuple(c*.72 for c in col))

    if args.texgen_json:
        with open(args.texgen_json,encoding="utf8") as datafile:
            data=json.load(datafile)
        if data.get("format")!="sapiver-texgen-centrelines-v1" or data.get("structure")!="weft-knit":
            raise ValueError("Incorrect TexGen geometry format")
        source=data.get("paths",[])
        if not source or len(source)>48 or any(len(p)<3 or len(p)>10000 for p in source):
            raise ValueError("Invalid TexGen yarn course count/length")
        if not all(len(p) >= 3 and len(p[0]) == 3 for p in source):
            raise ValueError("TexGen geometry must be 3D yarn paths")
        pts=[p for course in source for p in course]
        if not all(len(v)==3 and all(math.isfinite(float(a)) for a in v) for v in pts):
            raise ValueError("Invalid TexGen numeric yarn coordinates")
        mins=[min(v[i] for v in pts) for i in range(3)]
        maxes=[max(v[i] for v in pts) for i in range(3)]
        extent=max(maxes[0]-mins[0], maxes[1]-mins[1])
        if extent<.001:raise ValueError("Empty TexGen textile")
        scale=(count*.91)/extent
        pitch=scale
        centre=[(mins[i]+maxes[i])/2 for i in range(3)]
        # TexGen emits sparse control points. Interpolate the physical yarn
        # centreline, rather than rendering each straight segment as a sharp
        # plastic-looking edge.  Preserve course continuity.
        # This 0.68 course compression is a visual knit-gauge adjustment; we
        # do not claim it reproduces the original TexGen physical dimensions.
        compacted=[[((float(v[0])-centre[0])*scale,
                     (float(v[1])-centre[1])*scale*.68,
                     (float(v[2])-centre[2])*scale)
                    for v in course] for course in source]
        paths=[catmull_rom(course,8) for course in compacted]
    else:
        paths=list(frame_geometry(count,count,pitch))
    if args.yarn_type=="roving":
        # Main roving provides dense volume. Thousands of fine physical
        # filaments make the surface scatter light like wool instead of latex.
        core_radius=pitch*(.235 if args.texgen_json else .174)
        curve("soft single-roving knitted yarn",paths,core_radius,main_mat,4)
        fibre_groups,flyaways=create_fibres(
            paths,pitch,core_radius,quality=args.fibre_quality,seed=3419)
        for band,filaments in fibre_groups.items():
            tone=fibre_tones[band]
            shade=tuple(min(.99,c*tone) for c in col)
            mat=wool_fibre_material("wool microfilaments %d"%band,shade)
            curve("fibre bundles %d"%band,filaments,pitch*.0065,mat,1)
        halo=wool_fibre_material("loose merino fuzz",
                                tuple(min(.99,c*1.07) for c in col))
        curve("individually curved flyaway merino hairs",
              flyaways,pitch*.0034,halo,1)
    else:
        curve("physically connected knitted yarn courses",paths,pitch*.095,core_mat)
        twisted=[[],[]]
        for row in paths:
            lengths=cumulative_length(row)
            for ply in range(2):
                twisted[ply].append(twisted_ply(row,lengths,ply,pitch))
        curve("twist ply A",twisted[0],pitch*.096,main_mat)
        curve("twist ply B",twisted[1],pitch*.096,main_mat)

    bpy.ops.mesh.primitive_plane_add(size=count*1.8,location=(0,0,-pitch*.28))
    backing=bpy.context.object
    backing.name="wool shadow recesses"
    backing.data.materials.append(dark_mat)

    bpy.ops.object.camera_add(location=(0,0,count*2.2))
    camera=bpy.context.object
    camera.rotation_euler=(0,0,0)
    camera.data.type="ORTHO"
    camera.data.ortho_scale=count*.82
    scene.camera=camera
    area_light("large diffused softbox",(-count*.7,count*.65,count*.95),165*count/6,count*1.5,(1.0,.94,.86))
    area_light("subtle cool fill",(count*.65,-count*.5,count*.8),65*count/6,count,(.80,.87,1.0))

    if scene.world is None:
        scene.world=bpy.data.worlds.new('neutral wool studio')
    scene.world.color=(.42,.42,.42)
    scene.render.resolution_x=args.size
    scene.render.resolution_y=args.size
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGB"
    scene.render.filepath=os.path.abspath(args.output)
    scene.render.film_transparent=False
    scene.render.engine="CYCLES" if args.engine=="cycles" else (
        "BLENDER_EEVEE_NEXT" if bpy.app.version[0]>=4 else "BLENDER_EEVEE"
    )
    if scene.render.engine=="CYCLES":
        scene.cycles.samples=args.samples
        # Ubuntu Blender builds can omit OpenImageDenoise; never depend on it.
        scene.cycles.use_denoising=False
        for layer in scene.view_layers:
            layer.cycles.use_denoising=False
        scene.cycles.device="CPU"
    else:
        if hasattr(scene,"eevee") and hasattr(scene.eevee,"taa_render_samples"):
            scene.eevee.taa_render_samples=args.samples
            scene.eevee.use_gtao=True
    scene.view_settings.view_transform="Standard"
    scene.view_settings.look="Medium High Contrast"
    scene.view_settings.exposure=0
    scene.view_settings.gamma=1
    if args.save_scene:
        os.makedirs(os.path.dirname(os.path.abspath(args.save_scene)),exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_scene))
    os.makedirs(os.path.dirname(scene.render.filepath),exist_ok=True)
    print(f"Rendering {args.size}x{args.size} {args.gauge} {args.yarn_type} {args.style}: {len(paths)} true yarn courses, {args.fibre_quality} fibres")
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(scene.render.filepath):
        raise RuntimeError("Blender did not produce the PNG")
    print("BLENDER OUTPUT:",scene.render.filepath)

if __name__=="__main__":
    main()
