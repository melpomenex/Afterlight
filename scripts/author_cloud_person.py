#!/usr/bin/env python3
"""
Authoring script for avatar: cloud-person.
Concept: Storm cloud head with internal flickering lightning, yellow rain slicker, rubber wellington boots.
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

def build_cloud_person():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("cloud-person", rig_kind="humanoid")

    # Materials (max 4 per budget; FX_ prefix for flicker)
    mat_body = create_material("MAT_Body", (0.75, 0.78, 0.84, 1.0), roughness=0.9, metalness=0.0)      # Billowy storm cloud
    mat_accent = create_material("MAT_Accent", (0.95, 0.78, 0.15, 1.0), roughness=0.4, metalness=0.1) # Yellow rain slicker & boots (tintable)
    mat_dark = create_material("MAT_Dark", (0.18, 0.22, 0.28, 1.0), roughness=0.7, metalness=0.1)     # Rain trousers, toggles
    mat_fx = create_material("FX_Lightning", (0.85, 0.92, 1.0, 1.0), roughness=0.2, metalness=0.1, emissive=(0.75, 0.88, 1.0, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Billowy cumulus cloud head cluster
    cloud_center = create_icosphere("CloudCenter", radius=0.22, location=(0, 0, 0.22), material=mat_body, parent=rig['al_head'], subdivisions=3)
    cloud_front = create_icosphere("CloudFront", radius=0.16, location=(0, -0.15, 0.19), material=mat_body, parent=rig['al_head'], subdivisions=2)
    cloud_left = create_icosphere("CloudLeft", radius=0.17, location=(-0.17, 0, 0.22), material=mat_body, parent=rig['al_head'], subdivisions=2)
    cloud_right = create_icosphere("CloudRight", radius=0.17, location=(0.17, 0, 0.22), material=mat_body, parent=rig['al_head'], subdivisions=2)
    cloud_top = create_icosphere("CloudTop", radius=0.18, location=(0, 0, 0.36), material=mat_body, parent=rig['al_head'], subdivisions=2)
    cloud_back = create_icosphere("CloudBack", radius=0.17, location=(0, 0.15, 0.23), material=mat_body, parent=rig['al_head'], subdivisions=2)

    # Flickering lightning shard visible inside cloud crevice
    lightning1 = create_box("LightningShard1", (0.04, 0.04, 0.18), (0.06, -0.13, 0.26), material=mat_fx, parent=rig['al_head'])
    lightning1.rotation_euler = (0.2, 0.3, -0.4)
    lightning2 = create_box("LightningShard2", (0.04, 0.04, 0.14), (-0.07, -0.12, 0.16), material=mat_fx, parent=rig['al_head'])
    lightning2.rotation_euler = (-0.2, -0.4, 0.3)

    # Rain drizzle drops hanging below cloud
    drop1 = create_cylinder("RainDrop1", radius=0.015, depth=0.06, location=(-0.09, -0.09, 0.03), material=mat_fx, parent=rig['al_head'], segments=8)
    drop2 = create_cylinder("RainDrop2", radius=0.015, depth=0.06, location=(0.09, -0.07, 0.01), material=mat_fx, parent=rig['al_head'], segments=8)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Yellow raincoat
    slicker = create_box("RainSlicker", (0.54, 0.34, 0.58), (0, 0, 0), material=mat_accent, parent=rig['al_root'])
    collar = create_box("SlickerCollar", (0.36, 0.30, 0.10), (0, 0, 0.29), material=mat_accent, parent=rig['al_root'])
    toggles = create_box("SlickerToggles", (0.04, 0.36, 0.58), (0, 0, 0), material=mat_dark, parent=rig['al_root'])
    skirt = create_box("SlickerSkirt", (0.56, 0.36, 0.22), (0, 0, -0.26), material=mat_accent, parent=rig['al_root'])

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_accent, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_dark, parent=rig['al_arm_l'])
    hand_l = create_icosphere("CloudHand_L", radius=0.08, location=(0, 0, -0.50), material=mat_body, parent=rig['al_arm_l'], subdivisions=2)

    # Right arm
    arm_r = create_box("Sleeve_R", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_accent, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_dark, parent=rig['al_arm_r'])
    hand_r = create_icosphere("CloudHand_R", radius=0.08, location=(0, 0, -0.50), material=mat_body, parent=rig['al_arm_r'], subdivisions=2)

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    pants_l = create_box("Pants_L", (0.17, 0.17, 0.38), (0, 0, -0.19), material=mat_dark, parent=rig['al_leg_l'])
    boot_l = create_box("RainBoot_L", (0.18, 0.28, 0.18), (0, -0.04, -0.41), material=mat_accent, parent=rig['al_leg_l'])

    # Right leg
    pants_r = create_box("Pants_R", (0.17, 0.17, 0.38), (0, 0, -0.19), material=mat_dark, parent=rig['al_leg_r'])
    boot_r = create_box("RainBoot_R", (0.18, 0.28, 0.18), (0, -0.04, -0.41), material=mat_accent, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "cloud-person"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_cloud_person()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
