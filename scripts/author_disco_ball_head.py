#!/usr/bin/env python3
"""
Authoring script for avatar: disco-ball-head.
Concept: Mirrored faceted disco ball head with glow-pulse sheen, sharp velvet party suit.
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

def build_disco_ball_head():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("disco-ball-head", rig_kind="humanoid")

    # Materials (max 4 per budget; FX_ prefix for glow-pulse)
    mat_body = create_material("MAT_Body", (0.24, 0.14, 0.32, 1.0), roughness=0.7, metalness=0.1)     # Velvet suit
    mat_accent = create_material("MAT_Accent", (0.92, 0.65, 0.20, 1.0), roughness=0.3, metalness=0.4) # Lapels, bowtie
    mat_dark = create_material("MAT_Dark", (0.08, 0.08, 0.10, 1.0), roughness=0.3, metalness=0.5)     # Shiny shoes, belt
    mat_fx = create_material("FX_Mirror", (0.90, 0.92, 0.96, 1.0), roughness=0.15, metalness=0.85, emissive=(0.35, 0.38, 0.45, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Mirrored faceted icosphere
    ball = create_icosphere("DiscoBallHead", radius=0.28, location=(0, 0, 0.24), material=mat_fx, parent=rig['al_head'], subdivisions=3)
    # Ensure flat shading for faceted mirror tiles
    for poly in ball.data.polygons:
        poly.use_smooth = False

    # Neck mount collar
    mount = create_cylinder("DiscoMount", radius=0.10, depth=0.08, location=(0, 0, 0.04), material=mat_dark, parent=rig['al_head'], segments=12)
    bowtie = create_box("BowTie", (0.20, 0.08, 0.08), (0, -0.12, 0.04), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Velvet jacket
    jacket = create_box("VelvetJacket", (0.52, 0.32, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    # Lapels
    lapel_l = create_box("Lapel_L", (0.10, 0.08, 0.40), (-0.14, -0.14, 0.06), material=mat_accent, parent=rig['al_root'])
    lapel_r = create_box("Lapel_R", (0.10, 0.08, 0.40), (0.14, -0.14, 0.06), material=mat_accent, parent=rig['al_root'])
    # Belt
    belt = create_box("SuitBelt", (0.54, 0.34, 0.06), (0, 0, -0.25), material=mat_dark, parent=rig['al_root'])
    buckle = create_box("SuitBuckle", (0.10, 0.36, 0.08), (0, 0, -0.25), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_l'])
    hand_l = create_box("Hand_L", (0.12, 0.14, 0.10), (0, 0, -0.50), material=mat_dark, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Sleeve_R", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_r'])
    hand_r = create_box("Hand_R", (0.12, 0.14, 0.10), (0, 0, -0.50), material=mat_dark, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    trousers_l = create_box("Trousers_L", (0.17, 0.17, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    shoe_l = create_box("DressShoe_L", (0.18, 0.28, 0.12), (0, -0.04, -0.44), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    trousers_r = create_box("Trousers_R", (0.17, 0.17, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    shoe_r = create_box("DressShoe_R", (0.18, 0.28, 0.12), (0, -0.04, -0.44), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "disco-ball-head"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_disco_ball_head()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
