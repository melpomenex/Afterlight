#!/usr/bin/env node
// frame-dump.mjs — decode an afterlight-soa-v1 frame to readable output.
// Usage: node tools/realtime/frame-dump.mjs <file.alrt | - > [--ids]
// Reads the frame from a file or stdin; prints header, section table, and a
// readable entity table. Never imports game code; exits 1 on rejection.

import { readFileSync } from 'node:fs';
import { readHeader, readSections } from '../../shared/realtime/frame.js';
import { readSectionColumns, readSpawnSection, readStringTable } from '../../shared/realtime/encoders.js';
import { FRAME_TYPE, SECTION, ENCODING } from '../../shared/realtime/constants.js';

const arg = process.argv[2];
const showIds = process.argv.includes('--ids');
if (!arg) {
  console.error('usage: node tools/realtime/frame-dump.mjs <file | -> [--ids]');
  process.exit(1);
}
const bytes = new Uint8Array(arg === '-' ? readFileSync(0) : readFileSync(arg));

const head = readHeader(bytes);
if (!head.ok) {
  console.error('REJECTED:', head.reason);
  process.exit(1);
}
const h = head.header;
const type = Object.entries(FRAME_TYPE).find(([, v]) => v === h.frameType)?.[0] ?? h.frameType;
console.log(`frame      ${type} (afterlight-soa-v1, header ${h.headerSize} B, total ${bytes.length} B)`);
console.log(`epoch/tick ${h.roomEpoch} / ${h.serverTick}`);
console.log(`seq        frame=${h.frameSequence} baseline=${h.baselineSequence} flags=${h.flags}`);

const secs = readSections(bytes, head.bodyOffset);
if (!secs.ok) {
  console.error('REJECTED sections:', secs.reason);
  process.exit(1);
}
const sectionName = (id) => Object.entries(SECTION).find(([, v]) => v === id)?.[0] ?? id;
const encodingName = (e) => Object.entries(ENCODING).find(([, v]) => v === e)?.[0] ?? e;

let strings = null;
for (const sec of secs.sections) {
  console.log(`section    ${sectionName(sec.id)} enc=${encodingName(sec.encoding)} rows=${sec.count} bytes=${sec.payloadLen}`);
  if (sec.id === SECTION.STRING_TABLE) {
    const r = readStringTable(bytes, sec);
    if (r.ok) {
      strings = r.strings;
      console.log('  strings:', JSON.stringify(strings));
    }
  }
  if (sec.id === SECTION.SPAWN) {
    const r = readSpawnSection(bytes, sec);
    if (!r.ok) { console.error('  spawn rejected:', r.reason); process.exit(1); }
    for (const row of r.rows) {
      const who = row.stringRef !== 0xffffffff && strings?.[row.stringRef] ? strings[row.stringRef] : `#${row.id}`;
      console.log(`  spawn ${who} archetype=${row.archetype} variant=${row.variant} at (${row.x.toFixed(2)}, ${row.y.toFixed(2)}, ${row.z.toFixed(2)}) yaw=${row.yaw.toFixed(3)}`);
    }
  } else if (sec.id !== SECTION.STRING_TABLE && sec.count > 0) {
    const r = readSectionColumns(bytes, sec);
    if (!r.ok) { console.error('  rejected:', r.reason); process.exit(1); }
    const ids = r.ids ?? Array.from({ length: sec.count }, (_, i) => i);
    for (let i = 0; i < sec.count; i++) {
      const vals = Object.entries(r.columns).map(([k, col]) => `${k}=${Array.isArray(col) || col.length !== undefined ? Number(col[i]).toFixed(3) : col[i]}`);
      const who = showIds || !strings ? `id=${ids[i]}` : `id=${ids[i]}`;
      console.log(`  row ${who} ${vals.join(' ')}`);
    }
  }
}
