#!/usr/bin/env python3
"""
Authoring script for avatar: porcelain-doll.
Concept: Antique glazed ceramic doll, gold kintsugi repair seams (single 512x512 texture), Victorian bell-skirt dress.
"""

import os
import sys
import math
import random
import bpy

sys.path.append(os.path.dirname(__file__))
from avatar_pipeline import (
    reset_scene,
    create_material,
    create_box,
    create_cylinder,
    create_cone,
    create_icosphere,
    setup_avatar_rig,
    export_avatar_files,
)

def create_kintsugi_texture(size=512):
    img = bpy.data.images.new("KintsugiCracks", width=size, height=size, alpha=False)
    # Start with ivory porcelain base
    pixels = [0.96, 0.95, 0.93, 1.0] * (size * size)

    # Draw deterministic golden kintsugi crack fractures
    rnd = random.Random(42)
    num_cracks = 12
    for _ in range(num_cracks):
        x = rnd.randint(50, size - 50)
        y = rnd.randint(50, size - 50)
        length = rnd.randint(60, 180)
        angle = rnd.uniform(0, 2 * math.pi)

        for _ in range(length):
            ix = int(x) % size
            iy = int(y) % size
            idx = (iy * size + ix) * 4
            # Gold crack color
            pixels[idx] = 0.90
            pixels[idx + 1] = 0.72
            pixels[idx + 2] = 0.20
            pixels[idx + 3] = 1.0

            # Thickness
            if ix + 1 < size:
                n_idx = (iy * size + (ix + 1)) * 4
                pixels[n_idx] = 0.85
                pixels[n_idx + 1] = 0.68
                pixels[n_idx + 2] = 0.18

            angle += rnd.uniform(-0.35, 0.35)
            x += math.cos(angle)
            y += math.sin(angle)

    img.pixels = pixels
    img.pack()
    return img

