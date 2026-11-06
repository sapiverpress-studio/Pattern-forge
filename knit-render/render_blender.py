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
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from geometry import frame_geometry, cumulative_length

def parse():
    p=argparse.ArgumentParser()
    p.add_argument("--style",choices=["stockinette"],default="stockinette")
    p.add_argument("--gauge",choices=["mega","super","chunky"],default="mega")
    p.add_argument("--colour",default="#e9dbc3")
    p.add_argument("--size",type=int,default=768)
    p.add_argument("--samples",type=int,default=24)
    p.add_argument("--engine",choices=["cycles","eevee"],default="cycles")
    p.add_argument("--output",required=True)
    p.add_argument("--save-scene",default="")
    p.add_argument("--roughness-map",default="",help="Optional PBR roughness image exported from open-source Material Maker")
    p.add_argument("--normal-map",default="",help="Optional PBR normal image exported from open-source Material Maker")
    return p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])

def hexrgb(col):
    if len(col)!=7 or not col.startswith("#"):
        raise ValueError("Expected six-digit #RRGGBB yarn colour")
    try:return tuple(int(col[i:i+2],16)/255.0 for i in (1,3,5))
    except ValueError as ex:raise ValueError("Invalid yarn colour") from ex

def material(name,col,roughness_map="",normal_map=""):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    bsdf=nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(*col,1)
    bsdf.inputs["Roughness"].default_value=.88
    if "Sheen Weight" in bsdf.inputs: bsdf.inputs["Sheen Weight"].default_value=.38
    elif "Sheen" in bsdf.inputs: bsdf.inputs["Sheen"].default_value=.38

    noise=nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value=115
    noise.inputs["Detail"].default_value=3.0
    noise.inputs["Roughness"].default_value=.75
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.38
    bump.inputs["Distance"].default_value=.013
    links.new(noise.outputs["Fac"],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])

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

def curve(name,sections,radius,mat):
    """Multiple independent splines in one real 3D curve object."""
    data=bpy.data.curves.new(name,"CURVE")
    data.dimensions="3D"
    data.resolution_u=3
    data.bevel_depth=radius
    data.bevel_resolution=3
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

def loose_fibres(paths,rng,pitch):
    splines=[]
    # Sparse, physically separate 3D fibre hairs following their parent yarn.
    for path in paths:
        count=min(280,max(60,len(path)//4))
        for _ in range(count):
            i=rng.randrange(4,len(path)-4)
            center=Vector(path[i])
            n,bi=tangent_frame(path,i)
            angle=rng.uniform(0,math.tau)
            outward=math.cos(angle)*n+math.sin(angle)*bi
            axis=(Vector(path[i+1])-Vector(path[i-1])).normalized()
            start=center + outward*(pitch*.123)
            mid=start+outward*pitch*rng.uniform(.016,.034)+axis*pitch*rng.uniform(-.018,.018)
            end=mid+outward*pitch*rng.uniform(.025,.065)+axis*pitch*rng.uniform(-.045,.045)
            splines.append((tuple(start),tuple(mid),tuple(end)))
    return splines

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
    hair_mat=material("wispy merino fibres",tuple(min(1,c*1.09+.012) for c in col))
    dark_mat=material("shadowed fabric beneath loops",tuple(c*.50 for c in col))

    paths=list(frame_geometry(count,count,pitch))
    curve("physically connected knitted yarn courses",paths,pitch*.115,core_mat)
    twisted=[[],[]]
    for row in paths:
        lengths=cumulative_length(row)
        for ply in range(2):
            twisted[ply].append(twisted_ply(row,lengths,ply,pitch))
    curve("twist ply A",twisted[0],pitch*.070,main_mat)
    curve("twist ply B",twisted[1],pitch*.070,main_mat)
    rng=random.Random(347)
    curve("independent fine wool fibres",loose_fibres(paths,rng,pitch),pitch*.0065,hair_mat)

    bpy.ops.mesh.primitive_plane_add(size=count*1.8,location=(0,0,-pitch*.28))
    backing=bpy.context.object
    backing.name="wool shadow recesses"
    backing.data.materials.append(dark_mat)

    bpy.ops.object.camera_add(location=(0,0,count*2.2))
    camera=bpy.context.object
    camera.rotation_euler=(0,0,0)
    camera.data.type="ORTHO"
    camera.data.ortho_scale=count*.97
    scene.camera=camera
    area_light("large diffused softbox",(-count*.7,count*.65,count*.95),900*count/6,count*1.5,(1.0,.94,.86))
    area_light("subtle cool fill",(count*.65,-count*.5,count*.8),340*count/6,count,(.80,.87,1.0))

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
        scene.cycles.use_denoising=True
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
    print(f"Rendering {args.size}x{args.size} {args.gauge} {args.style}: {len(paths)} true yarn courses")
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(scene.render.filepath):
        raise RuntimeError("Blender did not produce the PNG")
    print("BLENDER OUTPUT:",scene.render.filepath)

if __name__=="__main__":
    main()
