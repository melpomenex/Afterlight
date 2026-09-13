#!/usr/bin/env python3
"""
Authoring script for avatar: walking-mushroom.
Concept: Portly fungus person, toadstool cap with white spots, glowing bio-luminescent gills, mossy cloak.
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

def build_walking_mushroom():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("walking-mushroom", rig_kind="humanoid")

    # Materials (max 4 per budget; FX_ prefix for glow-pulse)
    mat_body = create_material("MAT_Body", (0.24, 0.38, 0.22, 1.0), roughness=0.8, metalness=0.05)     # Forest moss cloak
    mat_accent = create_material("MAT_Accent", (0.85, 0.22, 0.16, 1.0), roughness=0.6, metalness=0.05) # Red toadstool cap (tintable)
    mat_stem = create_material("MAT_Stem", (0.92, 0.89, 0.80, 1.0), roughness=0.7, metalness=0.0)      # Mushroom flesh & spots
    mat_fx = create_material("FX_Gills", (0.40, 0.85, 0.50, 1.0), roughness=0.4, metalness=0.1, emissive=(0.35, 0.80, 0.45, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Mushroom stalk neck & cute face
    stalk = create_cylinder("MushroomNeck", radius=0.16, depth=0.22, location=(0, 0, 0.08), material=mat_stem, parent=rig['al_head'], segments=14)
    eye_l = create_box("MushroomEye_L", (0.04, 0.02, 0.05), (-0.07, -0.16, 0.11), material=mat_body, parent=rig['al_head'])
    eye_r = create_box("MushroomEye_R", (0.04, 0.02, 0.05), (0.07, -0.16, 0.11), material=mat_body, parent=rig['al_head'])

    # Glowing bio-luminescent gills under cap
    gills = create_cylinder("GillsUnderside", radius=0.42, depth=0.06, location=(0, 0, 0.21), material=mat_fx, parent=rig['al_head'], segments=16)

    # Broad toadstool cap
    cap_cone = create_cone("MushroomCap", radius1=0.46, radius2=0.18, depth=0.24, location=(0, 0, 0.34), material=mat_accent, parent=rig['al_head'], segments=16)
    cap_top = create_cylinder("MushroomCapTop", radius=0.20, depth=0.08, location=(0, 0, 0.46), material=mat_accent, parent=rig['al_head'], segments=14)

    # White spots on cap
    spot_top = create_cylinder("Spot_Top", radius=0.08, depth=0.02, location=(0, 0, 0.50), material=mat_stem, parent=rig['al_head'], segments=10)
    spot_f = create_cylinder("Spot_F", radius=0.06, depth=0.02, location=(0, -0.30, 0.35), material=mat_stem, parent=rig['al_head'], segments=10)
    spot_f.rotation_euler = (0.6, 0, 0)
    spot_b = create_cylinder("Spot_B", radius=0.06, depth=0.02, location=(0, 0.30, 0.35), material=mat_stem, parent=rig['al_head'], segments=10)
    spot_b.rotation_euler = (-0.6, 0, 0)
    spot_l = create_cylinder("Spot_L", radius=0.06, depth=0.02, location=(-0.30, 0, 0.35), material=mat_stem, parent=rig['al_head'], segments=10)
    spot_l.rotation_euler = (0, -0.6, 0)
    spot_r = create_cylinder("Spot_R", radius=0.06, depth=0.02, location=(0.30, 0, 0.35), material=mat_stem, parent=rig['al_head'], segments=10)
    spot_r.rotation_euler = (0, 0.6, 0)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Portly mossy cloak
    cloak = create_box("MossyCloak", (0.58, 0.44, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    belly = create_box("StalkBelly", (0.28, 0.10, 0.42), (0, -0.19, -0.04), material=mat_stem, parent=rig['al_root'])
    vine_belt = create_box("VineBelt", (0.60, 0.46, 0.08), (0, 0, -0.22), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    shoulder_l = create_box("Shoulder_L", (0.18, 0.18, 0.14), (0, 0, -0.07), material=mat_body, parent=rig['al_arm_l'])
    arm_l = create_cylinder("Arm_L", radius=0.065, depth=0.34, location=(0, 0, -0.28), material=mat_stem, parent=rig['al_arm_l'], segments=12)
    hand_l = create_box("Hand_L", (0.13, 0.14, 0.12), (0, 0, -0.48), material=mat_stem, parent=rig['al_arm_l'])

    # Right arm
    shoulder_r = create_box("Shoulder_R", (0.18, 0.18, 0.14), (0, 0, -0.07), material=mat_body, parent=rig['al_arm_r'])
    arm_r = create_cylinder("Arm_R", radius=0.065, depth=0.34, location=(0, 0, -0.28), material=mat_stem, parent=rig['al_arm_r'], segments=12)
    hand_r = create_box("Hand_R", (0.13, 0.14, 0.12), (0, 0, -0.48), material=mat_stem, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    leg_l = create_cylinder("Leg_L", radius=0.085, depth=0.36, location=(0, 0, -0.22), material=mat_stem, parent=rig['al_leg_l'], segments=12)
    foot_l = create_box("Foot_L", (0.17, 0.26, 0.12), (0, -0.04, -0.43), material=mat_stem, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_cylinder("Leg_R", radius=0.085, depth=0.36, location=(0, 0, -0.22), material=mat_stem, parent=rig['al_leg_l'], segments=12)
    foot_r = create_box("Foot_R", (0.17, 0.26, 0.12), (0, -0.04, -0.43), material=mat_stem, parent=rig['al_leg_l'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "walking-mushroom"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_walking_mushroom()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
