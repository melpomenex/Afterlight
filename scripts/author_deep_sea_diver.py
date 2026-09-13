#!/usr/bin/env python3
"""
Authoring script for avatar: deep-sea-diver.
Rig: humanoid-heavy (hip pivot y≈0.4).
Concept: Mark V brass diving helmet, canvas suit, glowing porthole, lead boots and weight belt.
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

def build_deep_sea_diver():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("deep-sea-diver", rig_kind="humanoid-heavy")

    # Materials (max 4 per budget; FX_ prefix for glow-pulse)
    mat_body = create_material("MAT_Body", (0.72, 0.68, 0.58, 1.0), roughness=0.8, metalness=0.05)     # Canvas suit
    mat_accent = create_material("MAT_Accent", (0.82, 0.64, 0.25, 1.0), roughness=0.35, metalness=0.75) # Brass helmet, breastplate (tintable)
    mat_dark = create_material("MAT_Dark", (0.12, 0.13, 0.15, 1.0), roughness=0.7, metalness=0.3)      # Lead boots, weight belt, rubber hoses
    mat_fx = create_material("FX_Porthole", (0.20, 0.75, 0.85, 1.0), roughness=0.2, metalness=0.1, emissive=(0.30, 0.70, 0.80, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Brass dome helmet
    helmet = create_icosphere("DiverHelmet", radius=0.26, location=(0, 0, 0.22), material=mat_accent, parent=rig['al_head'], subdivisions=3)
    collar_ring = create_cylinder("BreastplateCollar", radius=0.27, depth=0.08, location=(0, 0, 0.04), material=mat_accent, parent=rig['al_head'], segments=16)

    # Front viewing porthole
    porthole_frame = create_cylinder("PortholeFrame", radius=0.13, depth=0.06, location=(0, -0.23, 0.22), material=mat_accent, parent=rig['al_head'], segments=16)
    porthole_frame.rotation_euler = (1.5708, 0, 0)
    porthole_glass = create_cylinder("PortholeGlass", radius=0.10, depth=0.065, location=(0, -0.232, 0.22), material=mat_fx, parent=rig['al_head'], segments=16)
    porthole_glass.rotation_euler = (1.5708, 0, 0)

    # Side portholes
    port_l = create_cylinder("Port_L", radius=0.08, depth=0.04, location=(-0.24, 0, 0.22), material=mat_accent, parent=rig['al_head'], segments=12)
    port_l.rotation_euler = (0, 1.5708, 0)
    port_r = create_cylinder("Port_R", radius=0.08, depth=0.04, location=(0.24, 0, 0.22), material=mat_accent, parent=rig['al_head'], segments=12)
    port_r.rotation_euler = (0, 1.5708, 0)

    top_valve = create_box("TopValve", (0.10, 0.10, 0.06), (0, 0, 0.49), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Chunky canvas suit
    suit_torso = create_box("SuitTorso", (0.58, 0.40, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    breastplate = create_box("Breastplate", (0.48, 0.12, 0.38), (0, -0.16, 0.10), material=mat_accent, parent=rig['al_root'])
    weight_belt = create_box("WeightBelt", (0.60, 0.42, 0.10), (0, 0, -0.24), material=mat_dark, parent=rig['al_root'])
    weight1 = create_box("WeightBlock1", (0.12, 0.08, 0.12), (0, -0.22, -0.24), material=mat_dark, parent=rig['al_root'])
    weight2 = create_box("WeightBlock2", (0.12, 0.08, 0.12), (-0.22, -0.12, -0.24), material=mat_dark, parent=rig['al_root'])
    weight3 = create_box("WeightBlock3", (0.12, 0.08, 0.12), (0.22, -0.12, -0.24), material=mat_dark, parent=rig['al_root'])

    # Back air tank
    air_tank = create_cylinder("AirTank", radius=0.12, depth=0.44, location=(0, 0.24, 0.04), material=mat_accent, parent=rig['al_root'], segments=14)
    hose = create_box("AirHose", (0.04, 0.16, 0.28), (0.16, 0.12, 0.24), material=mat_dark, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.18, 0.18, 0.46), (0, 0, -0.23), material=mat_body, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.19, 0.19, 0.06), (0, 0, -0.40), material=mat_accent, parent=rig['al_arm_l'])
    glove_l = create_box("Glove_L", (0.15, 0.16, 0.14), (0, 0, -0.49), material=mat_dark, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Sleeve_R", (0.18, 0.18, 0.46), (0, 0, -0.23), material=mat_body, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.19, 0.19, 0.06), (0, 0, -0.40), material=mat_accent, parent=rig['al_arm_r'])
    glove_r = create_box("Glove_R", (0.15, 0.16, 0.14), (0, 0, -0.49), material=mat_dark, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.4 for humanoid-heavy)
    # Left leg
    leg_l = create_box("SuitLeg_L", (0.20, 0.20, 0.20), (0, 0, -0.10), material=mat_body, parent=rig['al_leg_l'])
    boot_l = create_box("LeadBoot_L", (0.22, 0.30, 0.18), (0, -0.04, -0.29), material=mat_dark, parent=rig['al_leg_l'])
    toecap_l = create_box("ToeCap_L", (0.23, 0.12, 0.10), (0, -0.13, -0.33), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_box("SuitLeg_R", (0.20, 0.20, 0.20), (0, 0, -0.10), material=mat_body, parent=rig['al_leg_r'])
    boot_r = create_box("LeadBoot_R", (0.22, 0.30, 0.18), (0, -0.04, -0.29), material=mat_dark, parent=rig['al_leg_r'])
    toecap_r = create_box("ToeCap_R", (0.23, 0.12, 0.10), (0, -0.13, -0.33), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "deep-sea-diver"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_deep_sea_diver()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
