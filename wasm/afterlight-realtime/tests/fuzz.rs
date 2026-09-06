//! Deterministic std-only fuzz for the afterlight-soa-v1 decoder
//! (contract §8: decoders must survive truncation, length overflow, bad
//! enums, and random byte mutation without throwing out of the decode entry
//! point).
//!
//! Corpus: valid snapshot+delta chains built in Rust. Mutations: truncation,
//! bit flips, byte writes, length-overflow patching, bad enums, header
//! violence. After EVERY hostile frame the store must still accept a good
//! snapshot and a good delta — the contract's "a bad frame never throws into
//! game code". Fixed seeds: failures reproduce exactly via the printed seed.

mod common;

use afterlight_realtime::entity_store::Store;
use afterlight_realtime::protocol::*;
use afterlight_realtime::status::*;
use common::*;

/// Same LCG recurrence as benchmarks/realtime/lib/fixtures.mjs.
struct Lcg(u32);
impl Lcg {
    fn new(seed: u32) -> Lcg {
        Lcg(seed)
    }
    fn u32(&mut self) -> u32 {
        self.0 = self.0.wrapping_mul(1664525).wrapping_add(1013904223);
        self.0
    }
    fn f64(&mut self) -> f64 {
        self.u32() as f64 / 4294967296.0
    }
    fn below(&mut self, n: usize) -> usize {
        if n == 0 { 0 } else { (self.f64() * n as f64) as usize % n }
    }
}

const ITERATIONS: usize = 12_000;

/// Build a fresh store + a known-good (snapshot, delta) pair for the same
/// world, used to prove the store is still usable after each hostile frame.
fn good_pair(seed: u32, n: usize) -> (Store, Vec<u8>, Vec<u8>, Vec<u32>) {
    let w = world(n);
    let snap = snapshot_frame(&w, 1, 100);
    let changed: Vec<u32> = w.ids.iter().step_by(3).copied().collect();
    let mut lcg = Lcg::new(seed ^ 0xBEEF);
    // mutate some transforms so the delta is distinct from the snapshot
    let nx: Vec<f32> = changed.iter().map(|_| lcg.f64() as f32 * 10.0).collect();
    let ny: Vec<f32> = changed.iter().map(|_| 0.0).collect();
    let nz: Vec<f32> = changed.iter().map(|_| lcg.f64() as f32 * 10.0).collect();
    let nyaw: Vec<f32> = changed.iter().map(|_| lcg.f64() as f32).collect();
    let nf: Vec<u8> = changed.iter().map(|_| [0u8, 1, 2, 4][lcg.below(4)]).collect();
    let mut b = B::new(FT_DELTA, 0, 1, 101, 101, 100);
    b.transform(&changed, &nx, &ny, &nz, &nyaw);
    b.flags(&changed, &nf);
    (Store::new(4096).unwrap(), snap, b.build(), changed)
}

