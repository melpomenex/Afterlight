#!/usr/bin/env python3
"""
Authoring script for avatar: skeleton-tourist.
Concept: Bone-white skeleton, Hawaiian shirt, camera, sunhat.
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

def build_skeleton_tourist():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("skeleton-tourist", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.88, 0.86, 0.78, 1.0), roughness=0.75, metalness=0.05)
    mat_accent = create_material("MAT_Accent", (0.22, 0.68, 0.76, 1.0), roughness=0.6, metalness=0.1) # Tropical shirt
    mat_hat = create_material("MAT_Hat", (0.78, 0.68, 0.48, 1.0), roughness=0.8, metalness=0.0)      # Straw hat / shorts
    mat_dark = create_material("MAT_Dark", (0.12, 0.12, 0.14, 1.0), roughness=0.5, metalness=0.2)    # Camera, shades, sandals

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Cranium
    skull = create_box("Skull", (0.36, 0.34, 0.34), (0, 0, 0.20), material=mat_body, parent=rig['al_head'])
    jaw = create_box("Jaw", (0.26, 0.22, 0.14), (0, -0.06, 0.06), material=mat_body, parent=rig['al_head'])

    # Sunglasses across eyes
    shades = create_box("Sunglasses", (0.34, 0.08, 0.10), (0, -0.19, 0.21), material=mat_dark, parent=rig['al_head'])

    # Straw sunhat
    hat_brim = create_cylinder("HatBrim", radius=0.36, depth=0.04, location=(0, 0, 0.36), material=mat_hat, parent=rig['al_head'], segments=16)
    hat_crown = create_cylinder("HatCrown", radius=0.22, depth=0.14, location=(0, 0, 0.44), material=mat_hat, parent=rig['al_head'], segments=16)
    hat_band = create_cylinder("HatBand", radius=0.23, depth=0.04, location=(0, 0, 0.39), material=mat_accent, parent=rig['al_head'], segments=16)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Spine & Ribcage
    spine = create_cylinder("Spine", radius=0.07, depth=0.54, location=(0, 0, 0), material=mat_body, parent=rig['al_root'], segments=12)
    rib1 = create_box("RibUpper", (0.38, 0.22, 0.06), (0, 0, 0.14), material=mat_body, parent=rig['al_root'])
    rib2 = create_box("RibMid", (0.36, 0.20, 0.06), (0, 0, 0.03), material=mat_body, parent=rig['al_root'])
    rib3 = create_box("RibLower", (0.32, 0.18, 0.06), (0, 0, -0.08), material=mat_body, parent=rig['al_root'])
    pelvis = create_box("Pelvis", (0.38, 0.24, 0.12), (0, 0, -0.22), material=mat_body, parent=rig['al_root'])

    # Open Hawaiian Shirt (covers back and wraps around sides)
    shirt_back = create_box("ShirtBack", (0.48, 0.28, 0.44), (0, 0.04, 0.06), material=mat_accent, parent=rig['al_root'])
    shirt_lapel_l = create_box("ShirtLapel_L", (0.12, 0.10, 0.42), (-0.18, -0.11, 0.06), material=mat_accent, parent=rig['al_root'])
    shirt_lapel_r = create_box("ShirtLapel_R", (0.12, 0.10, 0.42), (0.18, -0.11, 0.06), material=mat_accent, parent=rig['al_root'])
    shirt_collar = create_box("ShirtCollar", (0.42, 0.26, 0.08), (0, -0.02, 0.27), material=mat_accent, parent=rig['al_root'])

    # Camera hanging on strap around neck
    cam_body = create_box("CameraBody", (0.16, 0.10, 0.11), (0.04, -0.19, -0.02), material=mat_dark, parent=rig['al_root'])
    cam_lens = create_cylinder("CameraLens", radius=0.045, depth=0.06, location=(0.04, -0.25, -0.02), material=mat_dark, parent=rig['al_root'], segments=12)
    cam_lens.rotation_euler = (1.5708, 0, 0)
    cam_strap = create_box("CameraStrap", (0.28, 0.24, 0.03), (0, -0.10, 0.16), material=mat_dark, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left Arm
    sleeve_l = create_box("Sleeve_L", (0.18, 0.18, 0.16), (0, 0, -0.08), material=mat_accent, parent=rig['al_arm_l'])
    humerus_l = create_cylinder("Humerus_L", radius=0.05, depth=0.22, location=(0, 0, -0.22), material=mat_body, parent=rig['al_arm_l'], segments=10)
    radius_l = create_cylinder("Radius_L", radius=0.045, depth=0.20, location=(0, 0, -0.39), material=mat_body, parent=rig['al_arm_l'], segments=10)
    hand_l = create_box("Hand_L", (0.10, 0.12, 0.10), (0, 0, -0.50), material=mat_body, parent=rig['al_arm_l'])

    # Right Arm
    sleeve_r = create_box("Sleeve_R", (0.18, 0.18, 0.16), (0, 0, -0.08), material=mat_accent, parent=rig['al_arm_r'])
    humerus_r = create_cylinder("Humerus_R", radius=0.05, depth=0.22, location=(0, 0, -0.22), material=mat_body, parent=rig['al_arm_r'], segments=10)
    radius_r = create_cylinder("Radius_R", radius=0.045, depth=0.20, location=(0, 0, -0.39), material=mat_body, parent=rig['al_arm_r'], segments=10)
    hand_r = create_box("Hand_R", (0.10, 0.12, 0.10), (0, 0, -0.50), material=mat_body, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left Leg
    shorts_l = create_box("Shorts_L", (0.19, 0.19, 0.22), (0, 0, -0.11), material=mat_hat, parent=rig['al_leg_l'])
    femur_l = create_cylinder("Femur_L", radius=0.055, depth=0.24, location=(0, 0, -0.30), material=mat_body, parent=rig['al_leg_l'], segments=10)
    sandal_l = create_box("Sandal_L", (0.16, 0.26, 0.08), (0, -0.04, -0.45), material=mat_dark, parent=rig['al_leg_l'])
    strap_l = create_box("SandalStrap_L", (0.17, 0.10, 0.05), (0, -0.04, -0.41), material=mat_accent, parent=rig['al_leg_l'])

    # Right Leg
    shorts_r = create_box("Shorts_R", (0.19, 0.19, 0.22), (0, 0, -0.11), material=mat_hat, parent=rig['al_leg_r'])
    femur_r = create_cylinder("Femur_R", radius=0.055, depth=0.24, location=(0, 0, -0.30), material=mat_body, parent=rig['al_leg_r'], segments=10)
    sandal_r = create_box("Sandal_R", (0.16, 0.26, 0.08), (0, -0.04, -0.45), material=mat_dark, parent=rig['al_leg_r'])
    strap_r = create_box("SandalStrap_R", (0.17, 0.10, 0.05), (0, -0.04, -0.41), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "skeleton-tourist"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_skeleton_tourist()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
