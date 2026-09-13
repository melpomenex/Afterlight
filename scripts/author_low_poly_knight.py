#!/usr/bin/env python3
"""
Authoring script for avatar: low-poly-knight.
Concept: Chunky toy knight, plate armor, bucket helm with plume, blunt sheathed sword.
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

def build_low_poly_knight():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("low-poly-knight", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.68, 0.70, 0.74, 1.0), roughness=0.4, metalness=0.6)     # Steel plate armor
    mat_accent = create_material("MAT_Accent", (0.85, 0.22, 0.18, 1.0), roughness=0.6, metalness=0.1) # Surcoat heraldry, plume
    mat_dark = create_material("MAT_Dark", (0.14, 0.14, 0.16, 1.0), roughness=0.8, metalness=0.2)     # Visor slit, scabbard
    mat_gold = create_material("MAT_Gold", (0.88, 0.72, 0.28, 1.0), roughness=0.3, metalness=0.8)     # Brass trim, sword hilt

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Bucket helm
    helm = create_cylinder("BucketHelm", radius=0.22, depth=0.40, location=(0, 0, 0.22), material=mat_body, parent=rig['al_head'], segments=14)
    # Visor slit
    visor = create_box("VisorSlit", (0.28, 0.10, 0.05), (0, -0.18, 0.22), material=mat_dark, parent=rig['al_head'])
    # Brow trim
    brow = create_box("BrowTrim", (0.30, 0.05, 0.04), (0, -0.19, 0.27), material=mat_gold, parent=rig['al_head'])
    # Plume / crest
    plume = create_box("HelmPlume", (0.06, 0.24, 0.16), (0, 0.02, 0.46), material=mat_accent, parent=rig['al_head'])

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Cuirass chestpiece
    cuirass = create_box("Cuirass", (0.54, 0.36, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    # Surcoat / tabard
    surcoat = create_box("Surcoat", (0.32, 0.38, 0.62), (0, 0, -0.04), material=mat_accent, parent=rig['al_root'])
    heraldic_cross = create_box("HeraldicCross", (0.16, 0.04, 0.20), (0, -0.20, 0.08), material=mat_gold, parent=rig['al_root'])
    # Belt
    belt = create_box("WarBelt", (0.56, 0.38, 0.08), (0, 0, -0.24), material=mat_dark, parent=rig['al_root'])
    buckle = create_box("WarBuckle", (0.12, 0.40, 0.09), (0, 0, -0.24), material=mat_gold, parent=rig['al_root'])

    # Sheathed sword at hip
    scabbard = create_box("Scabbard", (0.06, 0.10, 0.50), (0.30, 0, -0.26), material=mat_dark, parent=rig['al_root'])
    crossguard = create_box("Crossguard", (0.08, 0.18, 0.04), (0.30, 0, 0.02), material=mat_gold, parent=rig['al_root'])
    pommel = create_icosphere("Pommel", radius=0.04, location=(0.30, 0, 0.12), material=mat_gold, parent=rig['al_root'], subdivisions=2)

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    pauldron_l = create_box("Pauldron_L", (0.22, 0.22, 0.14), (0, 0, -0.04), material=mat_body, parent=rig['al_arm_l'])
    vambrace_l = create_box("Vambrace_L", (0.16, 0.16, 0.34), (0, 0, -0.26), material=mat_body, parent=rig['al_arm_l'])
    cuff_ring_l = create_box("CuffRing_L", (0.17, 0.17, 0.05), (0, 0, -0.40), material=mat_gold, parent=rig['al_arm_l'])
    gauntlet_l = create_box("Gauntlet_L", (0.15, 0.16, 0.14), (0, 0, -0.48), material=mat_body, parent=rig['al_arm_l'])

    # Right arm
    pauldron_r = create_box("Pauldron_R", (0.22, 0.22, 0.14), (0, 0, -0.04), material=mat_body, parent=rig['al_arm_r'])
    vambrace_r = create_box("Vambrace_R", (0.16, 0.16, 0.34), (0, 0, -0.26), material=mat_body, parent=rig['al_arm_r'])
    cuff_ring_r = create_box("CuffRing_R", (0.17, 0.17, 0.05), (0, 0, -0.40), material=mat_gold, parent=rig['al_arm_r'])
    gauntlet_r = create_box("Gauntlet_R", (0.15, 0.16, 0.14), (0, 0, -0.48), material=mat_body, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    cuisse_l = create_box("Cuisse_L", (0.18, 0.18, 0.22), (0, 0, -0.11), material=mat_body, parent=rig['al_leg_l'])
    poleyn_l = create_box("Poleyn_L", (0.19, 0.08, 0.08), (0, -0.06, -0.22), material=mat_gold, parent=rig['al_leg_l'])
    greave_l = create_box("Greave_L", (0.18, 0.18, 0.18), (0, 0, -0.32), material=mat_body, parent=rig['al_leg_l'])
    sabaton_l = create_box("Sabaton_L", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_body, parent=rig['al_leg_l'])

    # Right leg
    cuisse_r = create_box("Cuisse_R", (0.18, 0.18, 0.22), (0, 0, -0.11), material=mat_body, parent=rig['al_leg_r'])
    poleyn_r = create_box("Poleyn_R", (0.19, 0.08, 0.08), (0, -0.06, -0.22), material=mat_gold, parent=rig['al_leg_r'])
    greave_r = create_box("Greave_R", (0.18, 0.18, 0.18), (0, 0, -0.32), material=mat_body, parent=rig['al_leg_r'])
    sabaton_r = create_box("Sabaton_R", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_body, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "low-poly-knight"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_low_poly_knight()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
