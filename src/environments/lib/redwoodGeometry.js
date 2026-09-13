import * as THREE from 'three';

function finishGeometry(positions, colors, uvs, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Columnar old-growth trunk with high-frequency broken ridges, deep fibrous fissures and buttressed flare. */
export function createRedwoodTrunkGeometry({ height = 38, radius = 2.6, color = '#7a8492', ridgeColor = '#242830', rng = Math.random, buttresses = 7, segments = 64 } = {}) {
  const radial = Math.max(16, Math.min(80, Math.floor(segments)));
  const rings = 30;
  const positions = [], colors = [], uvs = [], indices = [];
  const light = new THREE.Color(color), dark = new THREE.Color(ridgeColor);
  const ridgeHighlight = new THREE.Color('#94a0b2');
  const furrows = 14;
  const rootPhase = rng() * Math.PI * 2;
  const bendX = (rng() - 0.5) * radius * 0.28;
  const bendZ = (rng() - 0.5) * radius * 0.28;

  for (let j = 0; j <= rings; j++) {
    // More rings at the foot resolve roots without wasting triangles up high.
    const t = Math.pow(j / rings, 1.55);
    const y = height * t;
    const flare = Math.exp(-y / (radius * 0.75));

    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;

      // Vertical breaks and meandering: ridges don't run as simple vertical lines
      const vertMeander = Math.sin(t * 18.0 + a * 4.0) * 0.28 + Math.cos(t * 7.0 - a * 2.0) * 0.22;
      const angleFurrow = a * furrows + vertMeander;

      // Sharp clefts between flat broken plates (redwood stringy bark)
      const furrowWave = Math.sin(angleFurrow);
      const plateRelief = Math.sign(furrowWave) * Math.pow(Math.abs(furrowWave), 0.42) * 0.095;
      const fissure = Math.pow(0.5 - 0.5 * Math.cos(angleFurrow), 3.2) * 0.13;

      // High-frequency fibrous breaks along the trunk
      const fiber = (Math.sin(a * 29.0 + t * 36.0) + Math.cos(a * 15.0 - t * 20.0)) * 0.015;
      const heightStep = Math.sin(t * 22.0 + Math.floor(angleFurrow / Math.PI) * 2.7) * 0.02;

      const root = Math.pow((Math.cos(a * buttresses + rootPhase) + 1) * 0.5, 3.5);
      const r = radius * (1 - t * 0.22 + flare * (0.28 + root * 0.44) + plateRelief - fissure + fiber + heightStep);

      positions.push(Math.cos(a) * r + bendX * t * t, y, Math.sin(a) * r + bendZ * t * t);

      // Vertex color: deep shadowed dark in fissures, weathered silver-slate on plates, cool sky highlights on crests
      const plateTone = Math.min(1, Math.max(0, 0.45 + (plateRelief / 0.095) * 0.45 - (fissure / 0.13) * 0.55 + fiber * 1.5));
      const c = dark.clone().lerp(light, plateTone);
      if (plateTone > 0.7) {
        c.lerp(ridgeHighlight, (plateTone - 0.7) * 1.5);
      }
      colors.push(c.r, c.g, c.b);

      // 1 texture repeat around the circumference matching 14 furrows in texture
      uvs.push(i / radial, y / 14.0);

      if (j < rings && i < radial) {
        const v = j * (radial + 1) + i;
        indices.push(v, v + radial + 1, v + 1, v + 1, v + radial + 1, v + radial + 2);
      }
    }
  }

  // Flat cap has full radius, avoiding the pointed silhouettes of cone trunks.
  const center = positions.length / 3;
  positions.push(bendX, height, bendZ);
  colors.push(light.r * 0.8, light.g * 0.8, light.b * 0.8);
  uvs.push(0.5, 0.5);
  for (let i = 0; i < radial; i++) indices.push(center, rings * (radial + 1) + i + 1, rings * (radial + 1) + i);
  return finishGeometry(positions, colors, uvs, indices);
}

