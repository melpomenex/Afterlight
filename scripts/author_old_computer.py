#!/usr/bin/env python3
"""
Authoring script for avatar: old-computer.
Concept: Beige vintage terminal computer head with green phosphor CRT screen, floppy drives, cozy cardigan.
"""

import os
import sys
import bpy

sys.path.append(os.path.dirname(__file__))
from avatar_pipeline import (
    reset_scene,
    create_material,
    create_box,
    setup_avatar_rig,
    export_avatar_files,
)

def build_old_computer():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("old-computer", rig_kind="humanoid")

    # Materials (max 4 per budget; FX_Screen for crt-static)
    mat_body = create_material("MAT_Body", (0.42, 0.30, 0.22, 1.0), roughness=0.8, metalness=0.05)     # Warm brown cardigan & trousers
    mat_accent = create_material("MAT_Accent", (0.85, 0.55, 0.22, 1.0), roughness=0.6, metalness=0.1) # Amber cardigan trim, LED, badge (tintable)
    mat_beige = create_material("MAT_Beige", (0.82, 0.79, 0.70, 1.0), roughness=0.65, metalness=0.05) # Yellowed vintage terminal casing
    mat_fx = create_material("FX_Screen", (0.08, 0.25, 0.12, 1.0), roughness=0.3, metalness=0.1, emissive=(0.20, 0.85, 0.30, 1.0)) # Green phosphor

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Vintage all-in-one terminal casing
    casing = create_box("TerminalCasing", (0.48, 0.40, 0.38), (0, 0.02, 0.24), material=mat_beige, parent=rig['al_head'])
    # Green phosphor screen
    screen = create_box("ScreenFace", (0.34, 0.04, 0.22), (0, -0.19, 0.26), material=mat_fx, parent=rig['al_head'])

    # Dual 5.25" floppy drive slots
    drive1_slot = create_box("DriveSlot1", (0.16, 0.02, 0.025), (-0.08, -0.19, 0.11), material=mat_body, parent=rig['al_head'])
    drive1_led = create_box("DriveLED1", (0.02, 0.02, 0.02), (0.03, -0.19, 0.11), material=mat_accent, parent=rig['al_head'])

    drive2_slot = create_box("DriveSlot2", (0.16, 0.02, 0.025), (-0.08, -0.19, 0.05), material=mat_body, parent=rig['al_head'])
    drive2_led = create_box("DriveLED2", (0.02, 0.02, 0.02), (0.03, -0.19, 0.05), material=mat_accent, parent=rig['al_head'])

    # Brand badge
    badge = create_box("BrandBadge", (0.08, 0.02, 0.04), (0.12, -0.19, 0.08), material=mat_accent, parent=rig['al_head'])
    # Top cooling vents
    vents = create_box("CoolingVents", (0.32, 0.24, 0.02), (0, 0.04, 0.44), material=mat_body, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Cardigan sweater
    cardigan = create_box("CardiganTorso", (0.52, 0.34, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    placket = create_box("CardiganPlacket", (0.14, 0.35, 0.58), (0, 0, 0), material=mat_accent, parent=rig['al_root'])
    collar_shirt = create_box("InnerShirt", (0.22, 0.10, 0.20), (0, -0.13, 0.20), material=mat_beige, parent=rig['al_root'])
    # Buttons
    btn1 = create_box("Button1", (0.03, 0.02, 0.03), (0, -0.18, 0.10), material=mat_beige, parent=rig['al_root'])
    btn2 = create_box("Button2", (0.03, 0.02, 0.03), (0, -0.18, -0.02), material=mat_beige, parent=rig['al_root'])
    btn3 = create_box("Button3", (0.03, 0.02, 0.03), (0, -0.18, -0.14), material=mat_beige, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_l'])
    hand_l = create_box("Hand_L", (0.12, 0.14, 0.10), (0, 0, -0.50), material=mat_beige, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Sleeve_R", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_r'])
    hand_r = create_box("Hand_R", (0.12, 0.14, 0.10), (0, 0, -0.50), material=mat_beige, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    pants_l = create_box("Pants_L", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    cuff_pant_l = create_box("PantCuff_L", (0.19, 0.19, 0.06), (0, 0, -0.38), material=mat_accent, parent=rig['al_leg_l'])
    shoe_l = create_box("Oxford_L", (0.18, 0.28, 0.12), (0, -0.04, -0.44), material=mat_body, parent=rig['al_leg_l'])

    # Right leg
    pants_r = create_box("Pants_R", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    cuff_pant_r = create_box("PantCuff_R", (0.19, 0.19, 0.06), (0, 0, -0.38), material=mat_accent, parent=rig['al_leg_r'])
    shoe_r = create_box("Oxford_R", (0.18, 0.28, 0.12), (0, -0.04, -0.44), material=mat_body, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "old-computer"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_old_computer()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
