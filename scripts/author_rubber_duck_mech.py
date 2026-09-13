#!/usr/bin/env python3
"""
Authoring script for avatar: rubber-duck-mech.
Concept: Chunky industrial diesel-mech chassis topped by a giant bright yellow rubber duck
with aviator goggles, heavy hydraulic claw arms, and three-toed mechanical stomper boots.
Rig: humanoid-heavy (hip pivot at y ≈ 0.4).
"""

import os
import sys
import math
import bpy
import bmesh
from mathutils import Vector, Euler

sys.path.append(os.path.dirname(__file__))
from avatar_pipeline import (
    reset_scene,
    create_material,
    create_icosphere,
    create_cylinder,
    create_cone,
    create_box,
    setup_avatar_rig,
    export_avatar_files,
)

def build_rubber_duck_mech():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("rubber-duck-mech", rig_kind="humanoid-heavy")

    # Materials (4 materials, <= 4 budget, tintMaterials=['MAT_Accent'])
    mat_yellow = create_material("MAT_Duck_Yellow", (0.98, 0.80, 0.12, 1.0), roughness=0.45, metalness=0.05)
    mat_orange = create_material("MAT_Duck_Orange", (0.96, 0.40, 0.06, 1.0), roughness=0.50, metalness=0.0)
    mat_metal = create_material("MAT_Metal", (0.26, 0.28, 0.32, 1.0), roughness=0.45, metalness=0.75)
    mat_accent = create_material("MAT_Accent", (0.18, 0.65, 0.88, 1.0), roughness=0.40, metalness=0.40)

    # ==========================================
    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # ==========================================
    # Rubber duck round head
    duck_head = create_icosphere("DuckHead", radius=0.25, location=(0, -0.04, 0.22),
                                 material=mat_yellow, parent=rig['al_head'], subdivisions=3)

    # Big classic rubber duck bill / beak
    beak_upper = create_box("DuckBeak_Upper", (0.24, 0.22, 0.08), (0, -0.28, 0.18),
                            material=mat_orange, parent=rig['al_head'])
    beak_lower = create_box("DuckBeak_Lower", (0.20, 0.18, 0.06), (0, -0.26, 0.12),
                            material=mat_orange, parent=rig['al_head'])
    # Beak nostril bumps
    create_icosphere("Nostril_L", radius=0.02, location=(-0.05, -0.34, 0.22),
                     material=mat_metal, parent=rig['al_head'], subdivisions=1)
    create_icosphere("Nostril_R", radius=0.02, location=(0.05, -0.34, 0.22),
                     material=mat_metal, parent=rig['al_head'], subdivisions=1)

    # Pilot Aviator Goggles on the duck head
    goggle_strap = create_box("GoggleStrap", (0.52, 0.50, 0.06), (0, -0.04, 0.26),
                              material=mat_metal, parent=rig['al_head'])
    goggle_lens_l = create_cylinder("GoggleLens_L", radius=0.085, depth=0.06,
                                    location=(-0.13, -0.24, 0.26), material=mat_accent,
                                    parent=rig['al_head'], segments=16)
    goggle_lens_l.rotation_euler = (1.5708, 0, 0)
    goggle_rim_l = create_cylinder("GoggleRim_L", radius=0.10, depth=0.04,
                                   location=(-0.13, -0.22, 0.26), material=mat_metal,
                                   parent=rig['al_head'], segments=16)
    goggle_rim_l.rotation_euler = (1.5708, 0, 0)

    goggle_lens_r = create_cylinder("GoggleLens_R", radius=0.085, depth=0.06,
                                    location=(0.13, -0.24, 0.26), material=mat_accent,
                                    parent=rig['al_head'], segments=16)
    goggle_lens_r.rotation_euler = (1.5708, 0, 0)
    goggle_rim_r = create_cylinder("GoggleRim_R", radius=0.10, depth=0.04,
                                   location=(0.13, -0.22, 0.26), material=mat_metal,
                                   parent=rig['al_head'], segments=16)
    goggle_rim_r.rotation_euler = (1.5708, 0, 0)

    # Mech comm antenna with spring coil on head
    antenna_base = create_cylinder("AntennaBase", radius=0.03, depth=0.04,
                                   location=(-0.14, 0.08, 0.48), material=mat_metal,
                                   parent=rig['al_head'], segments=10)
    antenna_mast = create_cylinder("AntennaMast", radius=0.012, depth=0.28,
                                   location=(-0.14, 0.08, 0.62), material=mat_metal,
                                   parent=rig['al_head'], segments=8)
    antenna_tip = create_icosphere("AntennaTip", radius=0.03,
                                   location=(-0.14, 0.08, 0.77), material=mat_orange,
                                   parent=rig['al_head'], subdivisions=2)

    # ==========================================
    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # ==========================================
    # Plump duck body / chest
    duck_body = create_box("DuckTorso", (0.56, 0.52, 0.46), (0, 0, 0.05),
                           material=mat_yellow, parent=rig['al_root'])

    # Duck tail feathery upturn at rear
    duck_tail = create_cone("DuckTail", radius1=0.16, radius2=0.02, depth=0.26,
                            location=(0, 0.32, 0.16), material=mat_yellow,
                            parent=rig['al_root'], segments=12)
    duck_tail.rotation_euler = (-0.75, 0, 0)

    # Mech armor cage / harness bracing the duck
    chest_plate = create_box("MechChestPlate", (0.50, 0.12, 0.30), (0, -0.24, -0.02),
                             material=mat_metal, parent=rig['al_root'])
    chest_accent = create_box("MechChestAccent", (0.32, 0.13, 0.18), (0, -0.245, -0.02),
                              material=mat_accent, parent=rig['al_root'])

    # Industrial roll cage / chassis framing
    roll_cage_l = create_cylinder("RollCage_L", radius=0.025, depth=0.52,
                                  location=(-0.30, -0.15, 0.06), material=mat_metal,
                                  parent=rig['al_root'], segments=8)
    roll_cage_r = create_cylinder("RollCage_R", radius=0.025, depth=0.52,
                                  location=(0.30, -0.15, 0.06), material=mat_metal,
                                  parent=rig['al_root'], segments=8)

    # Heavy diesel boiler / engine backpack on the rear
    boiler_tank = create_cylinder("BoilerTank", radius=0.18, depth=0.48,
                                  location=(0, 0.28, -0.05), material=mat_metal,
                                  parent=rig['al_root'], segments=16)
    boiler_cap = create_cylinder("BoilerCap", radius=0.20, depth=0.08,
                                 location=(0, 0.28, 0.18), material=mat_accent,
                                 parent=rig['al_root'], segments=16)

    # Dual exhaust smokestacks
    stack_l = create_cylinder("ExhaustStack_L", radius=0.045, depth=0.35,
                              location=(-0.16, 0.34, 0.30), material=mat_metal,
                              parent=rig['al_root'], segments=12)
    stack_r = create_cylinder("ExhaustStack_R", radius=0.045, depth=0.35,
                              location=(0.16, 0.34, 0.30), material=mat_metal,
                              parent=rig['al_root'], segments=12)

    # Heavy pelvic chassis block
    pelvis_block = create_box("PelvisChassis", (0.54, 0.44, 0.18), (0, 0, -0.22),
                              material=mat_metal, parent=rig['al_root'])
    pelvis_plate = create_box("PelvisPlate", (0.36, 0.46, 0.14), (0, 0, -0.22),
                              material=mat_accent, parent=rig['al_root'])

    # ==========================================
    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # ==========================================
    for is_right in [False, True]:
        side = "_R" if is_right else "_L"
        parent = rig['al_arm_r'] if is_right else rig['al_arm_l']
        sign = 1.0 if is_right else -1.0

        # Chunky Mech Shoulder Pauldron
        pauldron = create_box(f"MechPauldron{side}", (0.24, 0.28, 0.22), (0, 0, 0.02),
                              material=mat_accent, parent=parent)
        shoulder_joint = create_cylinder(f"ShoulderJoint{side}", radius=0.10, depth=0.26,
                                         location=(0, 0, 0.02), material=mat_metal,
                                         parent=parent, segments=12)
        shoulder_joint.rotation_euler = (0, 1.5708, 0)

        # Upper arm hydraulic strut
        strut = create_cylinder(f"ArmStrut{side}", radius=0.06, depth=0.24,
                                location=(0, 0, -0.18), material=mat_metal,
                                parent=parent, segments=12)

        # Heavy hydraulic forearm
        forearm = create_box(f"Forearm{side}", (0.18, 0.22, 0.28), (0, -0.04, -0.36),
                             material=mat_metal, parent=parent)
        forearm_trim = create_box(f"ForearmTrim{side}", (0.20, 0.16, 0.18), (0, -0.04, -0.36),
                                  material=mat_accent, parent=parent)

        # 3-Prong Industrial Mech Claw / Clamp Hand
        claw_palm = create_cylinder(f"ClawPalm{side}", radius=0.08, depth=0.08,
                                    location=(0, -0.04, -0.52), material=mat_metal,
                                    parent=parent, segments=12)
        # Claw fingers (bright yellow tips like mini duck bill clamps!)
        finger_1 = create_box(f"ClawFinger1{side}", (0.05, 0.06, 0.16), (-sign * 0.06, -0.08, -0.60),
                              material=mat_orange, parent=parent)
        finger_2 = create_box(f"ClawFinger2{side}", (0.05, 0.06, 0.16), (sign * 0.06, -0.08, -0.60),
                              material=mat_orange, parent=parent)
        thumb = create_box(f"ClawThumb{side}", (0.05, 0.06, 0.14), (0, 0.04, -0.58),
                           material=mat_orange, parent=parent)

    # ==========================================
    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.4)
    # ==========================================
    for is_right in [False, True]:
        side = "_R" if is_right else "_L"
        parent = rig['al_leg_r'] if is_right else rig['al_leg_l']
        sign = 1.0 if is_right else -1.0

        # Chunky Mech Hip and Thigh Piston
        hip_socket = create_icosphere(f"HipSocket{side}", radius=0.10, location=(0, 0, 0.04),
                                      material=mat_metal, parent=parent, subdivisions=2)
        thigh_piston = create_cylinder(f"ThighPiston{side}", radius=0.075, depth=0.20,
                                       location=(0, 0, -0.08), material=mat_metal,
                                       parent=parent, segments=12)

        # Heavy Armored Knee Guard
        knee_guard = create_box(f"KneeGuard{side}", (0.16, 0.12, 0.14), (0, -0.08, -0.16),
                                material=mat_accent, parent=parent)

        # Lower leg hydraulic shock absorber
        shin_strut = create_cylinder(f"ShinStrut{side}", radius=0.065, depth=0.18,
                                     location=(0, 0, -0.26), material=mat_metal,
                                     parent=parent, segments=12)

        # Massive 3-toed duck-foot stomper boot
        foot_chassis = create_box(f"FootChassis{side}", (0.22, 0.20, 0.10), (0, 0, -0.35),
                                  material=mat_metal, parent=parent)
        # 3 webbed/toed mechanical treads
        toe_center = create_box(f"ToeCenter{side}", (0.08, 0.20, 0.08), (0, -0.16, -0.36),
                                material=mat_orange, parent=parent)
        toe_outer = create_box(f"ToeOuter{side}", (0.07, 0.18, 0.08), (sign * 0.10, -0.14, -0.36),
                               material=mat_orange, parent=parent)
        toe_inner = create_box(f"ToeInner{side}", (0.07, 0.18, 0.08), (-sign * 0.10, -0.14, -0.36),
                               material=mat_orange, parent=parent)
        heel_spur = create_box(f"HeelSpur{side}", (0.16, 0.10, 0.08), (0, 0.14, -0.36),
                               material=mat_metal, parent=parent)

    # File paths
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    blend_path = os.path.join(base_dir, "assets-blender/avatars/rubber-duck-mech/rubber-duck-mech.blend")
    glb_path = os.path.join(base_dir, "public/avatars/rubber-duck-mech/rubber-duck-mech.glb")
    preview_path = os.path.join(base_dir, "public/avatars/rubber-duck-mech/preview.png")

    export_avatar_files("rubber-duck-mech", blend_path, glb_path, preview_path)

if __name__ == "__main__":
    build_rubber_duck_mech()
