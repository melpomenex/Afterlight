# Afterlight Avatar Authoring Guide

This document defines the authoring standards, rig conventions, performance budgets, and asset pipeline for Afterlight avatars (`add-creative-avatar-system`).

## 1. Directory Layout

```
shared/avatarDefinitions.js                     # Manifest (single editable source of truth)
assets-blender/avatars/
  _shared/AL_SharedRig.blend                    # Shared rig template + mannequin mesh
  <id>/<id>.blend                               # Committed Blender source per avatar
public/avatars/<id>/
  <id>.glb                                      # Exported glTF binary asset
  preview.png                                   # 512x512 preview render
scripts/avatar_pipeline.py                      # Reusable Blender authoring & export pipeline
scripts/author_<id>.py                          # Headless Python script to build each avatar
scripts/export-avatar-definitions.mjs           # Projection to server_elixir/priv/avatar_definitions.json
scripts/verify-avatar-assets.mjs                # Automated contract and budget validator
```

## 2. Rig Kinds and Node Hierarchy

Each avatar belongs to one of three supported rig kinds:
- **`humanoid`** (default): Standard bipedal proportion. Leg pivots at $y \approx 0.5$, arms at shoulder $y \approx 1.2$, head at neck $y \approx 1.45$.
- **`humanoid-heavy`**: Chunky, bulky humanoid silhouettes (e.g. deep-sea diving suit, rubber duck mech, vending machine). Leg pivots are lowered to $y \approx 0.4$ to support heavy torso chassis.
- **`floating`**: Legless or hovering figures (e.g. neon jellyfish, black hole). Does not possess arm or leg pivots; animates with an idle vertical hover bob and cosmetic trailing node swaying.

### Contract Node Naming
The exported glTF must contain named nodes resolved by name:

```
AVA_<ID>_ROOT (Empty at 0, 0, 0)
└── AL_Rig (Group container)
    ├── AL_Root (Body center / pelvis pivot, at 0, 0, 0.9)
    ├── AL_Head (Head pivot at neck, at 0, 0, 1.45)
    ├── AL_Arm_L (Left shoulder pivot, at -0.38, 0, 1.2) [humanoid & humanoid-heavy]
    ├── AL_Arm_R (Right shoulder pivot, at 0.38, 0, 1.2) [humanoid & humanoid-heavy]
    ├── AL_Leg_L (Left hip pivot, at -0.18, 0, 0.5 / 0.4) [humanoid & humanoid-heavy]
    └── AL_Leg_R (Right hip pivot, at 0.18, 0, 0.5 / 0.4) [humanoid & humanoid-heavy]
```

For `floating` avatars, `AL_Arm_L/R` and `AL_Leg_L/R` are omitted.

## 3. Coordinate System & Scale

- **Origin**: $(0, 0, 0)$ is on the ground between the feet.
- **Orientation**: Forward facing is $+Z$ in glTF / Three.js space (in Blender: model facing $-Y$, exported with $+Y$ up, $+Z$ forward).
- **Scale**: Authored in metric scale ($1.0\text{ unit} = 1.0\text{ meter}$). Total height should typically fall within $1.60\text{ m} - 2.00\text{ m}$ (except special silhouettes like the Sentient Street Lamp at $\sim 2.6\text{ m}$).
- **Nameplate Anchor**: `nameplateY` in `shared/avatarDefinitions.js` anchors the overhead player nameplate (typically $0.3\text{ m} - 0.4\text{ m}$ above the highest vertex of the avatar head).

## 4. Materials and Shading

- **MeshStandardMaterial**: Stylized low-poly PBR with flat or faceted shading (`polygon.use_smooth = False` where crisp origami/geometric creases are desired).
- **Tintable Materials**: Materials declared in `tintMaterials` in `shared/avatarDefinitions.js` (typically `MAT_Accent`) receive a deterministic per-player accent color derived from their player ID.
- **Effect Materials**: Emissive materials intended for shader effects (e.g. `FX_Screen` for CRT static or `FX_Glow` for pulsing) must be prefixed with `FX_`.
- **Lighting**: Avatars must **never** include point, spot, or directional lights in their glTF. All visual flourishes must be emissive or transform-based.

## 5. Performance Budgets

Every avatar asset is verified against these strict caps via `scripts/verify-avatar-assets.mjs`:
- **Triangles**: $\le 8,000$ triangles (typical target is $300 - 2,000$ tris).
- **Materials**: $\le 4$ materials.
- **Textures**: $\le 2$ textures, maximum $1024 \times 1024$ resolution each.
- **File Size**: Target $\le 1.5\text{ MB}$, hard limit $\le 3.0\text{ MB}$ (typical target is $30\text{ KB} - 150\text{ KB}$).

