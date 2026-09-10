# Generates the Orpheum chandelier mesh as a JS module (source, deterministic).
#
#   blender --background --python scripts/theater-chandelier.py -- src/world/theaterChandelierGeometry.js
#
# The theatre world builder consumes the output synchronously, so the game
# needs no GLTFLoader, no async asset fetch, and headless Node tests keep
# working. Geometry is baked in Blender's Z-up space and converted to the
# Three.js Y-up convention here: (x, y, z) -> (x, z, -y).
#
# Groups: brass (stem, rings, arms, cups), candle (wax), flame (emissive
# bulb), crystal (drops). Origin sits at the chain attachment point with the
# fixture hanging along -Y.
import bpy
import math
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else 'src/world/theaterChandelierGeometry.js'

GROUPS = {}


def group(name):
    if name not in GROUPS:
        GROUPS[name] = {'positions': [], 'indices': []}
    return GROUPS[name]


def collect(obj, group_name):
    bpy.context.view_layer.update()
    mesh = obj.data
    mesh.calc_loop_triangles()
    target = group(group_name)
    base = len(target['positions']) // 3
    matrix = obj.matrix_world
    for vertex in mesh.vertices:
        co = matrix @ vertex.co
        # Blender (x, y, z) -> Three.js (x, z, -y).
        target['positions'].extend([round(co.x, 5), round(co.z, 5), round(-co.y, 5)])
    for tri in mesh.loop_triangles:
        target['indices'].extend([base + tri.vertices[0], base + tri.vertices[1], base + tri.vertices[2]])


def add_cylinder(radius, depth, location, rotation=(0, 0, 0), vertices=12, group_name='brass'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    collect(obj, group_name)
    bpy.data.objects.remove(obj, do_unlink=True)


def add_cone(radius1, radius2, depth, location, rotation=(0, 0, 0), vertices=12, group_name='brass'):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    collect(obj, group_name)
    bpy.data.objects.remove(obj, do_unlink=True)


def add_sphere(radius, location, group_name='brass', segments=14, rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.active_object
    collect(obj, group_name)
    bpy.data.objects.remove(obj, do_unlink=True)


def add_torus(major, minor, location, rotation=(0, 0, 0), group_name='brass', major_segments=28, minor_segments=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=location, rotation=rotation,
                                     major_segments=major_segments, minor_segments=minor_segments)
    obj = bpy.context.active_object
    collect(obj, group_name)
    bpy.data.objects.remove(obj, do_unlink=True)


def add_ico(radius, location, group_name='crystal', subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=radius, location=location)
    obj = bpy.context.active_object
    collect(obj, group_name)
    bpy.data.objects.remove(obj, do_unlink=True)


def add_arm(points, bevel=0.026, group_name='brass'):
    """Smooth tube through `points` (list of (x, y, z)) using a bevelled curve."""
    curve = bpy.data.curves.new('arm', 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 4
    curve.bevel_depth = bevel
    curve.bevel_resolution = 2
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, (x, y, z) in zip(spline.bezier_points, points):
        bp.co = (x, y, z)
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new('arm', curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    collect(bpy.context.active_object, group_name)
    bpy.data.objects.remove(bpy.context.active_object, do_unlink=True)


# --- Centre column ---------------------------------------------------------
add_cylinder(0.02, 0.5, (0, 0, -0.25), group_name='brass', vertices=8)   # chain rod
add_cone(0.16, 0.06, 0.16, (0, 0, -0.06), group_name='brass')            # canopy
add_cylinder(0.065, 0.8, (0, 0, -0.62), group_name='brass')
add_sphere(0.15, (0, 0, -1.02), group_name='brass')

# --- Two tiers of arms with candles ---------------------------------------
for tier, (arm_radius, cup_z, ring_z) in enumerate([(1.0, -0.62, -1.06), (0.66, -1.2, -1.62)]):
    count = 8
    add_torus(arm_radius * 0.86, 0.04, (0, 0, ring_z), group_name='brass', major_segments=30, minor_segments=8)
    for i in range(count):
        a = (i / count) * math.tau + (math.pi / count if tier else 0)
        ca, sa = math.cos(a), math.sin(a)
        x = arm_radius
        add_arm([
            (0.07 * ca, 0.07 * sa, ring_z + 0.08),
            (x * 0.45 * ca, x * 0.45 * sa, ring_z - 0.06),
            (x * 0.85 * ca, x * 0.85 * sa, ring_z + 0.22),
            (x * ca, x * sa, ring_z + 0.42),
        ])
        bx, by = x * ca, x * sa
        add_cone(0.075, 0.035, 0.1, (bx, by, ring_z + 0.5), group_name='brass')
        add_cylinder(0.032, 0.3, (bx, by, ring_z + 0.66), group_name='candle', vertices=10)
        add_sphere(0.048, (bx, by, ring_z + 0.84), group_name='flame')

# --- Crystal drops ---------------------------------------------------------
for i in range(8):
    a = (i / 8) * math.tau
    add_ico(0.045, (0.6 * math.cos(a), 0.6 * math.sin(a), -1.78), group_name='crystal')
add_ico(0.075, (0, 0, -1.88), group_name='crystal')
add_sphere(0.1, (0, 0, -1.72), group_name='brass')
add_ico(0.04, (0, 0, -2.0), group_name='crystal')

lines = [
    '// Generated by scripts/theater-chandelier.py — do not edit by hand.',
    '// Blender-baked Orpheum chandelier geometry (brass, candle, flame, crystal).',
    'export const THEATER_CHANDELIER = {',
]
for name in ('brass', 'candle', 'flame', 'crystal'):
    data = GROUPS.get(name, {'positions': [], 'indices': []})
    positions = ', '.join(f'{v:g}' for v in data['positions'])
    indices = ', '.join(str(i) for i in data['indices'])
    lines.append(f'  {name}: {{')
    lines.append(f'    positions: [{positions}],')
    lines.append(f'    indices: [{indices}],')
    lines.append('  },')
lines.append('};')
lines.append('')

directory = os.path.dirname(OUT)
if directory:
    os.makedirs(directory, exist_ok=True)
with open(OUT, 'w') as handle:
    handle.write('\n'.join(lines))

counts = {name: len(GR[ 'positions']) // 3 for name, GR in GROUPS.items()}
tris = {name: len(GR['indices']) // 3 for name, GR in GROUPS.items()}
print(f'wrote {OUT}: vertices={counts} triangles={tris}')
