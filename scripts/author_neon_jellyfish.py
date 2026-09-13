#!/usr/bin/env python3
"""
Authoring script for avatar: neon-jellyfish.
Rig: floating (AL_Rig, AL_Root, AL_Head; no legs/arms).
Concept: Bioluminescent bell umbrella, glowing pulsing inner organ, trailing undulating tentacles.
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

def build_neon_jellyfish():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("neon-jellyfish", rig_kind="floating")

    # Materials (max 4 per budget; FX_ prefix for glow-pulse)
    mat_body = create_material("MAT_Body", (0.18, 0.12, 0.35, 1.0), roughness=0.2, metalness=0.1)      # Dark violet bell umbrella
    mat_accent = create_material("MAT_Accent", (0.92, 0.18, 0.65, 1.0), roughness=0.3, metalness=0.2)  # Magenta ruffled oral frills (tintable)
    mat_dark = create_material("MAT_Dark", (0.08, 0.06, 0.16, 1.0), roughness=0.5, metalness=0.2)      # Deep indigo tentacles
    mat_fx = create_material("FX_Neon", (0.25, 0.95, 0.90, 1.0), roughness=0.2, metalness=0.1, emissive=(0.35, 0.95, 0.90, 1.0))

    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # Bell umbrella dome
    cap_cone = create_cone("JellyCap", radius1=0.44, radius2=0.18, depth=0.34, location=(0, 0, 0.22), material=mat_body, parent=rig['al_head'], segments=16)
    cap_top = create_cylinder("JellyCapTop", radius=0.20, depth=0.08, location=(0, 0, 0.40), material=mat_body, parent=rig['al_head'], segments=14)
    scallop_rim = create_cylinder("ScallopRim", radius=0.46, depth=0.06, location=(0, 0, 0.04), material=mat_accent, parent=rig['al_head'], segments=16)

    # Luminous pulsing inner organ
    inner_organ = create_icosphere("GlowingOrgan", radius=0.18, location=(0, 0, 0.18), material=mat_fx, parent=rig['al_head'], subdivisions=2)

    # 2. Torso & Tentacles on AL_Root (pivot at 0, 0, 0.9)
    # Central ruffled oral arms
    oral_column = create_cylinder("OralArms", radius=0.16, depth=0.38, location=(0, 0, 0.10), material=mat_accent, parent=rig['al_root'], segments=12)
    oral_core = create_cylinder("OralCore", radius=0.08, depth=0.32, location=(0, 0, 0.10), material=mat_fx, parent=rig['al_root'], segments=10)

    # Trailing tentacles (named FX_Tentacle_* for effects.js float sway)
    t1 = create_cylinder("FX_Tentacle_1", radius=0.03, depth=0.68, location=(-0.16, -0.16, -0.32), material=mat_dark, parent=rig['al_root'], segments=8)
    tip1 = create_icosphere("Tip_1", radius=0.045, location=(-0.16, -0.16, -0.66), material=mat_fx, parent=rig['al_root'], subdivisions=1)

    t2 = create_cylinder("FX_Tentacle_2", radius=0.03, depth=0.68, location=(0.16, -0.16, -0.32), material=mat_dark, parent=rig['al_root'], segments=8)
    tip2 = create_icosphere("Tip_2", radius=0.045, location=(0.16, -0.16, -0.66), material=mat_fx, parent=rig['al_root'], subdivisions=1)

    t3 = create_cylinder("FX_Tentacle_3", radius=0.03, depth=0.68, location=(-0.16, 0.16, -0.32), material=mat_dark, parent=rig['al_root'], segments=8)
    tip3 = create_icosphere("Tip_3", radius=0.045, location=(-0.16, 0.16, -0.66), material=mat_fx, parent=rig['al_root'], subdivisions=1)

    t4 = create_cylinder("FX_Tentacle_4", radius=0.03, depth=0.68, location=(0.16, 0.16, -0.32), material=mat_dark, parent=rig['al_root'], segments=8)
    tip4 = create_icosphere("Tip_4", radius=0.045, location=(0.16, 0.16, -0.66), material=mat_fx, parent=rig['al_root'], subdivisions=1)

def main():
    repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    avatar_id = "neon-jellyfish"

    blend_path = os.path.join(repo_dir, "assets-blender", "avatars", avatar_id, f"{avatar_id}.blend")
    glb_path = os.path.join(repo_dir, "public", "avatars", avatar_id, f"{avatar_id}.glb")
    preview_path = os.path.join(repo_dir, "public", "avatars", avatar_id, "preview.png")

    build_neon_jellyfish()
    export_avatar_files(avatar_id, blend_path, glb_path, preview_path)

if __name__ == '__main__':
    main()
