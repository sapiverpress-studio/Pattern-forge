"""Blender Cycles wool material proof — licensed shader asset, not an invented V overlay.

Two explicitly different modes:
  baked-cc0: real CC0 diffuse/normal/AO textures baked from Simon
      Thommes's procedural Knittr work, published by CJT-Jackton.
  knittr-original: append a user-supplied, original CC0 Knittr .blend
      obtained legitimately from Simon Thommes. This mode fails closed
      if the file/material is absent; it must NEVER silently fake Knittr.

Usage:
  blender -b -noaudio --python-exit-code 5 \
    --python knit-open-source/render_material.py -- \
    --mode baked-cc0 --source-dir /tmp/knit-maps --size 720 \
    --samples 24 --output /tmp/knit-raw.png
"""
import argparse
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=("baked-cc0", "knittr-original"), default="baked-cc0")
    p.add_argument("--source-dir", default="")
    p.add_argument("--knittr-blend", default="")
    p.add_argument("--knittr-material", default="")
    p.add_argument("--size", type=int, default=720)
    p.add_argument("--samples", type=int, default=24)
    p.add_argument("--output", required=True)
    p.add_argument("--save-scene", default="")
    a = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    return p.parse_args(a)


def image_texture(nodes, path, noncolor=False):
    image = bpy.data.images.load(str(path.resolve()), check_existing=True)
    if noncolor:
        image.colorspace_settings.name = "Non-Color"
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "REPEAT"
    tex.interpolation = "Linear"
    return tex


def setup_baked(source_dir):
    """Use genuine third-party knit-derived PBR maps, not our own loop algorithm."""
    folder = Path(source_dir).resolve()
    names = ("Knitwear_Diffuse.png", "Knitwear_Normal.png", "Knitwear_Occulsion.png")
    assets = [folder / f for f in names]
    missing = [str(f) for f in assets if not f.is_file()]
    if missing:
        raise FileNotFoundError("Missing CC0 knit-source PBR map(s): " + ", ".join(missing))
    mat = bpy.data.materials.new("CC0 wool from original procedural Knittr-derived maps")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.94
    if "Sheen Weight" in bsdf.inputs:
        bsdf.inputs["Sheen Weight"].default_value = 0.45
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.20
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    texcoord = nodes.new("ShaderNodeTexCoord")
    diffuse = image_texture(nodes, assets[0])
    normal = image_texture(nodes, assets[1], True)
    ao = image_texture(nodes, assets[2], True)
    for node in (diffuse, normal, ao):
        links.new(texcoord.outputs["UV"], node.inputs["Vector"])

    # Original Knittr-derived material maps supply stitches and knitted relief.
    # Additional procedural fibre relief is subtle rather than fake V overlays.
    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 0.65
    links.new(diffuse.outputs["Color"], mix.inputs[1])
    links.new(ao.outputs["Color"], mix.inputs[2])
    links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    normalmap = nodes.new("ShaderNodeNormalMap")
    normalmap.inputs["Strength"].default_value = 0.62
    links.new(normal.outputs["Color"], normalmap.inputs["Color"])
    micro = nodes.new("ShaderNodeTexNoise")
    micro.inputs["Scale"].default_value = 430.0
    micro.inputs["Detail"].default_value = 3.2
    links.new(texcoord.outputs["UV"], micro.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.11
    bump.inputs["Distance"].default_value = 0.008
    links.new(micro.outputs["Fac"], bump.inputs["Height"])
    links.new(normalmap.outputs["Normal"], bump.inputs["Normal"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def setup_original(blend_path, material_name):
    """Append creator's CC0 Knittr material without modifying its node topology."""
    path = Path(blend_path).resolve()
    if not path.is_file() or path.suffix.lower() != ".blend":
        raise FileNotFoundError(
            "The original Knittr .blend has not been supplied; "
            "obtain it from Simon Thommes's $0+ Gumroad listing."
        )
    with bpy.data.libraries.load(str(path), link=False) as (data_from, data_to):
        available = data_from.materials
        matches = [name for name in available if "knit" in name.lower()]
        name = material_name or (matches[0] if matches else None)
        if not name or name not in available:
            raise RuntimeError("No matching Knittr material found. Available: " +
                               ", ".join(available[:40]))
        data_to.materials = [name]
    mat = data_to.materials[0]
    if mat is None or not mat.use_nodes:
        raise RuntimeError("Unable to load usable Knittr node material")
    print("ORIGINAL KNITTR MATERIAL LOADED:", mat.name)
    return mat


def main():
    a = parse_args()
    if a.size < 256 or a.size > 5000:
        raise ValueError("Size must be between 256 and 5000")
    if a.samples < 4 or a.samples > 256:
        raise ValueError("Samples must be between 4 and 256")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Wool studio world")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.86, 0.86, 0.86, 1)
    bg.inputs["Strength"].default_value = 0.16

    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
    plane = bpy.context.object
    plane.name = "Single tile with seamless UVs"
    if a.mode == "baked-cc0":
        material = setup_baked(a.source_dir)
    else:
        material = setup_original(a.knittr_blend, a.knittr_material)
    plane.data.materials.append(material)

    bpy.ops.object.camera_add(location=(0, 0, 4))
    camera = bpy.context.object
    camera.rotation_euler = (0, 0, 0)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.0
    scene.camera = camera
    # A large centred, diffused light avoids hard top/left-to-right gradients.
    data = bpy.data.lights.new("Diffuse overhead softbox", "AREA")
    lamp = bpy.data.objects.new("Diffuse overhead softbox", data)
    bpy.context.collection.objects.link(lamp)
    lamp.location = (0, 0, 4.5)
    lamp.rotation_euler = (Vector((0, 0, 0)) - lamp.location).to_track_quat("-Z", "Y").to_euler()
    data.energy = 30
    data.shape = "DISK"
    data.size = 6.0

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = a.samples
    scene.cycles.use_denoising = False
    for layer in scene.view_layers:
        layer.cycles.use_denoising = False
    scene.render.resolution_x = a.size
    scene.render.resolution_y = a.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = str(Path(a.output).resolve())
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.render.filepath = str(Path(a.output).resolve())
    Path(scene.render.filepath).parent.mkdir(parents=True, exist_ok=True)
    if a.save_scene:
        path = Path(a.save_scene).resolve()
        path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(path))
    print("WOOL ENGINE:", a.mode, "SIZE:", a.size, "SAMPLES:", a.samples, flush=True)
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(scene.render.filepath):
        raise RuntimeError("Blender failed to write the expected PNG")
    print("WOOL RENDER SAVED:", scene.render.filepath, flush=True)


if __name__ == "__main__":
    main()
