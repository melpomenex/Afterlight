#!/usr/bin/env python3
"""
Authoring script for avatar: eyeball-creature.
Concept: Giant eyeball creature with fleshy lids, spinning radial iris, stubby clawed monster limbs.
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

def build_eyeball_creature():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("eyeball-creature", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.82, 0.36, 0.48, 1.0), roughness=0.6, metalness=0.05)     # Coral pink monster skin
    mat_accent = create_material("MAT_Accent", (0.18, 0.68, 0.88, 1.0), roughness=0.3, metalness=0.1) # Bright azure iris (tintable)
    mat_white = create_material("MAT_White", (0.95, 0.95, 0.93, 1.0), roughness=0.2, metalness=0.05)   # Sclera
    mat_dark = create_material("MAT_Dark", (0.05, 0.05, 0.06, 1.0), roughness=0.2, metalness=0.3)     # Pupil, monster claws

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Giant Eyeball Sclera
    sclera = create_icosphere("EyeSclera", radius=0.36, location=(0, 0, 0.16), material=mat_white, parent=rig['al_head'], subdivisions=3)

    # Spinning Iris (must start with FX_Spin or FX_Iris)
    iris = create_cylinder("FX_Spin_Iris", radius=0.18, depth=0.03, location=(0, -0.35, 0.16), material=mat_accent, parent=rig['al_head'], segments=16)
    iris.rotation_euler = (1.5708, 0, 0)

    # Pupil inside iris
    pupil = create_cylinder("EyePupil", radius=0.08, depth=0.032, location=(0, -0.352, 0.16), material=mat_dark, parent=iris, segments=14)
    pupil.rotation_euler = (0, 0, 0)
    # Iris starburst spoke pattern
    iris_spoke1 = create_box("IrisSpoke1", (0.03, 0.034, 0.28), (0, -0.351, 0.16), material=mat_dark, parent=iris)
    iris_spoke2 = create_box("IrisSpoke2", (0.28, 0.034, 0.03), (0, -0.351, 0.16), material=mat_dark, parent=iris)

    # Upper and Lower Fleshy Eyelids
    eyelid_upper = create_box("EyelidUpper", (0.54, 0.44, 0.14), (0, -0.04, 0.42), material=mat_body, parent=rig['al_head'])
    eyelid_lower = create_box("EyelidLower", (0.52, 0.42, 0.12), (0, -0.04, -0.08), material=mat_body, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Torso base connecting eyeball to legs
    torso_base = create_box("MonsterTorso", (0.50, 0.38, 0.44), (0, 0, -0.12), material=mat_body, parent=rig['al_root'])
    belly_fold = create_box("BellyFold", (0.36, 0.12, 0.18), (0, -0.18, -0.16), material=mat_body, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_cylinder("Arm_L", radius=0.07, depth=0.38, location=(0, 0, -0.26), material=mat_body, parent=rig['al_arm_l'], segments=12)
    claw_l = create_box("Claws_L", (0.13, 0.15, 0.12), (0, 0, -0.48), material=mat_dark, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_cylinder("Arm_R", radius=0.07, depth=0.38, location=(0, 0, -0.26), material=mat_body, parent=rig['al_arm_r'], segments=12)
    claw_r = create_box("Claws_R", (0.13, 0.15, 0.12), (0, 0, -0.48), material=mat_dark, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    leg_l = create_cylinder("Leg_L", radius=0.08, depth=0.36, location=(0, 0, -0.22), material=mat_body, parent=rig['al_leg_l'], segments=12)
    foot_l = create_box("Foot_L", (0.18, 0.28, 0.12), (0, -0.05, -0.44), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_cylinder("Leg_R", radius=0.08, depth=0.36, location=(0, 0, -0.22), material=mat_body, parent=rig['al_leg_r'], segments=12)
    foot_r = create_box("Foot_R", (0.18, 0.28, 0.12), (0, -0.05, -0.44), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "eyeball-creature"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_eyeball_creature()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
