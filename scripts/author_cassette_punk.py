#!/usr/bin/env python3
"""
Authoring script for avatar: cassette-punk.
Concept: Walkman-era punk, cassette tape head with spinning reels, denim vest with pins, combat boots.
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

def build_cassette_punk():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("cassette-punk", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.20, 0.28, 0.38, 1.0), roughness=0.7, metalness=0.1)     # Denim blue & cassette shell
    mat_accent = create_material("MAT_Accent", (0.95, 0.45, 0.12, 1.0), roughness=0.5, metalness=0.2) # Orange cassette label, pins, patches
    mat_dark = create_material("MAT_Dark", (0.10, 0.10, 0.12, 1.0), roughness=0.6, metalness=0.2)     # Band tee, boots, belts, window
    mat_reel = create_material("MAT_Reel", (0.90, 0.88, 0.82, 1.0), roughness=0.4, metalness=0.1)     # White tape reels, headphone earcups

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Cassette shell
    shell = create_box("CassetteShell", (0.54, 0.14, 0.36), (0, 0, 0.24), material=mat_body, parent=rig['al_head'])
    # Cassette label on front
    label = create_box("CassetteLabel", (0.44, 0.15, 0.24), (0, -0.005, 0.24), material=mat_accent, parent=rig['al_head'])
    # Transparent/black center window
    window = create_box("CassetteWindow", (0.28, 0.16, 0.12), (0, -0.01, 0.24), material=mat_dark, parent=rig['al_head'])

    # Spinning Tape Reels (must start with FX_Reel or FX_Spin for effects.js)
    reel_l = create_cylinder("FX_Reel_L", radius=0.045, depth=0.03, location=(-0.08, -0.09, 0.24), material=mat_reel, parent=rig['al_head'], segments=12)
    reel_l.rotation_euler = (1.5708, 0, 0)
    # Spoke teeth on left reel
    spoke_l = create_box("FX_Reel_L_Spoke", (0.07, 0.032, 0.02), (-0.08, -0.09, 0.24), material=mat_dark, parent=rig['al_head'])

    reel_r = create_cylinder("FX_Reel_R", radius=0.045, depth=0.03, location=(0.08, -0.09, 0.24), material=mat_reel, parent=rig['al_head'], segments=12)
    reel_r.rotation_euler = (1.5708, 0, 0)
    # Spoke teeth on right reel
    spoke_r = create_box("FX_Reel_R_Spoke", (0.07, 0.032, 0.02), (0.08, -0.09, 0.24), material=mat_dark, parent=rig['al_head'])

    # Retro Walkman headphones over the cassette
    headband = create_box("HeadphoneBand", (0.58, 0.06, 0.04), (0, 0, 0.44), material=mat_dark, parent=rig['al_head'])
    earcup_l = create_box("EarCup_L", (0.06, 0.14, 0.14), (-0.29, 0, 0.24), material=mat_reel, parent=rig['al_head'])
    earcup_r = create_box("EarCup_R", (0.06, 0.14, 0.14), (0.29, 0, 0.24), material=mat_reel, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Band tee shirt
    tee = create_box("BandTee", (0.48, 0.30, 0.56), (0, 0, 0), material=mat_dark, parent=rig['al_root'])
    # Denim vest
    vest = create_box("DenimVest", (0.52, 0.32, 0.50), (0, 0, -0.02), material=mat_body, parent=rig['al_root'])
    # Pins on vest lapel
    pin1 = create_box("PunkPin1", (0.05, 0.02, 0.05), (-0.14, -0.17, 0.12), material=mat_accent, parent=rig['al_root'])
    pin2 = create_box("PunkPin2", (0.05, 0.02, 0.05), (-0.14, -0.17, 0.04), material=mat_reel, parent=rig['al_root'])
    # Studded belt
    belt = create_box("StuddedBelt", (0.54, 0.34, 0.08), (0, 0, -0.24), material=mat_dark, parent=rig['al_root'])
    buckle = create_box("BeltBuckle", (0.10, 0.36, 0.08), (0, 0, -0.24), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    shoulder_l = create_box("VestShoulder_L", (0.16, 0.16, 0.12), (0, 0, -0.06), material=mat_body, parent=rig['al_arm_l'])
    arm_l = create_cylinder("Arm_L", radius=0.06, depth=0.32, location=(0, 0, -0.26), material=mat_body, parent=rig['al_arm_l'], segments=12)
    wristband_l = create_box("Wristband_L", (0.15, 0.15, 0.08), (0, 0, -0.40), material=mat_dark, parent=rig['al_arm_l'])
    hand_l = create_box("Glove_L", (0.12, 0.14, 0.10), (0, 0, -0.49), material=mat_dark, parent=rig['al_arm_l'])

    # Right arm
    shoulder_r = create_box("VestShoulder_R", (0.16, 0.16, 0.12), (0, 0, -0.06), material=mat_body, parent=rig['al_arm_r'])
    arm_r = create_cylinder("Arm_R", radius=0.06, depth=0.32, location=(0, 0, -0.26), material=mat_body, parent=rig['al_arm_r'], segments=12)
    wristband_r = create_box("Wristband_R", (0.15, 0.15, 0.08), (0, 0, -0.40), material=mat_dark, parent=rig['al_arm_r'])
    hand_r = create_box("Glove_R", (0.12, 0.14, 0.10), (0, 0, -0.49), material=mat_dark, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    jeans_l = create_box("Jeans_L", (0.17, 0.17, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    patch_l = create_box("KneePatch_L", (0.14, 0.03, 0.08), (0, -0.08, -0.20), material=mat_accent, parent=rig['al_leg_l'])
    boot_l = create_box("CombatBoot_L", (0.18, 0.28, 0.14), (0, -0.04, -0.43), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    jeans_r = create_box("Jeans_R", (0.17, 0.17, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    patch_r = create_box("KneePatch_R", (0.14, 0.03, 0.08), (0, -0.08, -0.20), material=mat_accent, parent=rig['al_leg_r'])
    boot_r = create_box("CombatBoot_R", (0.18, 0.28, 0.14), (0, -0.04, -0.43), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "cassette-punk"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_cassette_punk()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
