#!/usr/bin/env python3
"""
Authoring script for avatar: vending-machine.
Rig: humanoid-heavy (hip pivot y≈0.4).
Concept: Japanese beverage vending machine, illuminated soda display, coin slots, robotic grabbers.
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
    setup_avatar_rig,
    export_avatar_files,
)

def build_vending_machine():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("vending-machine", rig_kind="humanoid-heavy")

    # Materials (max 4 per budget; FX_ prefix for glow-pulse)
    mat_body = create_material("MAT_Body", (0.82, 0.18, 0.16, 1.0), roughness=0.4, metalness=0.2)      # Red enameled cabinet
    mat_accent = create_material("MAT_Accent", (0.96, 0.85, 0.22, 1.0), roughness=0.4, metalness=0.1)  # Yellow marquee trim, buttons (tintable)
    mat_dark = create_material("MAT_Dark", (0.12, 0.12, 0.14, 1.0), roughness=0.6, metalness=0.3)      # Dispenser flap, legs, coin bezel
    mat_fx = create_material("FX_Display", (0.30, 0.75, 0.95, 1.0), roughness=0.2, metalness=0.1, emissive=(0.40, 0.80, 1.0, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Upper marquee canopy of vending machine
    canopy = create_box("VendingCanopy", (0.64, 0.46, 0.36), (0, 0, 0.18), material=mat_body, parent=rig['al_head'])
    marquee_sign = create_box("MarqueeSign", (0.52, 0.04, 0.16), (0, -0.23, 0.22), material=mat_fx, parent=rig['al_head'])
    roof_bevel = create_box("RoofBevel", (0.66, 0.48, 0.06), (0, 0, 0.36), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Main cabinet body
    cabinet = create_box("MainCabinet", (0.64, 0.46, 0.68), (0, 0, 0.04), material=mat_body, parent=rig['al_root'])
    display_window = create_box("DisplayWindow", (0.52, 0.04, 0.36), (0, -0.23, 0.16), material=mat_fx, parent=rig['al_root'])

    # Product shelves inside window
    can_row1 = create_box("CanRow1", (0.46, 0.04, 0.05), (0, -0.225, 0.24), material=mat_accent, parent=rig['al_root'])
    can_row2 = create_box("CanRow2", (0.46, 0.04, 0.05), (0, -0.225, 0.12), material=mat_dark, parent=rig['al_root'])

    # Button strip
    buttons = create_box("ButtonStrip", (0.48, 0.04, 0.06), (0, -0.23, 0.01), material=mat_accent, parent=rig['al_root'])
    coin_slot = create_box("CoinSlot", (0.08, 0.04, 0.08), (0.20, -0.23, -0.08), material=mat_accent, parent=rig['al_root'])
    dispenser = create_box("DispenserFlap", (0.40, 0.05, 0.14), (0, -0.23, -0.18), material=mat_dark, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    mount_l = create_box("ArmMount_L", (0.10, 0.12, 0.12), (0, 0, -0.06), material=mat_body, parent=rig['al_arm_l'])
    arm_l = create_cylinder("MechArm_L", radius=0.055, depth=0.36, location=(0, 0, -0.26), material=mat_dark, parent=rig['al_arm_l'], segments=10)
    claw_l = create_box("CanClaw_L", (0.12, 0.14, 0.10), (0, 0, -0.46), material=mat_accent, parent=rig['al_arm_l'])

    # Right arm
    mount_r = create_box("ArmMount_R", (0.10, 0.12, 0.12), (0, 0, -0.06), material=mat_body, parent=rig['al_arm_r'])
    arm_r = create_cylinder("MechArm_R", radius=0.055, depth=0.36, location=(0, 0, -0.26), material=mat_dark, parent=rig['al_arm_r'], segments=10)
    claw_r = create_box("CanClaw_R", (0.12, 0.14, 0.10), (0, 0, -0.46), material=mat_accent, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.4 for humanoid-heavy)
    # Left leg
    leg_l = create_box("LegPost_L", (0.16, 0.16, 0.18), (0, 0, -0.09), material=mat_dark, parent=rig['al_leg_l'])
    foot_l = create_box("RubberFoot_L", (0.18, 0.26, 0.12), (0, -0.04, -0.27), material=mat_dark, parent=rig['al_leg_l'])
    rim_l = create_box("FootRim_L", (0.19, 0.27, 0.04), (0, -0.04, -0.32), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_box("LegPost_R", (0.16, 0.16, 0.18), (0, 0, -0.09), material=mat_dark, parent=rig['al_leg_r'])
    foot_r = create_box("RubberFoot_R", (0.18, 0.26, 0.12), (0, -0.04, -0.27), material=mat_dark, parent=rig['al_leg_r'])
    rim_r = create_box("FootRim_R", (0.19, 0.27, 0.04), (0, -0.04, -0.32), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "vending-machine"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_vending_machine()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
