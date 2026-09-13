#!/usr/bin/env python3
"""
Authoring script for avatar: living-arcade-cabinet.
Rig: humanoid-heavy (hip pivot y≈0.4).
Concept: Living upright arcade cabinet on robotic legs, animated crt-static screen, ball-top joystick arms.
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

def build_living_arcade_cabinet():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("living-arcade-cabinet", rig_kind="humanoid-heavy")

    # Materials (max 4 per budget; FX_Screen for crt-static)
    mat_body = create_material("MAT_Body", (0.12, 0.12, 0.15, 1.0), roughness=0.6, metalness=0.2)     # Charcoal cabinet chassis
    mat_accent = create_material("MAT_Accent", (0.95, 0.25, 0.15, 1.0), roughness=0.4, metalness=0.1) # T-molding trim, joystick ball (tintable)
    mat_dark = create_material("MAT_Dark", (0.06, 0.06, 0.08, 1.0), roughness=0.7, metalness=0.2)     # Control panel, coin door, legs
    mat_fx = create_material("FX_Screen", (0.15, 0.40, 0.85, 1.0), roughness=0.3, metalness=0.1, emissive=(0.30, 0.60, 0.95, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Marquee bonnet
    bonnet = create_box("MarqueeBonnet", (0.52, 0.36, 0.30), (0, 0, 0.15), material=mat_body, parent=rig['al_head'])
    marquee = create_box("MarqueeSign", (0.44, 0.04, 0.12), (0, -0.17, 0.20), material=mat_fx, parent=rig['al_head'])
    trim_l = create_box("Trim_L", (0.02, 0.36, 0.30), (-0.265, 0, 0.15), material=mat_accent, parent=rig['al_head'])
    trim_r = create_box("Trim_R", (0.02, 0.36, 0.30), (0.265, 0, 0.15), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Main cabinet body
    cabinet = create_box("CabinetTorso", (0.52, 0.38, 0.64), (0, 0, 0.02), material=mat_body, parent=rig['al_root'])
    screen = create_box("ScreenFace", (0.40, 0.04, 0.28), (0, -0.18, 0.18), material=mat_fx, parent=rig['al_root'])

    # Control panel (angled deck)
    panel = create_box("ControlDeck", (0.48, 0.18, 0.08), (0, -0.24, -0.02), material=mat_dark, parent=rig['al_root'])
    stick1 = create_cylinder("MiniStick1", radius=0.015, depth=0.06, location=(-0.12, -0.26, 0.04), material=mat_accent, parent=rig['al_root'], segments=8)
    stick2 = create_cylinder("MiniStick2", radius=0.015, depth=0.06, location=(0.12, -0.26, 0.04), material=mat_accent, parent=rig['al_root'], segments=8)
    btn_strip = create_box("ButtonStrip", (0.16, 0.06, 0.02), (0, -0.26, 0.03), material=mat_accent, parent=rig['al_root'])

    # Coin door & side art
    coin_door = create_box("CoinDoor", (0.28, 0.04, 0.22), (0, -0.18, -0.20), material=mat_dark, parent=rig['al_root'])
    coin_insert = create_box("CoinInsert", (0.16, 0.02, 0.04), (0, -0.205, -0.16), material=mat_accent, parent=rig['al_root'])
    side_art_l = create_box("SideArt_L", (0.02, 0.24, 0.40), (-0.265, 0, 0.02), material=mat_accent, parent=rig['al_root'])
    side_art_r = create_box("SideArt_R", (0.02, 0.24, 0.40), (0.265, 0, 0.02), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm (joystick controller arm)
    arm_l = create_cylinder("Arm_L", radius=0.05, depth=0.36, location=(0, 0, -0.24), material=mat_dark, parent=rig['al_arm_l'], segments=10)
    ball_l = create_icosphere("BallTop_L", radius=0.07, location=(0, 0, -0.45), material=mat_accent, parent=rig['al_arm_l'], subdivisions=2)

    # Right arm
    arm_r = create_cylinder("Arm_R", radius=0.05, depth=0.36, location=(0, 0, -0.24), material=mat_dark, parent=rig['al_arm_r'], segments=10)
    ball_r = create_icosphere("BallTop_R", radius=0.07, location=(0, 0, -0.45), material=mat_accent, parent=rig['al_arm_r'], subdivisions=2)

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.4 for humanoid-heavy)
    # Left leg
    leg_l = create_cylinder("Leg_L", radius=0.06, depth=0.20, location=(0, 0, -0.10), material=mat_dark, parent=rig['al_leg_l'], segments=10)
    boot_l = create_box("CasterBoot_L", (0.18, 0.26, 0.12), (0, -0.04, -0.27), material=mat_body, parent=rig['al_leg_l'])
    rim_l = create_box("Rim_L", (0.19, 0.27, 0.04), (0, -0.04, -0.32), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_cylinder("Leg_R", radius=0.06, depth=0.20, location=(0, 0, -0.10), material=mat_dark, parent=rig['al_leg_r'], segments=10)
    boot_r = create_box("CasterBoot_R", (0.18, 0.26, 0.12), (0, -0.04, -0.27), material=mat_body, parent=rig['al_leg_r'])
    rim_r = create_box("Rim_R", (0.19, 0.27, 0.04), (0, -0.04, -0.32), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "living-arcade-cabinet"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_living_arcade_cabinet()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