## 6. Declarative Flourish Effects & Special Hooks

Flourish effects are declared in `shared/avatarDefinitions.js` under the `effect` property. All effects execute with **zero allocations per frame**:

| Effect | Target Materials / Nodes | Description |
| :--- | :--- | :--- |
| `crt-static` | Materials starting with `FX_Screen` | High-frequency scanline/jitter modulation of emissive intensity. |
| `glow-pulse` | Materials starting with `FX_` | Gentle, rhythmic sine-wave pulsing on emissive intensity. |
| `spin` | Nodes starting with `FX_Spin`, `FX_Reel`, `FX_Iris` | Smooth continuous rotation around the local Z axis. |
| `flicker` | Materials starting with `FX_` | Occasional soft emissive dip/spike mimicking neon signs or lightning clouds. |
| `float` | `rig: 'floating'`, `FX_Tentacle*`, `FX_Trail*`, `FX_Fish*` | Automatic idle vertical hover bob on `AL_Rig`, gentle sway on tentacle/filament nodes, and circular swimming orbit on fish nodes. |

## 7. Authoring Workflow (Python Headless & Blender GUI)

Avatars can be authored either via Blender GUI or headlessly via Python scripts using `scripts/avatar_pipeline.py`.

### Option A: Headless Python Authoring (Recommended)
1. Create `scripts/author_<id>.py` importing from `avatar_pipeline.py`.
2. Use helper primitives (`create_box`, `create_cylinder`, `create_cone`, `create_icosphere`) or custom `bmesh` polygons.
3. Setup the rig using `rig = setup_avatar_rig("<id>", rig_kind="humanoid"|"humanoid-heavy"|"floating")`.
4. Parent parts to `rig['al_head']`, `rig['al_root']`, etc.
5. Export using `export_avatar_files("<id>", blend_path, glb_path, preview_path)`.
6. Run: `blender -b -P scripts/author_<id>.py`.

### Option B: Blender GUI Workflow
1. Open `assets-blender/avatars/_shared/AL_SharedRig.blend`.
2. Model your character ensuring $(0, 0, 0)$ is ground origin and facing $-Y$ in Blender.
3. Parent mesh parts to the appropriate empty nodes under `AL_Rig`.
4. Ensure materials adhere to budget ($\le 4$ materials) and name tintable materials `MAT_Accent`.
5. Render a $512 \times 512$ transparent preview image to `public/avatars/<id>/preview.png`.
6. Export glTF 2.0 binary (`.glb`) to `public/avatars/<id>/<id>.glb` with:
   - Include: Selected Objects / Custom Properties OFF
   - Geometry: Apply Modifiers ON
   - Animation / Lights / Cameras: OFF.

## 8. Walkthrough: Adding a New Avatar (Dry-Run Example)

Suppose we want to add a fictional avatar named **Clockwork Owl** (`clockwork-owl`):

### Step 1: Register in `shared/avatarDefinitions.js`
```javascript
{
  id: 'clockwork-owl',
  name: 'Clockwork Owl',
  assetPath: 'avatars/clockwork-owl/clockwork-owl.glb',
  rig: 'humanoid',
  scale: 1.0,
  nameplateY: 2.3,
  tintMaterials: ['MAT_Accent'],
  effect: 'spin', // spinning brass eye irises or head gear
  rarity: 'uncommon',
  weight: 5,
  tags: ['steampunk', 'mechanical', 'bird'],
}
```

### Step 2: Regenerate Server Projection
Sync the definition to the Phoenix server authority:
```bash
node scripts/export-avatar-definitions.mjs
node scripts/export-avatar-definitions.mjs --check
```

### Step 3: Model and Export
Write `scripts/author_clockwork_owl.py` or author in Blender, placing spinning eye gears under nodes named `FX_Iris_L` and `FX_Iris_R` parented to `AL_Head`.
Execute:
```bash
blender -b -P scripts/author_clockwork_owl.py
```

### Step 4: Verify Asset Against Budgets & Contracts
```bash
node scripts/verify-avatar-assets.mjs clockwork-owl
```
Expected output:
```
[PASS] clockwork-owl: 820 tris, 3 mats, 62.4 KB
```

### Step 5: Test In-Game
Launch the dev stack and inspect directly in the browser:
```bash
npm run dev:stack
# Open http://localhost:5173/?avatar=clockwork-owl
```
Check:
- Model loads with zero console warnings.
- Walking and jumping animations smoothly drive `AL_Leg_L/R` and `AL_Arm_L/R`.
- Sitting on Orpheum theater seats properly folds the hips and sets `AL_Root`.
- Eye gears spin continuously via the `spin` effect.
- Nameplate is positioned comfortably above the feathered brass crest at $y = 2.3\text{ m}$.