/** Upright arching sword ferns with low graceful fronds and paired leaflets; use a DoubleSide material. */
export function createSwordFernGeometry({ radius = 1.3, fronds = 8, color = '#4a7d3c', rng = Math.random } = {}) {
  const positions = [], colors = [], uvs = [], indices = [];
  const baseColor = new THREE.Color(color);
  const tipColor = new THREE.Color('#629b46');
  const rachisColor = new THREE.Color('#2e4822');
  const count = Math.max(5, Math.min(8, Math.floor(fronds)));

  function addVertex(x, y, z, col, u, v) {
    positions.push(x, y, z);
    colors.push(col.r, col.g, col.b);
    uvs.push(u, v);
  }

  for (let f = 0; f < count; f++) {
    const angle = (f / count) * Math.PI * 2 + (rng() - 0.5) * 0.4;
    const frondLen = radius * (0.8 + rng() * 0.35);
    const archHeight = radius * (0.28 + rng() * 0.16); // Low graceful arch
    const frondShade = 0.85 + rng() * 0.3;
    const fColor = baseColor.clone().multiplyScalar(frondShade);
    const fTipColor = tipColor.clone().multiplyScalar(frondShade);

    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const sideX = -dirZ;
    const sideZ = dirX;

    // Graceful arching spine: rises from crown, arches over, then drapes down toward ground
    const spine = (t) => {
      const dist = frondLen * t;
      const arch = Math.sin(t * Math.PI * 0.88) * (1.0 - t * 0.32);
      const y = 0.04 + archHeight * arch;
      return [dirX * dist, y, dirZ * dist];
    };

    // Central rachis (stem) segments
    const stemSegments = 9;
    const stemWidth = 0.018 * radius;
    for (let s = 0; s < stemSegments; s++) {
      const t0 = s / stemSegments;
      const t1 = (s + 1) / stemSegments;
      const p0 = spine(t0);
      const p1 = spine(t1);
      const w0 = stemWidth * (1 - t0 * 0.6);
      const w1 = stemWidth * (1 - t1 * 0.6);
      const col = rachisColor.clone().lerp(fColor, t0 * 0.5);

      const v = positions.length / 3;
      addVertex(p0[0] - sideX * w0, p0[1], p0[2] - sideZ * w0, col, 0, t0);
      addVertex(p0[0] + sideX * w0, p0[1], p0[2] + sideZ * w0, col, 1, t0);
      addVertex(p1[0] - sideX * w1, p1[1], p1[2] - sideZ * w1, col, 0, t1);
      addVertex(p1[0] + sideX * w1, p1[1], p1[2] + sideZ * w1, col, 1, t1);
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }

    // Paired arching leaflets (pinnae) along the stem
    const leafletPairs = 8;
    for (let lp = 0; lp < leafletPairs; lp++) {
      const t = 0.16 + (lp / leafletPairs) * 0.76;
      const pStem = spine(t);
      const pStemNext = spine(Math.min(1.0, t + 0.07));

      // Leaflet length: widest around t ~ 0.35, tapering to tip
      const pinnaLen = frondLen * 0.22 * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1.0 - t * 0.4);

      // Pinnae angle forward along the frond (~70 degrees from rachis)
      const fwdBias = 0.35;
      const pinnaDirLeftX = sideX * 0.85 + dirX * fwdBias;
      const pinnaDirLeftZ = sideZ * 0.85 + dirZ * fwdBias;
      const pinnaDirRightX = -sideX * 0.85 + dirX * fwdBias;
      const pinnaDirRightZ = -sideZ * 0.85 + dirZ * fwdBias;

      const pCol = fColor.clone().lerp(fTipColor, t);
      const pBaseCol = rachisColor.clone().lerp(fColor, 0.6);

      // Left leaflet quad (2 triangles)
      const vl = positions.length / 3;
      addVertex(pStem[0], pStem[1], pStem[2], pBaseCol, 0, 0);
      addVertex(pStemNext[0], pStemNext[1], pStemNext[2], pBaseCol, 0, 1);
      addVertex(pStem[0] + pinnaDirLeftX * pinnaLen, pStem[1] + 0.015, pStem[2] + pinnaDirLeftZ * pinnaLen, pCol, 1, 0.5);
      addVertex(pStemNext[0] + pinnaDirLeftX * pinnaLen * 0.7, pStemNext[1] + 0.015, pStemNext[2] + pinnaDirLeftZ * pinnaLen * 0.7, pCol, 0.7, 1);
      indices.push(vl, vl + 1, vl + 2, vl + 1, vl + 3, vl + 2);

      // Right leaflet quad (2 triangles)
      const vr = positions.length / 3;
      addVertex(pStem[0], pStem[1], pStem[2], pBaseCol, 0, 0);
      addVertex(pStemNext[0], pStemNext[1], pStemNext[2], pBaseCol, 0, 1);
      addVertex(pStem[0] + pinnaDirRightX * pinnaLen, pStem[1] + 0.015, pStem[2] + pinnaDirRightZ * pinnaLen, pCol, 1, 0.5);
      addVertex(pStemNext[0] + pinnaDirRightX * pinnaLen * 0.7, pStemNext[1] + 0.015, pStemNext[2] + pinnaDirRightZ * pinnaLen * 0.7, pCol, 0.7, 1);
      indices.push(vr, vr + 1, vr + 2, vr + 1, vr + 3, vr + 2);
    }
  }

  return finishGeometry(positions, colors, uvs, indices);
}
