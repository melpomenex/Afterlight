#!/usr/bin/env python3
"""
Generate the shared avatar reference rig and mannequin test asset.

Outputs:
  - assets-blender/avatars/_shared/AL_SharedRig.blend
  - public/avatars/_test/mannequin.glb
"""

import os
import sys
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
    return mat

def create_cube_mesh(name, size, location, material=None, parent=None):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    # Scale cube to desired size
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

def build_mannequin(avatar_id="mannequin"):
    scene = reset_scene()
    col = scene.collection
    
    mat_body = create_material("MAT_Body", (0.35, 0.45, 0.42, 1.0), roughness=0.7, metalness=0.1)
    mat_accent = create_material("MAT_Accent", (0.83, 0.55, 0.22, 1.0), roughness=0.6, metalness=0.1)
    
    # 1. Root container: AVA_<ID>_ROOT at origin
    root_name = f"AVA_{avatar_id}_ROOT"
    root_obj = bpy.data.objects.new(root_name, None)
    root_obj.location = (0, 0, 0)
    col.objects.link(root_obj)
    
    # 2. AL_Rig empty at origin
    rig_obj = bpy.data.objects.new("AL_Rig", None)
    rig_obj.location = (0, 0, 0)
    rig_obj.parent = root_obj
    col.objects.link(rig_obj)
    
    # 3. AL_Root at pelvis/torso center (0, 0, 0.9)
    al_root = bpy.data.objects.new("AL_Root", None)
    al_root.location = (0, 0, 0.9)
    al_root.parent = rig_obj
    col.objects.link(al_root)
    
    # Torso mesh: parented to AL_Root
    # Extends from -0.3 to +0.3 in Z (local), depth 0.3 (Y), width 0.5 (X)
    torso = create_cube_mesh("Torso", (0.5, 0.3, 0.6), (0, 0, 0), material=mat_body, parent=al_root)
    # Belt / buckle accent
    belt = create_cube_mesh("Belt", (0.52, 0.32, 0.1), (0, 0, -0.2), material=mat_accent, parent=al_root)
    
    # 4. AL_Head at neck pivot (0, 0, 1.45)
    al_head = bpy.data.objects.new("AL_Head", None)
    al_head.location = (0, 0, 1.45)
    al_head.parent = rig_obj
    col.objects.link(al_head)
    
    # Head mesh: centered at (0, 0, 0.22) relative to neck pivot, total height ~1.85m
    head = create_cube_mesh("Head", (0.36, 0.36, 0.36), (0, 0, 0.22), material=mat_body, parent=al_head)
    # Face visor in -Y (forward in Blender)
    visor = create_cube_mesh("Visor", (0.28, 0.06, 0.14), (0, -0.19, 0.22), material=mat_accent, parent=al_head)
    
    # 5. AL_Arm_L (character's left arm, X = -0.38, Y = 0, Z = 1.2)
    al_arm_l = bpy.data.objects.new("AL_Arm_L", None)
    al_arm_l.location = (-0.38, 0, 1.2)
    al_arm_l.parent = rig_obj
    col.objects.link(al_arm_l)
    
    # Left arm mesh: hangs down from pivot (local Z = -0.25)
    arm_l_mesh = create_cube_mesh("Arm_L_Mesh", (0.14, 0.16, 0.5), (0, 0, -0.25), material=mat_body, parent=al_arm_l)
    cuff_l = create_cube_mesh("Cuff_L", (0.16, 0.18, 0.08), (0, 0, -0.45), material=mat_accent, parent=al_arm_l)
    
    # 6. AL_Arm_R (character's right arm, X = 0.38, Y = 0, Z = 1.2)
    al_arm_r = bpy.data.objects.new("AL_Arm_R", None)
    al_arm_r.location = (0.38, 0, 1.2)
    al_arm_r.parent = rig_obj
    col.objects.link(al_arm_r)
    
    # Right arm mesh: hangs down from pivot (local Z = -0.25)
    arm_r_mesh = create_cube_mesh("Arm_R_Mesh", (0.14, 0.16, 0.5), (0, 0, -0.25), material=mat_body, parent=al_arm_r)
    cuff_r = create_cube_mesh("Cuff_R", (0.16, 0.18, 0.08), (0, 0, -0.45), material=mat_accent, parent=al_arm_r)
    
    # 7. AL_Leg_L (character's left leg, X = -0.18, Y = 0, Z = 0.5)
    al_leg_l = bpy.data.objects.new("AL_Leg_L", None)
    al_leg_l.location = (-0.18, 0, 0.5)
    al_leg_l.parent = rig_obj
    col.objects.link(al_leg_l)
    
    # Left leg mesh: hangs down from hip pivot (local Z = -0.25, ground at Z = -0.5)
    leg_l_mesh = create_cube_mesh("Leg_L_Mesh", (0.16, 0.16, 0.44), (0, 0, -0.22), material=mat_body, parent=al_leg_l)
    boot_l = create_cube_mesh("Boot_L", (0.18, 0.26, 0.12), (0, -0.05, -0.44), material=mat_accent, parent=al_leg_l)
    
    # 8. AL_Leg_R (character's right leg, X = 0.18, Y = 0, Z = 0.5)
    al_leg_r = bpy.data.objects.new("AL_Leg_R", None)
    al_leg_r.location = (0.18, 0, 0.5)
    al_leg_r.parent = rig_obj
    col.objects.link(al_leg_r)
    
    # Right leg mesh: hangs down from hip pivot
    leg_r_mesh = create_cube_mesh("Leg_R_Mesh", (0.16, 0.16, 0.44), (0, 0, -0.22), material=mat_body, parent=al_leg_r)
    boot_r = create_cube_mesh("Boot_R", (0.18, 0.26, 0.12), (0, -0.05, -0.44), material=mat_accent, parent=al_leg_r)
    
    return root_obj

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    shared_blend_dir = os.path.join(repo_dir, 'assets-blender', 'avatars', '_shared')
    test_glb_dir = os.path.join(repo_dir, 'public', 'avatars', '_test')
    
    os.makedirs(shared_blend_dir, exist_ok=True)
    os.makedirs(test_glb_dir, exist_ok=True)
    
    build_mannequin("mannequin")
    
    blend_path = os.path.join(shared_blend_dir, 'AL_SharedRig.blend')
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved shared rig to: {blend_path}")
    
    glb_path = os.path.join(test_glb_dir, 'mannequin.glb')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False
    )
    print(f"Exported mannequin to: {glb_path}")

if __name__ == '__main__':
    main()
