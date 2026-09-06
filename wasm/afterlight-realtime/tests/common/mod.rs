//! Shared frame-builder + synthetic world for integration tests.
//! Mirrors the wire layout produced by benchmarks/realtime run scripts
//! (contract §3) so Rust tests cross-check the same encodings.
#![allow(dead_code)]

use afterlight_realtime::protocol::*;

pub struct B {
    pub v: Vec<u8>,
}

impl B {
    pub fn new(ft: u8, hflags: u8, epoch: u32, tick: u32, seq: u32, baseline: u32) -> B {
        let mut v = Vec::with_capacity(256);
        v.extend_from_slice(&MAGIC.to_le_bytes());
        v.push(PROTOCOL_VERSION);
        v.push(ft);
        v.push(hflags);
        v.push(HEADER_SIZE as u8);
        v.extend_from_slice(&epoch.to_le_bytes());
        v.extend_from_slice(&tick.to_le_bytes());
        v.extend_from_slice(&seq.to_le_bytes());
        v.extend_from_slice(&baseline.to_le_bytes());
        B { v }
    }
    fn sec(&mut self, sid: u8, enc: u8, count: u32, payload: &[u8]) {
        self.v.push(sid);
        self.v.push(enc);
        self.v.extend_from_slice(&0u16.to_le_bytes());
        self.v.extend_from_slice(&count.to_le_bytes());
        self.v.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        self.v.extend_from_slice(payload);
    }
    pub fn spawn(&mut self, ids: &[u32], arch: &[u16], variant: &[u16], sref: &[u32], x: &[f32], y: &[f32], z: &[f32], yaw: &[f32]) {
        // Interleaved 28-byte rows — the JS reference layout
        // (shared/realtime/encoders.js readSpawnSection).
        let c = ids.len();
        let mut p = Vec::with_capacity(c * 28);
        for i in 0..c {
            p.extend_from_slice(&ids[i].to_le_bytes());
            p.extend_from_slice(&arch[i].to_le_bytes());
            p.extend_from_slice(&variant[i].to_le_bytes());
            p.extend_from_slice(&sref[i].to_le_bytes());
            p.extend_from_slice(&x[i].to_bits().to_le_bytes());
            p.extend_from_slice(&y[i].to_bits().to_le_bytes());
            p.extend_from_slice(&z[i].to_bits().to_le_bytes());
            p.extend_from_slice(&yaw[i].to_bits().to_le_bytes());
        }
        self.sec(SEC_SPAWN, ENC_DENSE, c as u32, &p);
    }
    pub fn transform(&mut self, ids: &[u32], x: &[f32], y: &[f32], z: &[f32], yaw: &[f32]) {
        let c = ids.len();
        let mut p = Vec::with_capacity(c * 20);
        for id in ids {
            p.extend_from_slice(&id.to_le_bytes());
        }
        for col in [x, y, z, yaw] {
            for f in col {
                p.extend_from_slice(&f.to_bits().to_le_bytes());
            }
        }
        self.sec(SEC_TRANSFORM, ENC_SORTED, c as u32, &p);
    }
    pub fn transform_dense(&mut self, x: &[f32], y: &[f32], z: &[f32], yaw: &[f32]) {
        let c = x.len();
        let mut p = Vec::with_capacity(c * 16);
        for col in [x, y, z, yaw] {
            for f in col {
                p.extend_from_slice(&f.to_bits().to_le_bytes());
            }
        }
        self.sec(SEC_TRANSFORM, ENC_DENSE, c as u32, &p);
    }
    pub fn flags(&mut self, ids: &[u32], vals: &[u8]) {
        let mut p = Vec::with_capacity(ids.len() * 5);
        for id in ids {
            p.extend_from_slice(&id.to_le_bytes());
        }
        p.extend_from_slice(vals);
        self.sec(SEC_FLAGS, ENC_SORTED, ids.len() as u32, &p);
    }
    pub fn flags_dense(&mut self, vals: &[u8]) {
        self.sec(SEC_FLAGS, ENC_DENSE, vals.len() as u32, vals);
    }
    pub fn despawn(&mut self, ids: &[u32]) {
        let mut p = Vec::with_capacity(ids.len() * 4);
        for id in ids {
            p.extend_from_slice(&id.to_le_bytes());
        }
        self.sec(SEC_DESPAWN, ENC_SORTED, ids.len() as u32, &p);
    }
    pub fn motion(&mut self, ids: &[u32], vx: &[f32], vy: &[f32], vz: &[f32]) {
        let c = ids.len();
        let mut p = Vec::with_capacity(c * 16);
        for id in ids {
            p.extend_from_slice(&id.to_le_bytes());
        }
        for col in [vx, vy, vz] {
            for f in col {
                p.extend_from_slice(&f.to_bits().to_le_bytes());
            }
        }
        self.sec(SEC_MOTION, ENC_SORTED, c as u32, &p);
    }
    pub fn anim(&mut self, ids: &[u32], state: &[u8], emote: &[u8]) {
        let mut p = Vec::with_capacity(ids.len() * 6);
        for id in ids {
            p.extend_from_slice(&id.to_le_bytes());
        }
        p.extend_from_slice(state);
        p.extend_from_slice(emote);
        self.sec(SEC_ANIM, ENC_SORTED, ids.len() as u32, &p);
    }
    pub fn visual(&mut self, ids: &[u32], arch: &[u16], variant: &[u16]) {
        let mut p = Vec::with_capacity(ids.len() * 8);
        for id in ids {
            p.extend_from_slice(&id.to_le_bytes());
        }
        for a in arch {
            p.extend_from_slice(&a.to_le_bytes());
        }
        for v in variant {
            p.extend_from_slice(&v.to_le_bytes());
        }
        self.sec(SEC_VISUAL, ENC_SORTED, ids.len() as u32, &p);
    }
    pub fn string_table(&mut self, entries: &[&str]) {
        let mut p = Vec::new();
        p.extend_from_slice(&(entries.len() as u32).to_le_bytes());
        for e in entries {
            p.extend_from_slice(&(e.len() as u16).to_le_bytes());
            p.extend_from_slice(e.as_bytes());
        }
        self.sec(SEC_STRING_TABLE, ENC_DENSE, entries.len() as u32, &p);
    }
    pub fn build(self) -> Vec<u8> {
        self.v
    }
}

