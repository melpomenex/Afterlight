#!/usr/bin/env python3
"""
Authoring script for avatar: garden-gnome.
Concept: Classic folkloric garden gnome, pointed red hat, bushy white beard, blue tunic, curled boots.
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

def build_garden_gnome():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("garden-gnome", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.18, 0.35, 0.65, 1.0), roughness=0.75, metalness=0.05)   # Blue garden tunic
    mat_accent = create_material("MAT_Accent", (0.88, 0.22, 0.16, 1.0), roughness=0.6, metalness=0.05) # Pointed red hat (tintable)
    mat_white = create_material("MAT_White", (0.92, 0.92, 0.90, 1.0), roughness=0.8, metalness=0.0)    # White beard & hair
    mat_skin = create_material("MAT_Skin", (0.86, 0.65, 0.52, 1.0), roughness=0.65, metalness=0.05)   # Face skin, nose, hands

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Face head
    head_base = create_box("GnomeFace", (0.32, 0.26, 0.26), (0, -0.02, 0.16), material=mat_skin, parent=rig['al_head'])
    # Bulbous round nose
    nose = create_icosphere("GnomeNose", radius=0.075, location=(0, -0.17, 0.16), material=mat_skin, parent=rig['al_head'], subdivisions=2)
    # Chubby cheeks
    cheek_l = create_icosphere("Cheek_L", radius=0.055, location=(-0.11, -0.13, 0.14), material=mat_skin, parent=rig['al_head'], subdivisions=2)
    cheek_r = create_icosphere("Cheek_R", radius=0.055, location=(0.11, -0.13, 0.14), material=mat_skin, parent=rig['al_head'], subdivisions=2)

    # Bushy beard & moustache
    beard = create_cone("GnomeBeard", radius1=0.20, radius2=0.06, depth=0.32, location=(0, -0.10, 0.02), material=mat_white, parent=rig['al_head'], segments=14)
    moustache = create_box("Moustache", (0.24, 0.10, 0.07), (0, -0.16, 0.12), material=mat_white, parent=rig['al_head'])

    # Pointed gnome hat (reusing cone profile pattern from traffic cone guy)
    hat_brim = create_cylinder("GnomeHatBrim", radius=0.24, depth=0.06, location=(0, 0, 0.22), material=mat_accent, parent=rig['al_head'], segments=16)
    hat_cone = create_cone("GnomeHatCone", radius1=0.22, radius2=0.025, depth=0.52, location=(0, -0.02, 0.46), material=mat_accent, parent=rig['al_head'], segments=16)
    hat_cone.rotation_euler = (-0.1, 0, 0) # slight jaunty tilt back

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Plump blue tunic
    tunic = create_box("TunicTorso", (0.52, 0.38, 0.56), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    belt = create_box("GnomeBelt", (0.54, 0.40, 0.08), (0, 0, -0.22), material=mat_white, parent=rig['al_root'])
    buckle = create_box("GnomeBuckle", (0.12, 0.42, 0.09), (0, 0, -0.22), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.16, 0.16, 0.46), (0, 0, -0.23), material=mat_body, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_white, parent=rig['al_arm_l'])
    hand_l = create_box("Hand_L", (0.12, 0.14, 0.11), (0, 0, -0.50), material=mat_skin, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Sleeve_R", (0.16, 0.16, 0.46), (0, 0, -0.23), material=mat_body, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_white, parent=rig['al_arm_r'])
    hand_r = create_box("Hand_R", (0.12, 0.14, 0.11), (0, 0, -0.50), material=mat_skin, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    pants_l = create_box("Pants_L", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    boot_l = create_box("Boot_L", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    pants_r = create_box("Pants_R", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    boot_r = create_box("Boot_R", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "garden-gnome"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_garden_gnome()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
