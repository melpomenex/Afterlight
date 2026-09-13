#!/usr/bin/env python3
"""
Authoring script for avatar: alien-tourist.
Concept: Classic grey/green alien, bucket hat, lei, fanny pack, sandals with socks.
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
    create_cone,
    create_icosphere,
    setup_avatar_rig,
    export_avatar_files,
)

def build_alien_tourist():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("alien-tourist", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.55, 0.72, 0.58, 1.0), roughness=0.75, metalness=0.05) # Pale alien green
    mat_accent = create_material("MAT_Accent", (0.95, 0.42, 0.25, 1.0), roughness=0.6, metalness=0.1) # Fanny pack, floral lei
    mat_hat = create_material("MAT_Hat", (0.85, 0.82, 0.72, 1.0), roughness=0.8, metalness=0.0)      # Bucket hat, t-shirt, shorts
    mat_dark = create_material("MAT_Dark", (0.06, 0.06, 0.08, 1.0), roughness=0.2, metalness=0.4)    # Glossy eyes, straps, sandals

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Bulbous alien cranium
    cranium = create_icosphere("AlienCranium", radius=0.26, location=(0, -0.02, 0.24), material=mat_body, parent=rig['al_head'], subdivisions=3)
    chin = create_cone("AlienChin", radius1=0.20, radius2=0.08, depth=0.20, location=(0, -0.04, 0.10), material=mat_body, parent=rig['al_head'], segments=14)

    # Large glossy black almond eyes
    eye_l = create_icosphere("Eye_L", radius=0.085, location=(-0.11, -0.20, 0.20), material=mat_dark, parent=rig['al_head'], subdivisions=2)
    eye_l.scale = (1.0, 0.45, 1.35)
    eye_l.rotation_euler = (0.2, -0.3, -0.2)

    eye_r = create_icosphere("Eye_R", radius=0.085, location=(0.11, -0.20, 0.20), material=mat_dark, parent=rig['al_head'], subdivisions=2)
    eye_r.scale = (1.0, 0.45, 1.35)
    eye_r.rotation_euler = (0.2, 0.3, 0.2)

    # Tourist Bucket Hat
    hat_crown = create_cylinder("BucketHatCrown", radius=0.26, depth=0.15, location=(0, -0.02, 0.42), material=mat_hat, parent=rig['al_head'], segments=16)
    hat_brim = create_cone("BucketHatBrim", radius1=0.36, radius2=0.26, depth=0.08, location=(0, -0.02, 0.34), material=mat_hat, parent=rig['al_head'], segments=16)
    hat_band = create_cylinder("BucketHatBand", radius=0.265, depth=0.04, location=(0, -0.02, 0.38), material=mat_accent, parent=rig['al_head'], segments=16)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Tourist T-shirt
    torso = create_box("TouristTee", (0.50, 0.30, 0.54), (0, 0, 0), material=mat_hat, parent=rig['al_root'])

    # Floral Lei around neck
    lei_collar = create_box("LeiCollar", (0.42, 0.34, 0.08), (0, -0.04, 0.22), material=mat_accent, parent=rig['al_root'])
    lei_pendant = create_box("LeiPendant", (0.22, 0.12, 0.14), (0, -0.16, 0.10), material=mat_accent, parent=rig['al_root'])

    # Fanny Pack around waist
    pack_belt = create_box("FannyPackBelt", (0.52, 0.32, 0.06), (0, 0, -0.21), material=mat_dark, parent=rig['al_root'])
    pack_pouch = create_box("FannyPackPouch", (0.26, 0.14, 0.12), (0, -0.18, -0.21), material=mat_accent, parent=rig['al_root'])
    pack_zipper = create_box("FannyPackZipper", (0.10, 0.04, 0.04), (0, -0.25, -0.19), material=mat_hat, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    sleeve_l = create_box("Sleeve_L", (0.17, 0.17, 0.16), (0, 0, -0.08), material=mat_hat, parent=rig['al_arm_l'])
    arm_l = create_cylinder("AlienArm_L", radius=0.055, depth=0.40, location=(0, 0, -0.30), material=mat_body, parent=rig['al_arm_l'], segments=12)
    hand_l = create_box("AlienHand_L", (0.11, 0.13, 0.11), (0, 0, -0.51), material=mat_body, parent=rig['al_arm_l'])

    # Right arm
    sleeve_r = create_box("Sleeve_R", (0.17, 0.17, 0.16), (0, 0, -0.08), material=mat_hat, parent=rig['al_arm_r'])
    arm_r = create_cylinder("AlienArm_R", radius=0.055, depth=0.40, location=(0, 0, -0.30), material=mat_body, parent=rig['al_arm_r'], segments=12)
    hand_r = create_box("AlienHand_R", (0.11, 0.13, 0.11), (0, 0, -0.51), material=mat_body, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    shorts_l = create_box("Shorts_L", (0.19, 0.19, 0.22), (0, 0, -0.11), material=mat_hat, parent=rig['al_leg_l'])
    leg_l = create_cylinder("AlienLeg_L", radius=0.06, depth=0.22, location=(0, 0, -0.28), material=mat_body, parent=rig['al_leg_l'], segments=12)
    sock_l = create_box("Sock_L", (0.14, 0.15, 0.12), (0, 0, -0.40), material=mat_hat, parent=rig['al_leg_l'])
    sandal_l = create_box("Sandal_L", (0.16, 0.26, 0.08), (0, -0.04, -0.46), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    shorts_r = create_box("Shorts_R", (0.19, 0.19, 0.22), (0, 0, -0.11), material=mat_hat, parent=rig['al_leg_r'])
    leg_r = create_cylinder("AlienLeg_R", radius=0.06, depth=0.22, location=(0, 0, -0.28), material=mat_body, parent=rig['al_leg_r'], segments=12)
    sock_r = create_box("Sock_R", (0.14, 0.15, 0.12), (0, 0, -0.40), material=mat_hat, parent=rig['al_leg_r'])
    sandal_r = create_box("Sandal_R", (0.16, 0.26, 0.08), (0, -0.04, -0.46), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "alien-tourist"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_alien_tourist()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
