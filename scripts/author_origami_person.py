#!/usr/bin/env python3
"""
Authoring script for avatar: origami-person.
Concept: Humanoid folded-paper figure with crisp faceted creases and sharp geometric folds.
Faceted normals survive export via flat-shaded polygons (use_smooth = False).
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
    create_box,
    setup_avatar_rig,
    export_avatar_files,
)

def create_faceted_prism(name, verts, faces, location=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1), material=None, parent=None):
    """Creates a custom polygonal mesh with flat shading for crisp origami creases."""
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bm = bmesh.new()
    
    bm_verts = [bm.verts.new((v[0] * scale[0], v[1] * scale[1], v[2] * scale[2])) for v in verts]
    bm.verts.ensure_lookup_table()
    
    for f_indices in faces:
        face_v = [bm_verts[i] for i in f_indices]
        bm.faces.new(face_v)
        
    # Ensure flat shading on all faces
    for f in bm.faces:
        f.smooth = False
        
    bm.to_mesh(mesh)
    bm.free()
    
    # Ensure polygons in mesh have use_smooth = False
    for p in mesh.polygons:
        p.use_smooth = False
        
    obj.location = location
    obj.rotation_euler = rotation
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    bpy.context.scene.collection.objects.link(obj)
    return obj

def build_origami_crane_crest(parent, mat_accent, mat_paper):
    """Builds a stylized geometric origami crane sitting atop the head."""
    # Crane body / diamond
    crane_body_verts = [
        (0.0, -0.15, 0.0),   # 0: beak/front
        (0.0, 0.18, 0.08),   # 1: tail tip
        (-0.18, 0.0, 0.08),  # 2: left wing fold
        (0.18, 0.0, 0.08),   # 3: right wing fold
        (0.0, 0.0, -0.06),   # 4: bottom center
        (0.0, -0.04, 0.10),  # 5: top spine
    ]
    crane_body_faces = [
        (0, 2, 5), (0, 5, 3), (0, 4, 2), (0, 3, 4), # front pyramid
        (1, 5, 2), (1, 3, 5), (1, 2, 4), (1, 4, 3), # back pyramid
    ]
    create_faceted_prism("OrigamiCrane_Body", crane_body_verts, crane_body_faces, 
                         location=(0, -0.02, 0.44), scale=(1, 1, 1), material=mat_accent, parent=parent)
    
    # Wing Left (angled upward fold)
    wing_l_verts = [
        (0.0, -0.06, 0.0),   # 0: base front
        (0.0, 0.08, 0.0),    # 1: base back
        (-0.32, 0.02, 0.18), # 2: wing tip
    ]
    create_faceted_prism("OrigamiWing_L", wing_l_verts, [(0, 1, 2)],
                         location=(-0.16, 0.0, 0.50), material=mat_paper, parent=parent)
    
    # Wing Right
    wing_r_verts = [
        (0.0, -0.06, 0.0),   # 0: base front
        (0.0, 0.08, 0.0),    # 1: base back
        (0.32, 0.02, 0.18),  # 2: wing tip
    ]
    create_faceted_prism("OrigamiWing_R", wing_r_verts, [(0, 2, 1)],
                         location=(0.16, 0.0, 0.50), material=mat_paper, parent=parent)

def build_origami_person():
    scene = reset_scene()
    col = scene.collection
    rig = setup_avatar_rig("origami-person", rig_kind="humanoid")

    # Materials (3 materials, <= 4 budget, tintMaterials=['MAT_Accent'])
    mat_paper = create_material("MAT_Paper", (0.94, 0.93, 0.90, 1.0), roughness=0.9, metalness=0.0)
    mat_accent = create_material("MAT_Accent", (0.22, 0.64, 0.82, 1.0), roughness=0.8, metalness=0.05)
    mat_crease = create_material("MAT_Crease", (0.76, 0.74, 0.70, 1.0), roughness=0.9, metalness=0.0)

    # ==========================================
    # 1. Head on AL_Head (pivot at 0, 0, 1.45)
    # ==========================================
    # Angular folded paper head (octagonal faceted diamond / folded mask)
    # Vertices of the faceted head
    head_verts = [
        (0.0, -0.22, 0.18),    # 0: Nose/beak ridge center
        (-0.16, -0.12, 0.28),  # 1: Forehead left
        (0.16, -0.12, 0.28),   # 2: Forehead right
        (0.0, -0.16, 0.32),    # 3: Forehead center apex
        (-0.20, 0.0, 0.18),    # 4: Temple/cheek left
        (0.20, 0.0, 0.18),     # 5: Temple/cheek right
        (-0.14, -0.14, 0.06),  # 6: Chin left
        (0.14, -0.14, 0.06),   # 7: Chin right
        (0.0, -0.18, 0.04),    # 8: Chin apex
        (0.0, 0.16, 0.32),     # 9: Back head top center
        (-0.18, 0.14, 0.20),   # 10: Back head left
        (0.18, 0.14, 0.20),    # 11: Back head right
        (0.0, 0.14, 0.06),     # 12: Back neck center
    ]
    head_faces = [
        # Face facets
        (3, 1, 0), (3, 0, 2),        # Forehead to nose
        (0, 1, 4), (0, 5, 2),        # Upper cheeks
        (0, 4, 6), (0, 7, 5),        # Lower cheeks
        (0, 6, 8), (0, 8, 7),        # Chin folds
        # Crown / top folds
        (3, 2, 11), (3, 11, 9), (3, 9, 10), (3, 10, 1),
        # Side folds
        (1, 10, 4), (2, 5, 11),
        # Back folds
        (9, 11, 12), (9, 12, 10),
        (4, 10, 12), (5, 12, 11),
        (6, 4, 12), (7, 12, 5),
        (8, 6, 12), (8, 12, 7),
    ]
    create_faceted_prism("OrigamiHead", head_verts, head_faces, location=(0, 0, 0), material=mat_paper, parent=rig['al_head'])
    
    # Folded origami beak / nose facet (accent colored)
    beak_verts = [
        (0.0, -0.28, 0.18),    # 0: Beak tip
        (-0.06, -0.20, 0.22),  # 1: Top left
        (0.06, -0.20, 0.22),   # 2: Top right
        (0.0, -0.20, 0.14),    # 3: Bottom
    ]
    beak_faces = [
        (0, 1, 2), (0, 2, 3), (0, 3, 1), (1, 3, 2)
    ]
    create_faceted_prism("OrigamiBeak", beak_verts, beak_faces, location=(0, 0, 0), material=mat_accent, parent=rig['al_head'])

    # Folded paper neck collar (creased ring)
    collar_verts = [
        (-0.16, -0.16, 0.02), (0.16, -0.16, 0.02), (0.18, 0.16, 0.02), (-0.18, 0.16, 0.02),
        (-0.12, -0.12, -0.06), (0.12, -0.12, -0.06), (0.14, 0.12, -0.06), (-0.14, 0.12, -0.06),
    ]
    collar_faces = [
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
    ]
    create_faceted_prism("OrigamiCollar", collar_verts, collar_faces, location=(0, 0, 0), material=mat_crease, parent=rig['al_head'])

    # Perched origami crane crest on top of head
    build_origami_crane_crest(rig['al_head'], mat_accent, mat_paper)

    # ==========================================
    # 2. Torso on AL_Root (pivot at 0, 0, 0.9)
    # ==========================================
    # Kimono-style folded paper vest / torso with diagonal fold lines
    torso_verts = [
        (0.0, -0.20, 0.28),    # 0: Chest center lapel fold
        (-0.24, -0.15, 0.26),  # 1: Shoulder left front
        (0.24, -0.15, 0.26),   # 2: Shoulder right front
        (-0.24, 0.15, 0.26),   # 3: Shoulder left back
        (0.24, 0.15, 0.26),    # 4: Shoulder right back
        (0.0, 0.18, 0.28),     # 5: Upper back center
        (-0.20, -0.14, -0.12), # 6: Waist left front
        (0.20, -0.14, -0.12),  # 7: Waist right front
        (-0.20, 0.14, -0.12),  # 8: Waist left back
        (0.20, 0.14, -0.12),   # 9: Waist right back
        (0.0, -0.16, -0.12),   # 10: Waist center front
        (0.0, 0.16, -0.12),    # 11: Waist center back
    ]
    torso_faces = [
        # Front diagonal lapel fold
        (0, 1, 6), (0, 6, 10),
        (0, 10, 7), (0, 7, 2),
        # Back facets
        (5, 3, 4), (3, 8, 11), (3, 11, 5), (4, 5, 11), (4, 11, 9),
        # Sides
        (1, 3, 8), (1, 8, 6),
        (2, 7, 9), (2, 9, 4),
        # Top
        (1, 0, 5, 3), (2, 4, 5, 0),
    ]
    create_faceted_prism("OrigamiTorso", torso_verts, torso_faces, location=(0, 0, 0), material=mat_paper, parent=rig['al_root'])

    # Diagonal sash / Obi band (accent colored)
    sash_verts = [
        (-0.22, -0.16, -0.10), (0.22, -0.16, -0.10), (0.22, 0.16, -0.10), (-0.22, 0.16, -0.10),
        (-0.21, -0.15, -0.22), (0.21, -0.15, -0.22), (0.21, 0.15, -0.22), (-0.21, 0.15, -0.22),
    ]
    sash_faces = [
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
    ]
    create_faceted_prism("OrigamiSash", sash_verts, sash_faces, location=(0, 0, 0), material=mat_accent, parent=rig['al_root'])

    # Folded origami knot / bow on the back of the sash
    knot_verts = [
        (0.0, 0.16, -0.16),    # 0: center front
        (0.0, 0.26, -0.16),    # 1: center tip
        (-0.14, 0.22, -0.10),  # 2: wing left top
        (-0.14, 0.22, -0.22),  # 3: wing left bot
        (0.14, 0.22, -0.10),   # 4: wing right top
        (0.14, 0.22, -0.22),   # 5: wing right bot
    ]
    knot_faces = [
        (0, 2, 1), (0, 1, 4), (0, 3, 2), (0, 4, 5), (0, 5, 3),
        (1, 2, 3), (1, 5, 4), (1, 3, 5),
    ]
    create_faceted_prism("OrigamiKnot", knot_verts, knot_faces, location=(0, 0, 0), material=mat_accent, parent=rig['al_root'])

    # Folded pleated skirt / hakama flaps hanging below waist
    skirt_verts = [
        # Waist top
        (-0.20, -0.14, -0.20), (0.0, -0.16, -0.20), (0.20, -0.14, -0.20),
        (0.20, 0.14, -0.20), (-0.20, 0.14, -0.20),
        # Flap bottom flared
        (-0.25, -0.18, -0.42), (0.0, -0.21, -0.44), (0.25, -0.18, -0.42),
        (0.25, 0.18, -0.42), (-0.25, 0.18, -0.42),
    ]
    skirt_faces = [
        (0, 1, 6, 5), (1, 2, 7, 6), # front pleats
        (2, 3, 8, 7),               # right side
        (3, 4, 9, 8),               # back
        (4, 0, 5, 9),               # left side
    ]
    create_faceted_prism("OrigamiSkirt", skirt_verts, skirt_faces, location=(0, 0, 0), material=mat_crease, parent=rig['al_root'])

    # ==========================================
    # 3. Arms on AL_Arm_L & AL_Arm_R (pivot at +/-0.38, 0, 1.2)
    # ==========================================
    for is_right in [False, True]:
        side = "_R" if is_right else "_L"
        parent = rig['al_arm_r'] if is_right else rig['al_arm_l']
        sign = 1.0 if is_right else -1.0

        # Wide faceted kimono sleeve fold at shoulder/upper arm
        sleeve_verts = [
            # Top fold
            (-sign * 0.08, -0.10, 0.08), (sign * 0.08, -0.10, 0.08),
            (sign * 0.08, 0.10, 0.08), (-sign * 0.08, 0.10, 0.08),
            # Bottom hanging bell fold
            (-sign * 0.12, -0.14, -0.32), (sign * 0.12, -0.14, -0.32),
            (sign * 0.14, 0.14, -0.38), (-sign * 0.14, 0.14, -0.38),
        ]
        sleeve_faces = [
            (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        ]
        create_faceted_prism(f"OrigamiSleeve{side}", sleeve_verts, sleeve_faces,
                             location=(0, 0, 0), material=mat_paper, parent=parent)

        # Inner arm sleeve lining (accent fold)
        cuff_verts = [
            (-sign * 0.09, -0.11, -0.28), (sign * 0.09, -0.11, -0.28),
            (sign * 0.11, 0.11, -0.34), (-sign * 0.11, 0.11, -0.34),
            (-sign * 0.09, -0.11, -0.32), (sign * 0.09, -0.11, -0.32),
            (sign * 0.11, 0.11, -0.38), (-sign * 0.11, 0.11, -0.38),
        ]
        cuff_faces = [
            (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        ]
        create_faceted_prism(f"OrigamiCuff{side}", cuff_verts, cuff_faces,
                             location=(0, 0, 0), material=mat_accent, parent=parent)

        # Forearm / Folded paper hand poking out of sleeve
        hand_verts = [
            (0.0, -0.04, -0.28), (0.0, 0.04, -0.28),
            (-sign * 0.03, -0.02, -0.48), (sign * 0.03, -0.02, -0.48),
            (0.0, -0.06, -0.52), # pointed fingertip fold
        ]
        hand_faces = [
            (0, 2, 4), (0, 4, 3), (1, 3, 4), (1, 4, 2), (0, 1, 2), (0, 3, 1)
        ]
        create_faceted_prism(f"OrigamiHand{side}", hand_verts, hand_faces,
                             location=(0, 0, 0), material=mat_crease, parent=parent)

    # ==========================================
    # 4. Legs on AL_Leg_L & AL_Leg_R (pivot at +/-0.18, 0, 0.5)
    # ==========================================
    for is_right in [False, True]:
        side = "_R" if is_right else "_L"
        parent = rig['al_leg_r'] if is_right else rig['al_leg_l']
        sign = 1.0 if is_right else -1.0

        # Angular faceted pant leg (origami pleats)
        pant_verts = [
            (-0.10, -0.10, 0.02), (0.10, -0.10, 0.02),
            (0.10, 0.10, 0.02), (-0.10, 0.10, 0.02),
            (-0.07, -0.07, -0.34), (0.07, -0.07, -0.34),
            (0.07, 0.07, -0.34), (-0.07, 0.07, -0.34),
        ]
        pant_faces = [
            (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        ]
        create_faceted_prism(f"OrigamiPant{side}", pant_verts, pant_faces,
                             location=(0, 0, 0), material=mat_paper, parent=parent)

        # Lower leg wrap / crease
        shin_verts = [
            (-0.06, -0.06, -0.32), (0.06, -0.06, -0.32),
            (0.06, 0.06, -0.32), (-0.06, 0.06, -0.32),
            (-0.05, -0.05, -0.44), (0.05, -0.05, -0.44),
            (0.05, 0.05, -0.44), (-0.05, 0.05, -0.44),
        ]
        shin_faces = [
            (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        ]
        create_faceted_prism(f"OrigamiShin{side}", shin_verts, shin_faces,
                             location=(0, 0, 0), material=mat_crease, parent=parent)

        # Folded pointed shoe (origami paper boat / pointed boot)
        shoe_verts = [
            (-0.06, -0.05, -0.42), (0.06, -0.05, -0.42), (0.05, 0.08, -0.42), (-0.05, 0.08, -0.42), # ankle opening
            (0.0, -0.22, -0.49), # pointed upturned toe fold
            (-0.07, -0.08, -0.50), (0.07, -0.08, -0.50), (0.06, 0.09, -0.50), (-0.06, 0.09, -0.50), # sole
        ]
        shoe_faces = [
            # Upper front to toe
            (0, 1, 4), (0, 4, 5), (1, 6, 4),
            # Sides
            (0, 5, 8, 3), (1, 2, 7, 6),
            # Heel
            (2, 3, 8, 7),
            # Bottom sole
            (5, 4, 6, 7, 8),
        ]
        create_faceted_prism(f"OrigamiShoe{side}", shoe_verts, shoe_faces,
                             location=(0, 0, 0), material=mat_accent, parent=parent)

    # File paths
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    blend_path = os.path.join(base_dir, "assets-blender/avatars/origami-person/origami-person.blend")
    glb_path = os.path.join(base_dir, "public/avatars/origami-person/origami-person.glb")
    preview_path = os.path.join(base_dir, "public/avatars/origami-person/preview.png")

    export_avatar_files("origami-person", blend_path, glb_path, preview_path)

if __name__ == "__main__":
    build_origami_person()
