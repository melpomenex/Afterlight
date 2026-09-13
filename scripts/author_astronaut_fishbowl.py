#!/usr/bin/env python3
"""
Authoring script for avatar: astronaut-fishbowl.
Concept: Retro orange spacesuit, spherical glass fishbowl helmet, orbiting little goldfish inside.
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

def build_astronaut_fishbowl():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("astronaut-fishbowl", rig_kind="humanoid")

    # Materials (max 4 per budget)
    mat_body = create_material("MAT_Body", (0.92, 0.44, 0.12, 1.0), roughness=0.7, metalness=0.05)     # Orange spacesuit
    mat_accent = create_material("MAT_Accent", (0.95, 0.88, 0.20, 1.0), roughness=0.4, metalness=0.2) # Chest pack, oxygen tanks, goldfish (tintable)
    mat_glass = create_material("MAT_Glass", (0.40, 0.65, 0.75, 1.0), roughness=0.15, metalness=0.1)   # Clear fishbowl glass & water
    mat_dark = create_material("MAT_Dark", (0.12, 0.12, 0.15, 1.0), roughness=0.6, metalness=0.2)     # Gloves, boots, backpack

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Neck collar
    collar = create_cylinder("NeckRing", radius=0.22, depth=0.08, location=(0, 0, 0.04), material=mat_accent, parent=rig['al_head'], segments=16)
    # Glass fishbowl sphere
    bowl = create_icosphere("GlassFishbowl", radius=0.26, location=(0, 0, 0.24), material=mat_glass, parent=rig['al_head'], subdivisions=3)
    water = create_cylinder("WaterVolume", radius=0.22, depth=0.30, location=(0, 0, 0.20), material=mat_glass, parent=rig['al_head'], segments=14)

    # Goldfish node inside fishbowl (starts with FX_Fish so float effect orbits it inside bowl)
    fish = create_box("FX_Fish", (0.05, 0.08, 0.045), (0.08, 0, 0.24), material=mat_accent, parent=rig['al_head'])
    tail = create_box("FishTail", (0.02, 0.04, 0.05), (0.08, 0.05, 0.24), material=mat_accent, parent=fish)
    eye = create_box("FishEye", (0.055, 0.02, 0.02), (0.08, -0.025, 0.25), material=mat_dark, parent=fish)

    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # Puffy spacesuit torso
    suit = create_box("SpacesuitTorso", (0.54, 0.36, 0.58), (0, 0, 0), material=mat_body, parent=rig['al_root'])
    chest_pack = create_box("LifeSupportChest", (0.32, 0.08, 0.30), (0, -0.19, 0.08), material=mat_accent, parent=rig['al_root'])
    harness = create_box("HarnessStraps", (0.44, 0.37, 0.54), (0, 0, 0), material=mat_dark, parent=rig['al_root'])

    # Backpack & Oxygen tanks
    pack = create_box("Backpack", (0.42, 0.18, 0.46), (0, 0.20, 0.06), material=mat_dark, parent=rig['al_root'])
    tank_l = create_cylinder("OxygenTank_L", radius=0.07, depth=0.42, location=(-0.11, 0.26, 0.06), material=mat_accent, parent=rig['al_root'], segments=12)
    tank_r = create_cylinder("OxygenTank_R", radius=0.07, depth=0.42, location=(0.11, 0.26, 0.06), material=mat_accent, parent=rig['al_root'], segments=12)

    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # Left arm
    arm_l = create_box("Sleeve_L", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_l'])
    cuff_l = create_box("Cuff_L", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_l'])
    glove_l = create_box("SpaceGlove_L", (0.14, 0.15, 0.12), (0, 0, -0.50), material=mat_dark, parent=rig['al_arm_l'])

    # Right arm
    arm_r = create_box("Sleeve_R", (0.16, 0.16, 0.48), (0, 0, -0.24), material=mat_body, parent=rig['al_arm_r'])
    cuff_r = create_box("Cuff_R", (0.17, 0.17, 0.06), (0, 0, -0.42), material=mat_accent, parent=rig['al_arm_r'])
    glove_r = create_box("SpaceGlove_R", (0.14, 0.15, 0.12), (0, 0, -0.50), material=mat_dark, parent=rig['al_arm_r'])

    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # Left leg
    pants_l = create_box("Pants_L", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_l'])
    patch_l = create_box("KneePatch_L", (0.19, 0.04, 0.08), (0, -0.08, -0.21), material=mat_accent, parent=rig['al_leg_l'])
    boot_l = create_box("MoonBoot_L", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_dark, parent=rig['al_leg_l'])

    # Right leg
    pants_r = create_box("Pants_R", (0.18, 0.18, 0.42), (0, 0, -0.21), material=mat_body, parent=rig['al_leg_r'])
    patch_r = create_box("KneePatch_R", (0.19, 0.04, 0.08), (0, -0.08, -0.21), material=mat_accent, parent=rig['al_leg_r'])
    boot_r = create_box("MoonBoot_R", (0.19, 0.28, 0.14), (0, -0.04, -0.43), material=mat_dark, parent=rig['al_leg_r'])

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "astronaut-fishbowl"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_astronaut_fishbowl()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