#[test]
fn fuzz_mutations_never_panic_and_store_stays_usable() {
    let mut lcg = Lcg::new(0xC0FFEE);
    let mut total_applied_bad = 0usize;

    // corpus of valid chains over different world sizes
    let mut corpus: Vec<Vec<u8>> = Vec::new();
    for s in 0..12u32 {
        let w = world(4 + (s as usize) * 13);
        corpus.push(snapshot_frame(&w, 1, 100 + s));
        let changed: Vec<u32> = w.ids.iter().step_by(2).copied().collect();
        let nx: Vec<f32> = changed.iter().map(|_| 1.5).collect();
        let ny: Vec<f32> = changed.iter().map(|_| 0.5).collect();
        let nz: Vec<f32> = changed.iter().map(|_| -1.5).collect();
        let nyaw: Vec<f32> = changed.iter().map(|_| 0.25).collect();
        let nf: Vec<u8> = changed.iter().map(|_| 1u8).collect();
        let mut b = B::new(FT_DELTA, 0, 1, 101, 101 + s, 100 + s);
        b.transform(&changed, &nx, &ny, &nz, &nyaw);
        b.flags(&changed, &nf);
        corpus.push(b.build());
    }

    // §4a chunk frames: one SNAPSHOT_CHUNK chain and one DELTA_CHUNK chain so
    // the mutation corpus covers the chunk paths (header flag bit1 = CHUNK_END
    // on the final chunk; chunks of one logical frame share frame_sequence and
    // DELTA_CHUNKs keep the original baseline).
    {
        let w = world(26);
        let half = w.n / 2;
        let noref = |n: usize| vec![0xFFFF_FFFF; n];
        let mut sc1 = B::new(FT_SNAPSHOT_CHUNK, 0, 1, 200, 900, 900);
        sc1.spawn(
            &w.ids[..half], &w.arch[..half], &w.variant[..half], &noref(half),
            &w.x[..half], &w.y[..half], &w.z[..half], &w.yaw[..half],
        );
        corpus.push(sc1.build());
        let mut sc2 = B::new(FT_SNAPSHOT_CHUNK, 0x02, 1, 200, 900, 900); // CHUNK_END
        sc2.spawn(
            &w.ids[half..], &w.arch[half..], &w.variant[half..], &noref(w.n - half),
            &w.x[half..], &w.y[half..], &w.z[half..], &w.yaw[half..],
        );
        corpus.push(sc2.build());

        let changed: Vec<u32> = w.ids.iter().step_by(2).copied().collect();
        let mid = changed.len() / 2;
        let (first, second) = changed.split_at(mid);
        for (ids, end) in [(first, 0u8), (second, 0x02u8)] {
            let nx: Vec<f32> = ids.iter().map(|_| 2.5).collect();
            let ny: Vec<f32> = ids.iter().map(|_| 0.0).collect();
            let nz: Vec<f32> = ids.iter().map(|_| -3.5).collect();
            let nyaw: Vec<f32> = ids.iter().map(|_| 1.25).collect();
            let nf: Vec<u8> = ids.iter().map(|_| 4u8).collect();
            // baseline 900 (== seq committed by the chunk snapshot above);
            // sequence 901 commits on CHUNK_END only.
            let mut dc = B::new(FT_DELTA_CHUNK, end, 1, 201, 901, 900);
            dc.transform(ids, &nx, &ny, &nz, &nyaw);
            dc.flags(ids, &nf);
            corpus.push(dc.build());
        }
    }

    for it in 0..ITERATIONS {
        let frame_seed = lcg.u32();
        let (mut st, good_snap, _good_delta, changed) = good_pair(frame_seed, 16 + (frame_seed as usize) % 48);
        assert_eq!(apply_to_store(&mut st, &good_snap), OK, "seed {frame_seed}: corpus snapshot rejected");

        // pick + mutate a corpus frame
        let mut f = corpus[lcg.below(corpus.len())].clone();
        match lcg.below(7) {
            0 => {
                // truncation at a random length
                let keep = lcg.below(f.len() + 1);
                f.truncate(keep);
            }
            1 => {
                // 1..=8 random bit flips
                let flips = 1 + lcg.below(8);
                for _ in 0..flips {
                    let byte = lcg.below(f.len());
                    let bit = lcg.below(8);
                    f[byte] ^= 1 << bit;
                }
            }
            2 => {
                // length-overflow: patch payload_len / entity_count to huge values
                let offs = [4usize, 8usize, 16usize, 20usize]; // entity_count/payload_len of sec1, seq fields
                let o = offs[lcg.below(offs.len())];
                if o + 4 <= f.len() {
                    let v: u32 = match lcg.below(3) {
                        0 => u32::MAX,
                        1 => 1 << 30,
                        _ => 0xFFFF_FFFF - lcg.u32() % 4,
                    };
                    f[o..o + 4].copy_from_slice(&v.to_le_bytes());
                }
            }
            3 => {
                // bad enums in section header bytes (sid/enc/reserved)
                if f.len() > 26 {
                    let p = 24 + 12 * lcg.below(2);
                    match lcg.below(3) {
                        0 => f[p] = (9 + lcg.below(240)) as u8,          // unknown section_id
                        1 => f[p + 1] = (5 + lcg.below(250)) as u8,      // unknown encoding
                        _ => f[p + 2] = 1,                                // reserved != 0
                    }
                }
            }
            4 => {
                // bad value enums: flags reserved bits / anim state
                if f.len() > 30 {
                    let byte = 24 + 12 + 4 * 4 + lcg.below(8);
                    let idx = byte.min(f.len() - 1);
                    f[idx] = 0x80 | lcg.below(128) as u8;
                }
            }
            5 => {
                // header violence: magic/version/frame_type/header flags/size
                let fields = [0usize, 4usize, 5usize, 6usize, 7usize];
                let o = fields[lcg.below(fields.len())];
                f[o] = match o {
                    5 => 3 + lcg.below(250) as u8,    // frame_type > 2
                    7 => (25 + lcg.below(200)) as u8, // header_size != 24
                    _ => lcg.below(256) as u8,
                };
            }
            _ => {
                // dense byte smear in the payload region
                if f.len() > 60 {
                    let from = 24 + lcg.below(f.len() - 24);
                    let run = 1 + lcg.below(32);
                    let v = lcg.below(256) as u8;
                    for b2 in f.iter_mut().skip(from).take(run) {
                        *b2 = v;
                    }
                }
            }
        }

        // hostile frame: must return (any) status, never panic
        let status = apply_to_store(&mut st, &f);
        if status == OK {
            total_applied_bad += 1; // mutation produced a still-valid frame (legal)
        }

        // store must remain usable: good snapshot applies, then good delta
        assert_eq!(
            apply_to_store(&mut st, &good_snap),
            OK,
            "seed {frame_seed} (iteration {it}): store unusable after hostile frame (status {status})"
        );
        assert_eq!(st.live_count(), 16 + (frame_seed as usize) % 48);
        // snapshot above had seq 100; chain one legal delta on top
        let nx = vec![7.5f32; changed.len()];
        let nz = vec![-2.5f32; changed.len()];
        let ny = vec![0.0f32; changed.len()];
        let nyaw = vec![1.0f32; changed.len()];
        let nf = vec![2u8; changed.len()];
        let mut d = B::new(FT_DELTA, 0, 1, 102, 101, 100);
        d.transform(&changed, &nx, &ny, &nz, &nyaw);
        d.flags(&changed, &nf);
        assert_eq!(
            apply_to_store(&mut st, &d.build()),
            OK,
            "seed {frame_seed} (iteration {it}): good delta rejected after hostile frame (status {status})"
        );
    }
    eprintln!("fuzz: {ITERATIONS} iterations, {total_applied_bad} mutated frames were still valid");
}

