#!/usr/bin/env python3
"""
Authoring script for avatar: tiny-kaiju.
Concept: Chibi monster dinosaur, atomic turquoise dorsal plates, scaly underbelly, elevated tail.
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
    setup_avatar_rig,
    export_avatar_files,
)

def build_tiny_kaiju():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("tiny-kaiju", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.25, 0.45, 0.28, 1.0), roughness=0.7, metalness=0.05)     # Monster green
    mat_accent = create_material("MAT_Accent", (0.35, 0.82, 0.75, 1.0), roughness=0.4, metalness=0.1) # Atomic dorsal plates (tintable)
    mat_belly = create_material("MAT_Belly", (0.85, 0.82, 0.60, 1.0), roughness=0.8, metalness=0.0)   # Underbelly scutes & snout
    mat_dark = create_material("MAT_Dark", (0.10, 0.10, 0.12, 1.0), roughness=0.4, metalness=0.2)     # Claws, eyes

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Cranium
    cranium = create_box("KaijuCranium", (0.42, 0.36, 0.34), (0, 0, 0.20), material=mat_body, parent=rig['al_head'])
    snout = create_box("KaijuSnout", (0.32, 0.20, 0.18), (0, -0.22, 0.14), material=mat_belly, parent=rig['al_head'])

    # Eyes
    eye_l = create_box("KaijuEye_L", (0.04, 0.04, 0.08), (-0.16, -0.14, 0.24), material=mat_dark, parent=rig['al_head'])
    eye_r = create_box("KaijuEye_R", (0.04, 0.04, 0.08), (0.16, -0.14, 0.24), material=mat_dark, parent=rig['al_head'])

    # Brow horns
    horn_l = create_box("Horn_L", (0.06, 0.08, 0.12), (-0.16, -0.04, 0.38), material=mat_accent, parent=rig['al_head'])
    horn_r = create_box("Horn_R", (0.06, 0.08, 0.12), (0.16, -0.04, 0.38), material=mat_accent, parent=rig['al_head'])

    # Head dorsal spines
    head_spine1 = create_box("HeadSpine1", (0.05, 0.12, 0.16), (0, 0.16, 0.34), material=mat_accent, parent=rig['al_head'])
    head_spine2 = create_box("HeadSpine2", (0.05, 0.10, 0.12), (0, 0.16, 0.16), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Chunky body
    torso = create_box("KaijuTorso", (0.54, 0.38, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    belly = create_box("BellyPlates", (0.34, 0.06, 0.46), (0, -0.19, -0.04), material=mat_belly, parent=rig['al_root'])

    # Back dorsal plates
    dorsal1 = create_box("DorsalPlate1", (0.06, 0.16, 0.18), (0, 0.20, 0.20), material=mat_accent, parent=rig['al_root'])
    dorsal2 = create_box("DorsalPlate2", (0.06, 0.18, 0.20), (0, 0.20, 0.04), material=mat_accent, parent=rig['al_root'])
    dorsal3 = create_box("DorsalPlate3", (0.06, 0.14, 0.16), (0, 0.20, -0.12), material=mat_accent, parent=rig['al_root'])

    # Elevated tail (trailing backward in +Y, well off the ground)
    tail_base = create_box("TailBase", (0.24, 0.28, 0.22), (0, 0.28, -0.18), material=mat_body, parent=rig['al_root'])
    tail_mid = create_box("TailMid", (0.18, 0.28, 0.16), (0, 0.50, -0.12), material=mat_body, parent=rig['al_root'])
    tail_tip = create_box("TailTip", (0.12, 0.24, 0.12), (0, 0.70, -0.04), material=mat_body, parent=rig['al_root'])
    tail_spike = create_box("TailSpike", (0.04, 0.10, 0.10), (0, 0.48, -0.02), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Arm_L", (0.16, 0.16, 0.44), (0, 0, -0.22), material=mat_body, parent=rig['al_arm_l'])
    claws_l = create_box("Claws_L", (0.13, 0.15, 0.12), (0, 0, -0.48), material=mat_dark, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Arm_R", (0.16, 0.16, 0.44), (0, 0, -0.22), material=mat_body, parent=rig['al_arm_r'])
    claws_r = create_box("Claws_R", (0.13, 0.15, 0.12), (0, 0, -0.48), material=mat_dark, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    leg_l = create_box("Leg_L", (0.18, 0.20, 0.40), (0, 0, -0.20), material=mat_body, parent=rig['al_leg_l'])
    foot_l = create_box("Foot_L", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_box("Leg_R", (0.18, 0.20, 0.40), (0, 0, -0.20), material=mat_body, parent=rig['al_leg_r'])
    foot_r = create_box("Foot_R", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "tiny-kaiju"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_tiny_kaiju()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
