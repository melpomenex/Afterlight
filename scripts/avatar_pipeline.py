#!/usr/bin/env python3
"""
Avatar Authoring Pipeline Utilities for Blender.

Provides standardized rig creation, material setup, preview rendering (512x512),
and GLB export adhering strictly to Afterlight's contract (design D3, D7, D8).
"""

import os
import bpy
import bmesh
from mathutils import Vector, Euler

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    return scene

def create_material(name, base_color, roughness=0.7, metalness=0.1, emissive=None):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = metalness
        if emissive and 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = emissive
            if 'Emission Strength' in bsdf.inputs:
                bsdf.inputs['Emission Strength'].default_value = 1.5
    return mat

def create_box(name, size, location, material=None, parent=None):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj

def create_cylinder(name, radius, depth, location, material=None, parent=None, segments=16):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj

def create_cone(name, radius1, radius2, depth, location, material=None, parent=None, segments=16):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius1, radius2=radius2, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj

def create_icosphere(name, radius, location, material=None, parent=None, subdivisions=2):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = location
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj

def setup_avatar_rig(avatar_id, rig_kind='humanoid'):
    """
    Creates standard rig hierarchy matching design D3.
    """
    col = bpy.context.scene.collection

    # 1. Root container
    root_obj = bpy.data.objects.new(f"AVA_{avatar_id}_ROOT", None)
    root_obj.location = (0, 0, 0)
    col.objects.link(root_obj)

    # 2. AL_Rig empty
    rig_obj = bpy.data.objects.new("AL_Rig", None)
    rig_obj.location = (0, 0, 0)
    rig_obj.parent = root_obj
    col.objects.link(rig_obj)

    # 3. AL_Root at pelvis/torso center
    al_root = bpy.data.objects.new("AL_Root", None)
    al_root.location = (0, 0, 0.9)
    al_root.parent = rig_obj
    col.objects.link(al_root)

    # 4. AL_Head at neck pivot
    al_head = bpy.data.objects.new("AL_Head", None)
    al_head.location = (0, 0, 1.45)
    al_head.parent = rig_obj
    col.objects.link(al_head)

    # Arms and legs for humanoid rigs
    al_arm_l = None
    al_arm_r = None
    al_leg_l = None
    al_leg_r = None

    if rig_kind in ('humanoid', 'humanoid-heavy'):
        al_arm_l = bpy.data.objects.new("AL_Arm_L", None)
        al_arm_l.location = (-0.38, 0, 1.2)
        al_arm_l.parent = rig_obj
        col.objects.link(al_arm_l)

        al_arm_r = bpy.data.objects.new("AL_Arm_R", None)
        al_arm_r.location = (0.38, 0, 1.2)
        al_arm_r.parent = rig_obj
        col.objects.link(al_arm_r)

        hip_z = 0.4 if rig_kind == 'humanoid-heavy' else 0.5
        al_leg_l = bpy.data.objects.new("AL_Leg_L", None)
        al_leg_l.location = (-0.18, 0, hip_z)
        al_leg_l.parent = rig_obj
        col.objects.link(al_leg_l)

        al_leg_r = bpy.data.objects.new("AL_Leg_R", None)
        al_leg_r.location = (0.18, 0, hip_z)
        al_leg_r.parent = rig_obj
        col.objects.link(al_leg_r)

    return {
        'root': root_obj,
        'rig': rig_obj,
        'al_root': al_root,
        'al_head': al_head,
        'al_arm_l': al_arm_l,
        'al_arm_r': al_arm_r,
        'al_leg_l': al_leg_l,
        'al_leg_r': al_leg_r,
    }

def render_preview_image(preview_path):
    """
    Renders a 512x512 preview image with soft lighting, then removes camera and lights.
    """
    scene = bpy.context.scene
    col = scene.collection

    # Create camera
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 48
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    cam_obj.location = (0, -3.2, 1.1)
    cam_obj.rotation_euler = (1.5708, 0, 0)
    col.objects.link(cam_obj)
    scene.camera = cam_obj

    # Create soft lights
    light_key_data = bpy.data.lights.new("KeyLight", 'SUN')
    light_key_data.energy = 2.5
    light_key = bpy.data.objects.new("KeyLight", light_key_data)
    light_key.location = (2, -3, 3)
    light_key.rotation_euler = (0.7, 0.4, -0.6)
    col.objects.link(light_key)

    light_fill_data = bpy.data.lights.new("FillLight", 'SUN')
    light_fill_data.energy = 1.0
    light_fill = bpy.data.objects.new("FillLight", light_fill_data)
    light_fill.location = (-2, -3, 2)
    light_fill.rotation_euler = (0.7, -0.4, 0.6)
    col.objects.link(light_fill)

    # Render settings
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 24
    scene.render.film_transparent = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.filepath = preview_path

    os.makedirs(os.path.dirname(preview_path), exist_ok=True)
    bpy.ops.render.render(write_still=True)

    # Clean up render objects so glTF export has no cameras/lights
    col.objects.unlink(cam_obj)
    bpy.data.objects.remove(cam_obj)
    bpy.data.cameras.remove(cam_data)

    col.objects.unlink(light_key)
    bpy.data.objects.remove(light_key)
    bpy.data.lights.remove(light_key_data)

    col.objects.unlink(light_fill)
    bpy.data.objects.remove(light_fill)
    bpy.data.lights.remove(light_fill_data)

def export_avatar_files(avatar_id, blend_path, glb_path, preview_path):
    """
    Saves the .blend, renders preview.png, and exports .glb.
    """
    os.makedirs(os.path.dirname(blend_path), exist_ok=True)
    os.makedirs(os.path.dirname(glb_path), exist_ok=True)
    os.makedirs(os.path.dirname(preview_path), exist_ok=True)

    # 1. Save blend
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[{avatar_id}] Saved blend: {blend_path}")

    # 2. Render preview
    render_preview_image(preview_path)
    print(f"[{avatar_id}] Rendered preview: {preview_path}")

    # 3. Export GLB
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False
    )
    print(f"[{avatar_id}] Exported GLB: {glb_path}")