#[test]
fn exhaustive_truncation_of_every_length() {
    let w = world(12);
    let f = snapshot_frame(&w, 1, 5);
    for keep in 0..=f.len() {
        let mut t = f.clone();
        t.truncate(keep);
        let (mut st, good_snap, _, _) = good_pair(1, 12);
        let status = apply_to_store(&mut st, &t);
        // either a rejection or (cut exactly at a section boundary) a valid shorter frame
        assert!(status <= OK_RESYNC || status >= E_TOO_LARGE, "keep {keep}: {status}");
        assert_eq!(apply_to_store(&mut st, &good_snap), OK, "keep {keep}: store unusable");
    }
}

#[test]
fn targeted_hostile_cases() {
    let w = world(8);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 1)), OK);

    // entity_count / payload_len overflow to u32::MAX
    for field_off in [4usize, 8usize] {
        let mut f = snapshot_frame(&w, 1, 1);
        f[24 + field_off..24 + field_off + 4].copy_from_slice(&u32::MAX.to_le_bytes());
        let s = apply_to_store(&mut st, &f);
        assert!(s != OK, "field {field_off}");
    }

    // every invalid single-bit header flip
    for byte in 0..24usize {
        for bit in 0..8usize {
            let mut f = snapshot_frame(&w, 1, 1);
            f[byte] ^= 1 << bit;
            let (mut st2, good_snap, _, _) = good_pair(7, 8);
            let _ = apply_to_store(&mut st2, &f);
            assert_eq!(apply_to_store(&mut st2, &good_snap), OK, "header byte {byte} bit {bit}");
        }
    }

    // section_id 0 and 9..255
    for sid in [0u8, 9, 100, 255] {
        let mut f = snapshot_frame(&w, 1, 1);
        f[24] = sid;
        let s = apply_to_store(&mut st, &f);
        assert!(s != OK, "sid {sid}");
    }

    // encodings 2..255 on the spawn section (byte 24+1)
    for enc in [2u8, 3, 4, 5, 200] {
        let mut f = snapshot_frame(&w, 1, 1);
        f[25] = enc;
        let s = apply_to_store(&mut st, &f);
        assert!(s != OK, "enc {enc}");
    }
}
