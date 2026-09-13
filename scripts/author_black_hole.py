#!/usr/bin/env python3
"""
Authoring script for avatar: black-hole.
Concept: Cosmic entity with a supermassive event horizon head, spinning accretion disk,
gravitational lensing ring, and a floating dark vortex mantle with trailing cosmic filaments.
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

def create_ring_mesh(name, inner_radius, outer_radius, depth, location, rotation, material=None, parent=None, segments=24):
    """Creates a flattened circular ring (torus-like washer) for accretion disks and lens arcs."""
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()

    angle_step = (math.pi * 2.0) / segments
    half_d = depth / 2.0

    # Top and bottom rings of verts
    inner_top = []
    outer_top = []
    inner_bot = []
    outer_bot = []

    for i in range(segments):
        a = i * angle_step
        cos_a = math.cos(a)
        sin_a = math.sin(a)

        inner_top.append(bm.verts.new((cos_a * inner_radius, sin_a * inner_radius, half_d)))
        outer_top.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, half_d)))
        inner_bot.append(bm.verts.new((cos_a * inner_radius, sin_a * inner_radius, -half_d)))
        outer_bot.append(bm.verts.new((cos_a * outer_radius, sin_a * outer_radius, -half_d)))

    bm.verts.ensure_lookup_table()

    for i in range(segments):
        nxt = (i + 1) % segments
        # Top face
        bm.faces.new((inner_top[i], outer_top[i], outer_top[nxt], inner_top[nxt]))
        # Bottom face
        bm.faces.new((inner_bot[nxt], outer_bot[nxt], outer_bot[i], inner_bot[i]))
        # Outer wall
        bm.faces.new((outer_top[i], outer_bot[i], outer_bot[nxt], outer_top[nxt]))
        # Inner wall
        bm.faces.new((inner_top[nxt], inner_bot[nxt], inner_bot[i], inner_top[i]))

    bm.to_mesh(mesh)
    bm.free()

    obj.location = location
    obj.rotation_euler = rotation
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj

def build_black_hole():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("black-hole", rig_kind="floating")

    # Materials (4 materials, <= 4 budget, tintMaterials=['MAT_Accent'])
    mat_void = create_material("MAT_Void", (0.015, 0.015, 0.02, 1.0), roughness=1.0, metalness=0.0)
    mat_accent = create_material("MAT_Accent", (0.65, 0.22, 0.90, 1.0), roughness=0.5, metalness=0.2)
    mat_accretion = create_material("FX_Accretion", (1.0, 0.50, 0.12, 1.0), roughness=0.3, metalness=0.1, emissive=(1.0, 0.55, 0.15, 1.0))
    mat_photon = create_material("FX_Photon", (0.65, 0.90, 1.0, 1.0), roughness=0.2, metalness=0.0, emissive=(0.7, 0.92, 1.0, 1.0))

    # ==========================================
    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # ==========================================
    # Event Horizon: Pure dark sphere at center of the head
    singularity = create_icosphere("EventHorizon", radius=0.22, location=(0, 0, 0.22), material=mat_void, parent=rig['al_head'], subdivisions=3)

    # Gravitational Lensing Halo (Vertical arch of bent light over the singularity)
    lensing_arch = create_ring_mesh("GravitationalLensingRing", inner_radius=0.25, outer_radius=0.32, depth=0.02,
                                    location=(0, 0, 0.22), rotation=(1.5708, 0, 0.35),
                                    material=mat_photon, parent=rig['al_head'], segments=24)

    # Spinning Accretion Disk node (FX_Spin_Disk)
    # Tilted so it reads clearly from the 45-degree isometric camera!
    spin_anchor = bpy.data.objects.new("FX_Spin_AccretionDisk", None)
    spin_anchor.location = (0, 0, 0.22)
    spin_anchor.rotation_euler = (0.55, 0.20, 0) # tilted towards camera view
    spin_anchor.parent = rig['al_head']
    col.objects.link(spin_anchor)

    # Inner bright photon ring
    inner_photon = create_ring_mesh("FX_PhotonRing", inner_radius=0.23, outer_radius=0.29, depth=0.015,
                                    location=(0, 0, 0), rotation=(0, 0, 0),
                                    material=mat_photon, parent=spin_anchor, segments=24)

    # Main swirling fiery accretion disk
    outer_disk = create_ring_mesh("FX_AccretionDiskMesh", inner_radius=0.29, outer_radius=0.52, depth=0.018,
                                  location=(0, 0, 0), rotation=(0, 0, 0),
                                  material=mat_accretion, parent=spin_anchor, segments=32)

    # Outer cosmic accent edge ring
    rim_ring = create_ring_mesh("FX_AccentRim", inner_radius=0.52, outer_radius=0.58, depth=0.012,
                                location=(0, 0, 0), rotation=(0, 0, 0),
                                material=mat_accent, parent=spin_anchor, segments=24)

    # Relativistic polar jets along the disk normal
    jet_top = create_cone("RelativisticJet_Top", radius1=0.01, radius2=0.06, depth=0.32,
                          location=(0, 0, 0.30), material=mat_photon, parent=spin_anchor, segments=12)
    jet_bot = create_cone("RelativisticJet_Bot", radius1=0.06, radius2=0.01, depth=0.32,
                          location=(0, 0, -0.30), material=mat_photon, parent=spin_anchor, segments=12)

    # Orbiting cosmic dust nodes
    debris_1 = create_icosphere("FX_Debris_1", radius=0.035, location=(0.42, 0.15, 0.04), material=mat_accent, parent=spin_anchor, subdivisions=1)
    debris_2 = create_icosphere("FX_Debris_2", radius=0.025, location=(-0.38, -0.22, -0.03), material=mat_photon, parent=spin_anchor, subdivisions=1)

    # ==========================================
    # 2. Torso / Mantle on AL_Root (pivot at 0, 0, 0.9)
    # ==========================================
    # Cosmic vortex mantle (shroud of dark space tapering down into a singularity tip)
    vortex_upper = create_cone("VortexUpper", radius1=0.36, radius2=0.22, depth=0.38,
                               location=(0, 0, 0.12), material=mat_void, parent=rig['al_root'], segments=16)

    vortex_lower = create_cone("VortexLower", radius1=0.22, radius2=0.04, depth=0.55,
                               location=(0, 0, -0.32), material=mat_void, parent=rig['al_root'], segments=16)

    # Cosmic accretion spiral bands around the vortex body
    band_top = create_ring_mesh("MantleBand_Top", inner_radius=0.32, outer_radius=0.37, depth=0.035,
                                location=(0, 0, 0.16), rotation=(0.2, 0.1, 0),
                                material=mat_accent, parent=rig['al_root'], segments=20)

    band_mid = create_ring_mesh("MantleBand_Mid", inner_radius=0.22, outer_radius=0.26, depth=0.03,
                                location=(0, 0, -0.08), rotation=(-0.25, 0.15, 0),
                                material=mat_accretion, parent=rig['al_root'], segments=18)

    band_low = create_ring_mesh("MantleBand_Low", inner_radius=0.12, outer_radius=0.15, depth=0.025,
                                location=(0, 0, -0.32), rotation=(0.15, -0.2, 0),
                                material=mat_photon, parent=rig['al_root'], segments=16)

    # Trailing cosmic filaments / nebulous wisps (FX_Trail_L and FX_Trail_R sway with float effect)
    trail_l = create_cone("FX_Trail_L", radius1=0.04, radius2=0.005, depth=0.45,
                          location=(-0.16, 0.08, -0.55), material=mat_accent, parent=rig['al_root'], segments=8)
    trail_l.rotation_euler = (0.2, 0.2, 0)

    trail_r = create_cone("FX_Trail_R", radius1=0.04, radius2=0.005, depth=0.48,
                          location=(0.16, -0.06, -0.58), material=mat_accretion, parent=rig['al_root'], segments=8)
    trail_r.rotation_euler = (-0.15, -0.25, 0)

    # Secondary trailing tendril at the back
    trail_b = create_cone("FX_Trail_Back", radius1=0.03, radius2=0.005, depth=0.40,
                          location=(0.0, 0.15, -0.52), material=mat_photon, parent=rig['al_root'], segments=8)
    trail_b.rotation_euler = (0.3, 0, 0)

    # File paths
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    blend_path = os.path.join(base_dir, "assets-blender/avatars/black-hole/black-hole.blend")
    glb_path = os.path.join(base_dir, "public/avatars/black-hole/black-hole.glb")
    preview_path = os.path.join(base_dir, "public/avatars/black-hole/preview.png")

    export_avatar_files("black-hole", blend_path, glb_path, preview_path)

if __name__ == "__main__":
    build_black_hole()
