#!/usr/bin/env python3
"""
Authoring script for avatar: crt-head.
Concept: Beige box-TV head with animated static screen face, retro streetwear tracksuit.
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

def build_crt_head():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("crt-head", rig_kind="humanoid")

    # Materials (max 4 per budget; FX_Screen for crt-static)
    mat_body = create_material("MAT_Body", (0.16, 0.28, 0.42, 1.0), roughness=0.7, metalness=0.1)     # Teal tracksuit
    mat_accent = create_material("MAT_Accent", (0.96, 0.48, 0.18, 1.0), roughness=0.5, metalness=0.1) # Orange racing stripes, antenna
    mat_beige = create_material("MAT_Beige", (0.78, 0.75, 0.68, 1.0), roughness=0.6, metalness=0.05)  # CRT monitor casing, sneakers
    mat_fx = create_material("FX_Screen", (0.20, 0.35, 0.45, 1.0), roughness=0.3, metalness=0.1, emissive=(0.40, 0.75, 0.90, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # CRT monitor box
    casing = create_box("CRTCasing", (0.50, 0.42, 0.38), (0, 0.02, 0.24), material=mat_beige, parent=rig['al_head'])
    # Screen face
    screen = create_box("ScreenFace", (0.32, 0.04, 0.28), (-0.05, -0.20, 0.24), material=mat_fx, parent=rig['al_head'])

    # TV dials and knobs on right side of front panel
    dial_upper = create_cylinder("DialUpper", radius=0.03, depth=0.03, location=(0.16, -0.20, 0.30), material=mat_accent, parent=rig['al_head'], segments=12)
    dial_upper.rotation_euler = (1.5708, 0, 0)
    dial_lower = create_cylinder("DialLower", radius=0.03, depth=0.03, location=(0.16, -0.20, 0.22), material=mat_accent, parent=rig['al_head'], segments=12)
    dial_lower.rotation_euler = (1.5708, 0, 0)
    speaker_grille = create_box("SpeakerGrille", (0.08, 0.02, 0.06), (0.16, -0.19, 0.14), material=mat_body, parent=rig['al_head'])

    # Rabbit-ear antenna
    antenna_base = create_cylinder("AntennaBase", radius=0.04, depth=0.04, location=(0, 0.04, 0.45), material=mat_accent, parent=rig['al_head'], segments=12)
    ear_l = create_cylinder("AntennaEar_L", radius=0.012, depth=0.22, location=(-0.08, 0.04, 0.54), material=mat_accent, parent=rig['al_head'], segments=8)
    ear_l.rotation_euler = (0, -0.4, 0)
    ear_r = create_cylinder("AntennaEar_R", radius=0.012, depth=0.22, location=(0.08, 0.04, 0.54), material=mat_accent, parent=rig['al_head'], segments=8)
    ear_r.rotation_euler = (0, 0.4, 0)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Tracksuit jacket
    jacket = create_box("TracksuitJacket", (0.52, 0.32, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    collar = create_box("TracksuitCollar", (0.34, 0.28, 0.10), (0, 0, 0.30), material=mat_accent, parent=rig['al_root'])
    chest_stripe = create_box("ChestChevron", (0.53, 0.33, 0.12), (0, 0, 0.08), material=mat_accent, parent=rig['al_root'])
    zipper = create_box("JacketZipper", (0.04, 0.34, 0.58), (0, 0, 0), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_l'])
    stripe_arm_l = create_box("ArmStripe_L", (0.04, 0.17, 0.48), (-0.07, 0, -0.24), material=mat_accent, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_l'])
    hand_l = create_box("Hand_L", (0.12, 0.14, 0.10), (0, 0, -0.50), material=mat_beige, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Sleeve_R", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_r'])
    stripe_arm_r = create_box("ArmStripe_R", (0.04, 0.17, 0.48), (0.07, 0, -0.24), material=mat_accent, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_r'])
    hand_r = create_box("Hand_R", (0.12, 0.14, 0.10), (0, 0, -0.50), material=mat_beige, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    pants_l = create_box("Pants_L", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    stripe_leg_l = create_box("LegStripe_L", (0.04, 0.19, 0.42), (-0.08, 0, -0.21), material=mat_accent, parent=rig['al_leg_l'])
    sneaker_l = create_box("Sneaker_L", (0.19, 0.28, 0.12), (0, -0.04, -0.43), material=mat_beige, parent=rig['al_leg_l'])
    sole_l = create_box("Sole_L", (0.20, 0.29, 0.04), (0, -0.04, -0.48), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    pants_r = create_box("Pants_R", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    stripe_leg_r = create_box("LegStripe_R", (0.04, 0.19, 0.42), (0.08, 0, -0.21), material=mat_accent, parent=rig['al_leg_r'])
    sneaker_r = create_box("Sneaker_R", (0.19, 0.28, 0.12), (0, -0.04, -0.43), material=mat_beige, parent=rig['al_leg_r'])
    sole_r = create_box("Sole_R", (0.20, 0.29, 0.04), (0, -0.04, -0.48), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "crt-head"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_crt_head()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
