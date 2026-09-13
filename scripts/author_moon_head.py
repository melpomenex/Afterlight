#!/usr/bin/env python3
"""
Authoring script for avatar: moon-head.
Concept: Tattered-coat wanderer, plaster moon head with painted craters.
"""

import os
import sys
import bpy

sys.path.append(os.path.dirname(__file__))
from avatar_pipeline import (
    reset_scene,
    create_material,
    create_box,
    create_cylinder,
    create_icosphere,
    setup_avatar_rig,
    export_avatar_files,
)

def build_moon_head():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("moon-head", rig_kind="humanoid")

    # Materials
    mat_body = create_material("MAT_Body", (0.24, 0.27, 0.26, 1.0), roughness=0.8, metalness=0.05)
    mat_accent = create_material("MAT_Accent", (0.83, 0.55, 0.22, 1.0), roughness=0.6, metalness=0.1)
    mat_moon = create_material("MAT_Moon", (0.85, 0.84, 0.80, 1.0), roughness=0.85, metalness=0.02)
    mat_crater = create_material("MAT_Crater", (0.45, 0.44, 0.42, 1.0), roughness=0.9, metalness=0.0)

    # 1. Head: Moon plaster sphere on AL_Head (pivot at 0, 0, 1.45)
    moon_sphere = create_icosphere("MoonHead", radius=0.27, location=(0, 0, 0.24), material=mat_moon, parent=rig['al_head'], subdivisions=3)

    # Painted / sculpted craters on moon face
    crater1 = create_cylinder("Crater1", radius=0.065, depth=0.03, location=(0.08, -0.24, 0.28), material=mat_crater, parent=rig['al_head'], segments=12)
    crater1.rotation_euler = (1.5708, 0, 0.3)

    crater2 = create_cylinder("Crater2", radius=0.045, depth=0.03, location=(-0.1, -0.23, 0.18), material=mat_crater, parent=rig['al_head'], segments=12)
    crater2.rotation_euler = (1.5708, 0, -0.4)

    crater3 = create_cylinder("Crater3", radius=0.05, depth=0.03, location=(0.14, -0.20, 0.16), material=mat_crater, parent=rig['al_head'], segments=12)
    crater3.rotation_euler = (1.5708, 0, 0.6)

    # Scarf around neck
    scarf = create_box("Scarf", (0.42, 0.36, 0.12), (0, 0, 0.04), material=mat_accent, parent=rig['al_head'])
    scarf_tail = create_box("ScarfTail", (0.12, 0.08, 0.24), (0.12, -0.16, -0.06), material=mat_accent, parent=rig['al_head'])

    # 2. Torso: Long wanderer coat on AL_Root (pivot at 0, 0, 0.9)
    coat_torso = create_box("CoatTorso", (0.54, 0.34, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    coat_collar = create_box("CoatCollar", (0.52, 0.12, 0.44), (0, -0.16, 0.05), material=mat_accent, parent=rig['al_root'])
    # Lower coat skirt
    coat_skirt = create_box("CoatSkirt", (0.56, 0.36, 0.36), (0, 0, -0.38), material=mat_body, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Arm_L_Sleeve", (0.15, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.16, 0.17, 0.08), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_l'])
    glove_l = create_box("Glove_L", (0.13, 0.14, 0.12), (0, 0, -0.51), material=mat_body, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Arm_R_Sleeve", (0.15, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.16, 0.17, 0.08), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_r'])
    glove_r = create_box("Glove_R", (0.13, 0.14, 0.12), (0, 0, -0.51), material=mat_body, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    leg_l = create_box("Trouser_L", (0.16, 0.16, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    boot_l = create_box("Boot_L", (0.18, 0.28, 0.14), (0, -0.05, -0.43), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_box("Trouser_R", (0.16, 0.16, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    boot_r = create_box("Boot_R", (0.18, 0.28, 0.14), (0, -0.05, -0.43), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "moon-head"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_moon_head()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