def build_porcelain_doll():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("porcelain-doll", rig_kind="humanoid")

    # 1. Textured Glazed Porcelain Body Material (max 1 texture per budget)
    tex_img = create_kintsugi_texture(512)
    mat_body = bpy.data.materials.new(name="MAT_Body")
    mat_body.use_nodes = True
    bsdf = mat_body.node_tree.nodes.get('Principled BSDF')
    tex_node = mat_body.node_tree.nodes.new('ShaderNodeTexImage')
    tex_node.image = tex_img
    mat_body.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.18 # Glazed ceramic clearcoat feel
    bsdf.inputs['Metallic'].default_value = 0.05

    # Other materials (total 4)
    mat_accent = create_material("MAT_Accent", (0.85, 0.35, 0.45, 1.0), roughness=0.5, metalness=0.1) # Rose silk dress & ribbons (tintable)
    mat_dark = create_material("MAT_Dark", (0.15, 0.12, 0.10, 1.0), roughness=0.6, metalness=0.1)     # Doll hair, eyelashes, shoes
    mat_gold = create_material("MAT_Gold", (0.92, 0.75, 0.25, 1.0), roughness=0.25, metalness=0.85)   # Gold ball joints & repair seams

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    doll_head = create_icosphere("DollHead", radius=0.22, location=(0, 0, 0.22), material=mat_body, parent=rig['al_head'], subdivisions=3)
    lash_l = create_box("Eyelash_L", (0.06, 0.02, 0.03), (-0.08, -0.19, 0.22), material=mat_dark, parent=rig['al_head'])
    lash_r = create_box("Eyelash_R", (0.06, 0.02, 0.03), (0.08, -0.19, 0.22), material=mat_dark, parent=rig['al_head'])
    lips = create_box("RosebudLips", (0.06, 0.02, 0.03), (0, -0.20, 0.12), material=mat_accent, parent=rig['al_head'])

    # Hair bun & curls
    hair_bun = create_icosphere("HairBun", radius=0.12, location=(0, 0.06, 0.42), material=mat_dark, parent=rig['al_head'], subdivisions=2)
    curls_l = create_cylinder("Curls_L", radius=0.06, depth=0.22, location=(-0.22, 0, 0.20), material=mat_dark, parent=rig['al_head'], segments=10)
    curls_r = create_cylinder("Curls_R", radius=0.06, depth=0.22, location=(0.22, 0, 0.20), material=mat_dark, parent=rig['al_head'], segments=10)
    hair_bow = create_box("HairBow", (0.16, 0.06, 0.08), (0, 0.08, 0.46), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    bodice = create_box("DressBodice", (0.46, 0.28, 0.52), (0, 0, 0), material=mat_accent, parent=rig['al_root'])
    lace_collar = create_box("LaceCollar", (0.36, 0.26, 0.08), (0, 0, 0.24), material=mat_body, parent=rig['al_root'])
    skirt = create_cone("BellSkirt", radius1=0.46, radius2=0.24, depth=0.42, location=(0, 0, -0.26), material=mat_accent, parent=rig['al_root'], segments=16)
    lace_hem = create_cylinder("LaceHem", radius=0.47, depth=0.05, location=(0, 0, -0.45), material=mat_body, parent=rig['al_root'], segments=16)

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    puff_l = create_icosphere("PuffSleeve_L", radius=0.12, location=(0, 0, -0.06), material=mat_accent, parent=rig['al_arm_l'], subdivisions=2)
    arm_l = create_cylinder("PorcelainArm_L", radius=0.05, depth=0.32, location=(0, 0, -0.26), material=mat_body, parent=rig['al_arm_l'], segments=10)
    elbow_l = create_icosphere("ElbowJoint_L", radius=0.055, location=(0, 0, -0.24), material=mat_gold, parent=rig['al_arm_l'], subdivisions=2)
    hand_l = create_box("DollHand_L", (0.10, 0.12, 0.10), (0, 0, -0.46), material=mat_body, parent=rig['al_arm_l'])

    # Right arm
    puff_r = create_icosphere("PuffSleeve_R", radius=0.12, location=(0, 0, -0.06), material=mat_accent, parent=rig['al_arm_r'], subdivisions=2)
    arm_r = create_cylinder("PorcelainArm_R", radius=0.05, depth=0.32, location=(0, 0, -0.26), material=mat_body, parent=rig['al_arm_r'], segments=10)
    elbow_r = create_icosphere("ElbowJoint_R", radius=0.055, location=(0, 0, -0.24), material=mat_gold, parent=rig['al_arm_r'], subdivisions=2)
    hand_r = create_box("DollHand_R", (0.10, 0.12, 0.10), (0, 0, -0.46), material=mat_body, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    thigh_l = create_cylinder("Thigh_L", radius=0.06, depth=0.20, location=(0, 0, -0.10), material=mat_body, parent=rig['al_leg_l'], segments=10)
    knee_l = create_icosphere("KneeJoint_L", radius=0.065, location=(0, 0, -0.21), material=mat_gold, parent=rig['al_leg_l'], subdivisions=2)
    shin_l = create_cylinder("Shin_L", radius=0.055, depth=0.20, location=(0, 0, -0.32), material=mat_body, parent=rig['al_leg_l'], segments=10)
    shoe_l = create_box("MaryJane_L", (0.16, 0.26, 0.10), (0, -0.04, -0.44), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    thigh_r = create_cylinder("Thigh_R", radius=0.06, depth=0.20, location=(0, 0, -0.10), material=mat_body, parent=rig['al_leg_r'], segments=10)
    knee_r = create_icosphere("KneeJoint_R", radius=0.065, location=(0, 0, -0.21), material=mat_gold, parent=rig['al_leg_r'], subdivisions=2)
    shin_r = create_cylinder("Shin_R", radius=0.055, depth=0.20, location=(0, 0, -0.32), material=mat_body, parent=rig['al_leg_r'], segments=10)
    shoe_r = create_box("MaryJane_R", (0.16, 0.26, 0.10), (0, -0.04, -0.44), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "porcelain-doll"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_porcelain_doll()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
