#!/usr/bin/env python3
"""
Authoring script for avatar: sentient-street-lamp.
Rig: humanoid-heavy (hip pivot y≈0.4).
Concept: Victorian ornate cast iron lamppost body, 2.6m tall silhouette, glowing gas mantle head.
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

def build_sentient_street_lamp():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("sentient-street-lamp", rig_kind="humanoid-heavy")

    # Materials (max 4 per budget; FX_ prefix for glow-pulse)
    mat_body = create_material("MAT_Body", (0.12, 0.13, 0.15, 1.0), roughness=0.6, metalness=0.5)      # Cast iron lamppost
    mat_accent = create_material("MAT_Accent", (0.85, 0.62, 0.22, 1.0), roughness=0.35, metalness=0.7) # Brass trim, ladder arms (tintable)
    mat_glass = create_material("MAT_Glass", (0.45, 0.45, 0.42, 1.0), roughness=0.2, metalness=0.1)    # Lantern glass panes
    mat_fx = create_material("FX_Lamp", (1.0, 0.85, 0.50, 1.0), roughness=0.2, metalness=0.1, emissive=(1.0, 0.82, 0.45, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Upper post neck
    neck = create_cylinder("PostNeck", radius=0.10, depth=0.24, location=(0, 0, 0.12), material=mat_body, parent=rig['al_head'], segments=12)
    collar = create_cylinder("LanternCollar", radius=0.18, depth=0.08, location=(0, 0, 0.26), material=mat_accent, parent=rig['al_head'], segments=14)

    # Glass lantern cage & glowing mantle
    glass_core = create_box("LanternGlass", (0.34, 0.34, 0.48), (0, 0, 0.54), material=mat_glass, parent=rig['al_head'])
    mantle = create_cylinder("GlowingMantle", radius=0.08, depth=0.26, location=(0, 0, 0.54), material=mat_fx, parent=rig['al_head'], segments=12)

    # Lantern 4 corner frame bars
    bar1 = create_box("FrameBar1", (0.04, 0.04, 0.48), (-0.17, -0.17, 0.54), material=mat_body, parent=rig['al_head'])
    bar2 = create_box("FrameBar2", (0.04, 0.04, 0.48), (0.17, -0.17, 0.54), material=mat_body, parent=rig['al_head'])
    bar3 = create_box("FrameBar3", (0.04, 0.04, 0.48), (-0.17, 0.17, 0.54), material=mat_body, parent=rig['al_head'])
    bar4 = create_box("FrameBar4", (0.04, 0.04, 0.48), (0.17, 0.17, 0.54), material=mat_body, parent=rig['al_head'])

    # Pyramidal roof cap & spire
    roof = create_cone("LanternRoof", radius1=0.28, radius2=0.04, depth=0.28, location=(0, 0, 0.90), material=mat_body, parent=rig['al_head'], segments=14)
    finial = create_cylinder("SpireFinial", radius=0.025, depth=0.24, location=(0, 0, 1.08), material=mat_accent, parent=rig['al_head'], segments=8)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Fluted column body
    column = create_cylinder("FlutedColumn", radius=0.16, depth=0.58, location=(0, 0, 0), material=mat_body, parent=rig['al_root'], segments=14)
    trim_upper = create_cylinder("ColumnTrimUpper", radius=0.20, depth=0.08, location=(0, 0, 0.18), material=mat_accent, parent=rig['al_root'], segments=14)
    trim_lower = create_cylinder("ColumnTrimLower", radius=0.22, depth=0.10, location=(0, 0, -0.22), material=mat_accent, parent=rig['al_root'], segments=14)
    ladder_bar = create_box("LadderBar", (0.62, 0.06, 0.06), (0, 0, 0.24), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("ScrollArm_L", (0.12, 0.12, 0.44), (0, 0, -0.22), material=mat_body, parent=rig['al_arm_l'])
    hook_l = create_box("BrassHook_L", (0.14, 0.14, 0.08), (0, 0, -0.46), material=mat_accent, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("ScrollArm_R", (0.12, 0.12, 0.44), (0, 0, -0.22), material=mat_body, parent=rig['al_arm_r'])
    hook_r = create_box("BrassHook_R", (0.14, 0.14, 0.08), (0, 0, -0.46), material=mat_accent, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.4 for humanoid-heavy)
    # Left leg
    leg_l = create_cylinder("PostLeg_L", radius=0.09, depth=0.24, location=(0, 0, -0.12), material=mat_body, parent=rig['al_leg_l'], segments=12)
    foot_l = create_box("BaseFoot_L", (0.19, 0.28, 0.14), (0, -0.04, -0.31), material=mat_body, parent=rig['al_leg_l'])
    ring_l = create_box("BaseRing_L", (0.20, 0.29, 0.04), (0, -0.04, -0.37), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    leg_r = create_cylinder("PostLeg_R", radius=0.09, depth=0.24, location=(0, 0, -0.12), material=mat_body, parent=rig['al_leg_r'], segments=12)
    foot_r = create_box("BaseFoot_R", (0.19, 0.28, 0.14), (0, -0.04, -0.31), material=mat_body, parent=rig['al_leg_r'])
    ring_r = create_box("BaseRing_R", (0.20, 0.29, 0.04), (0, -0.04, -0.37), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "sentient-street-lamp"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_sentient_street_lamp()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