/// Synthetic world mirroring fixtures.mjs: ascending gap-y u32 ids.
pub struct World {
    pub n: usize,
    pub ids: Vec<u32>,
    pub x: Vec<f32>,
    pub y: Vec<f32>,
    pub z: Vec<f32>,
    pub yaw: Vec<f32>,
    pub flags: Vec<u8>,
    pub arch: Vec<u16>,
    pub variant: Vec<u16>,
}

pub fn world(n: usize) -> World {
    let mut id: u32 = 137;
    let mut ids = Vec::with_capacity(n);
    for i in 0..n {
        id += 1 + (i as u32 % 5);
        ids.push(id);
    }
    World {
        n,
        x: (0..n).map(|i| (i as f32) * 0.11 - 5.0).collect(),
        y: (0..n).map(|i| (i as f32) * 0.02).collect(),
        z: (0..n).map(|i| (i as f32) * 0.13 - 9.0).collect(),
        yaw: (0..n).map(|i| (i as f32) * 0.7 % 6.28).collect(),
        flags: (0..n).map(|i| [0u8, 1, 2, 4][i % 4]).collect(),
        arch: (0..n).map(|i| if i % 10 == 0 { 1 } else { 0 }).collect(),
        variant: (0..n).map(|i| (i % 7) as u16).collect(),
        ids,
    }
}

pub fn snapshot_frame(w: &World, epoch: u32, seq: u32) -> Vec<u8> {
    let mut b = B::new(FT_SNAPSHOT, 0, epoch, 100, seq, seq);
    b.spawn(&w.ids, &w.arch, &w.variant, &vec![0xFFFF_FFFF; w.n], &w.x, &w.y, &w.z, &w.yaw);
    b.flags_dense(&w.flags);
    b.build()
}

