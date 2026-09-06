//! Round-trip and semantics tests: frames are built in Rust from a small
//! synthetic world, then verified against the decoder + store (contract §3/§4).

mod common;

use afterlight_realtime::entity_store::Store;
use afterlight_realtime::protocol::*;
use afterlight_realtime::status::*;
use common::*;

// ---------------- tests ----------------

#[test]
fn snapshot_roundtrip() {
    let w = world(64);
    let mut st = Store::new(1024).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 7)), OK);
    assert_eq!(st.live_count(), w.n);
    assert_eq!(st.epoch, 1);
    assert_eq!(st.seq, 7);
    assert!(st.has_baseline);
    for i in 0..w.n {
        let id = w.ids[i];
        let slot = st.find_slot(id).unwrap();
        assert_eq!(st.id_of(slot), Some(id));
        assert_eq!(st.x_at(slot).unwrap(), w.x[i]);
        assert_eq!(st.y_at(slot).unwrap(), w.y[i]);
        assert_eq!(st.z_at(slot).unwrap(), w.z[i]);
        assert_eq!(st.yaw_at(slot).unwrap(), w.yaw[i]);
        assert_eq!(st.flags_at(slot).unwrap(), w.flags[i]);
        assert_eq!(st.archetype_at(slot).unwrap(), w.arch[i]);
        assert_eq!(st.variant_at(slot).unwrap(), w.variant[i]);
        assert_eq!(st.string_ref_at(slot).unwrap(), 0);
        // spawn defaults for optional components (§4)
        assert_eq!(st.motion_at(slot).unwrap(), (0.0, 0.0, 0.0));
        assert_eq!(st.anim_at(slot).unwrap(), (0, 0));
    }
}

#[test]
fn delta_roundtrip_and_supersede() {
    let w = world(32);
    let mut st = Store::new(1024).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 7)), OK);

    // delta touching a subset, last write wins
    let changed = [w.ids[3], w.ids[10], w.ids[31]];
    let nx = [10.0f32, 11.0, 12.0];
    let ny = [0.5f32, 0.6, 0.7];
    let nz = [-1.0f32, -2.0, -3.0];
    let nyaw = [6.0f32, 1.0, 2.5];
    let nflags = [1u8, 4, 0];
    let mut b = B::new(FT_DELTA, 0, 1, 101, 8, 7);
    b.transform(&changed, &nx, &ny, &nz, &nyaw);
    b.flags(&changed, &nflags);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    assert_eq!(st.seq, 8);
    for (k, id) in changed.iter().enumerate() {
        let slot = st.find_slot(*id).unwrap();
        assert_eq!(st.x_at(slot).unwrap(), nx[k]);
        assert_eq!(st.y_at(slot).unwrap(), ny[k]);
        assert_eq!(st.z_at(slot).unwrap(), nz[k]);
        assert_eq!(st.yaw_at(slot).unwrap(), nyaw[k]);
        assert_eq!(st.flags_at(slot).unwrap(), nflags[k]);
    }
    // untouched entity keeps snapshot values
    let slot = st.find_slot(w.ids[5]).unwrap();
    assert_eq!(st.x_at(slot).unwrap(), w.x[5]);
}

#[test]
fn despawn_spawn_lifecycle() {
    let w = world(16);
    let mut st = Store::new(1024).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 1)), OK);

    let mut b = B::new(FT_DELTA, 0, 1, 102, 2, 1);
    b.despawn(&[w.ids[2], w.ids[7]]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    assert_eq!(st.live_count(), w.n - 2);
    assert!(st.find_slot(w.ids[2]).is_none());
    assert!(st.find_slot(w.ids[7]).is_none());
    assert_eq!(st.out_despawn_ids.len(), 2);

    // despawn an unknown id: tolerated no-op (lifecycle race, §4)
    let mut b = B::new(FT_DELTA, 0, 1, 103, 3, 2);
    b.despawn(&[999_999]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    assert_eq!(st.live_count(), w.n - 2);

    // respawn a despawned id: slot reuse + defaults
    let nid = w.ids[2];
    let mut b = B::new(FT_DELTA, 0, 1, 104, 4, 3);
    b.spawn(&[nid], &[0], &[3], &[0], &[1.5], &[0.0], &[2.5], &[0.25]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    assert_eq!(st.live_count(), w.n - 1);
    let slot = st.find_slot(nid).unwrap();
    assert_eq!(st.x_at(slot).unwrap(), 1.5);
    assert_eq!(st.flags_at(slot).unwrap(), 0); // default
    assert_eq!(st.variant_at(slot).unwrap(), 3);
}

#[test]
fn epoch_and_baseline_gating() {
    let w = world(8);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 5, 50)), OK);

    // stale epoch: dropped unconditionally
    let mut b = B::new(FT_DELTA, 0, 4, 101, 51, 50);
    b.transform(&[w.ids[0]], &[0.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK_STALE);
    assert_eq!(st.seq, 50); // unchanged

    // higher epoch invalidates baseline
    let mut b = B::new(FT_DELTA, 0, 6, 102, 51, 50);
    b.transform(&[w.ids[0]], &[0.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK_RESYNC_NEEDED);
    assert_eq!(st.epoch, 6);
    assert!(!st.has_baseline);

    // baseline mismatch after resync request
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 6, 60)), OK);
    let mut b = B::new(FT_DELTA, 0, 6, 103, 99, 99);
    b.transform(&[w.ids[0]], &[0.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK_RESYNC_NEEDED);

    // correct baseline applies
    let mut b = B::new(FT_DELTA, 0, 6, 104, 61, 60);
    b.transform(&[w.ids[0]], &[3.5], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    assert_eq!(st.seq, 61);

    // resync required frame invalidates baseline
    let r = B::new(FT_RESYNC, 0, 6, 105, 0, 0).build();
    assert_eq!(apply_to_store(&mut st, &r), OK_RESYNC);
    assert!(!st.has_baseline);
    assert_eq!(st.live_count(), w.n); // entities kept until fresh snapshot
    let mut b = B::new(FT_DELTA, 0, 6, 106, 62, 61);
    b.transform(&[w.ids[1]], &[0.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK_RESYNC_NEEDED);
}

#[test]
fn dense_snapshot_on_fresh_store() {
    // Workstream-style DENSE snapshot: spawn gives ids, transform/flags DENSE
    // address slots 0..count-1 (server id == row order on a fresh store).
    let w = world(24);
    let mut b = B::new(FT_SNAPSHOT, 0, 1, 100, 1, 1);
    b.spawn(&w.ids, &w.arch, &w.variant, &vec![0u32; w.n], &w.x, &w.y, &w.z, &w.yaw);
    b.transform_dense(&w.x, &w.y, &w.z, &w.yaw);
    b.flags_dense(&w.flags);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    for i in 0..w.n {
        let slot = st.find_slot(w.ids[i]).unwrap();
        assert_eq!(slot, i as u32); // ascending slot fill on fresh store
        assert_eq!(st.x_at(slot).unwrap(), w.x[i]);
        assert_eq!(st.flags_at(slot).unwrap(), w.flags[i]);
    }
}

#[test]
fn string_table_and_spawn_refs() {
    let w = world(4);
    let mut b = B::new(FT_SNAPSHOT, 1, 1, 100, 1, 1); // header flag bit0
    b.string_table(&["guest_aaa", "guest_bbb", "guest_ccc"]);
    b.spawn(&w.ids, &w.arch, &w.variant, &[0, 2, 1, 0], &w.x, &w.y, &w.z, &w.yaw);
    b.flags_dense(&w.flags);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    let slot = st.find_slot(w.ids[1]).unwrap();
    assert_eq!(st.string_ref_at(slot).unwrap(), 2);

    // stringRef out of range -> rejected
    let mut b = B::new(FT_SNAPSHOT, 1, 1, 100, 1, 1);
    b.string_table(&["guest_aaa"]);
    b.spawn(&w.ids, &w.arch, &w.variant, &[0, 5, 0, 0], &w.x, &w.y, &w.z, &w.yaw);
    b.flags_dense(&w.flags);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_BAD_STRING_TABLE);

    // stringRef without table -> rejected
    let mut b = B::new(FT_SNAPSHOT, 0, 1, 100, 1, 1);
    b.spawn(&w.ids, &w.arch, &w.variant, &[0, 1, 0, 0], &w.x, &w.y, &w.z, &w.yaw);
    b.flags_dense(&w.flags);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_BAD_STRING_TABLE);
}

#[test]
fn optional_sections_and_noop_delta() {
    let w = world(8);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 1)), OK);

    let mut b = B::new(FT_DELTA, 0, 1, 102, 3, 1);
    b.motion(&[w.ids[0]], &[1.0], &[0.0], &[-2.0]);
    b.anim(&[w.ids[1]], &[2], &[3]);
    b.visual(&[w.ids[2]], &[1], &[5]);
    assert_eq!(apply_to_store(&mut st, &b.build()), OK);
    assert_eq!(st.motion_at(st.find_slot(w.ids[0]).unwrap()).unwrap(), (1.0, 0.0, -2.0));
    assert_eq!(st.anim_at(st.find_slot(w.ids[1]).unwrap()).unwrap(), (2, 3));
    assert_eq!(st.variant_at(st.find_slot(w.ids[2]).unwrap()).unwrap(), 5);

    // empty delta (all sections omitted) is a legal no-op that advances seq
    let b = B::new(FT_DELTA, 0, 1, 103, 4, 3).build();
    assert_eq!(apply_to_store(&mut st, &b), OK);
    assert_eq!(st.seq, 4);
}

#[test]
fn constraint_enforcement() {
    let w = world(8);
    let mut st = Store::new(256).unwrap();
    let good = snapshot_frame(&w, 1, 1);
    assert_eq!(apply_to_store(&mut st, &good), OK); // live baseline: epoch 1, seq 1

    // > 1 MiB
    let mut huge = vec![0u8; (MAX_FRAME_BYTES + 1) as usize];
    huge[0..4].copy_from_slice(&MAGIC.to_le_bytes());
    assert_eq!(apply_to_store(&mut st, &huge), E_TOO_LARGE);

    // duplicate sections are rejected (strict); with only 8 distinct sids a
    // 17-section frame always dies on the duplicate check first — the >16 cap
    // stays as defense in depth inside the walk loop.
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    for _ in 0..17 {
        b.transform(&[w.ids[0]], &[0.0], &[0.0], &[0.0], &[0.0]);
    }
    assert_eq!(apply_to_store(&mut st, &b.build()), E_BAD_SECTION);

    // entity_count > 100k in a section
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    let mut p = Vec::new();
    for i in 0..100_001u32 {
        p.extend_from_slice(&i.to_le_bytes());
    }
    // hand-rolled: transform SORTED_IDS with 100_001 ids but only 16 bytes of columns
    b.v.push(SEC_TRANSFORM);
    b.v.push(ENC_SORTED);
    b.v.extend_from_slice(&0u16.to_le_bytes());
    b.v.extend_from_slice(&100_001u32.to_le_bytes());
    b.v.extend_from_slice(&(p.len() as u32 + 16).to_le_bytes());
    b.v.extend_from_slice(&p);
    b.v.extend_from_slice(&[0u8; 16]);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_ENTITY_COUNT);

    // bad enums
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    b.v.push(SEC_FLAGS);
    b.v.push(ENC_SORTED);
    b.v.extend_from_slice(&0u16.to_le_bytes());
    b.v.extend_from_slice(&1u32.to_le_bytes());
    b.v.extend_from_slice(&5u32.to_le_bytes());
    b.v.extend_from_slice(&w.ids[0].to_le_bytes());
    b.v.push(0xFF); // reserved bits set
    assert_eq!(apply_to_store(&mut st, &b.build()), E_BAD_ENUM);

    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    b.anim(&[w.ids[0]], &[9], &[0]); // state 9 invalid
    assert_eq!(apply_to_store(&mut st, &b.build()), E_BAD_ENUM);

    // trailing bytes: a 1-byte tail cannot form a section header -> E_TRUNCATED
    // (indistinguishable from a cut mid-header); either code is a rejection.
    let mut f = snapshot_frame(&w, 1, 1);
    f.push(0);
    let r = apply_to_store(&mut st, &f);
    assert!(r == E_TRUNCATED || r == E_TRAILING, "got {r}");

    // unknown section / encoding / frame type / magic / version / header size
    let mut f = good.clone();
    let n = f.len();
    f[n - 20] = 9; // section_id 9 in the flags section header (last section: 12 hdr + 8 payload)
    assert_eq!(apply_to_store(&mut st, &f), E_BAD_SECTION);

    let mut f = good.clone();
    f[25] = ENC_ROARING; // first section (spawn) encoding byte: 24 + 1
    assert_eq!(apply_to_store(&mut st, &f), E_ENC_UNSUPPORTED);

    let mut f = good.clone();
    f[5] = 7;
    assert_eq!(apply_to_store(&mut st, &f), E_BAD_FRAME_TYPE);

    let mut f = good.clone();
    f[0] = 0x7B;
    assert_eq!(apply_to_store(&mut st, &f), E_BAD_MAGIC);

    let mut f = good.clone();
    f[4] = 2;
    assert_eq!(apply_to_store(&mut st, &f), E_BAD_VERSION);

    let mut f = good.clone();
    f[7] = 32;
    assert_eq!(apply_to_store(&mut st, &f), E_BAD_HEADER);

    // unsorted ids
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    b.transform(&[w.ids[5], w.ids[1]], &[0.0, 0.0], &[0.0, 0.0], &[0.0, 0.0], &[0.0, 0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_UNSORTED);

    // unknown id in a component section -> poison (baseline valid: seq 2, base 1)
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    b.transform(&[12345], &[0.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_UNKNOWN_ID);
    assert!(st.poisoned);
    // poisoned store drops deltas until the next snapshot
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    b.transform(&[w.ids[0]], &[0.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_POISONED);
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 9)), OK);
    assert!(!st.poisoned);

    // payload_len mismatch
    let mut b = B::new(FT_DELTA, 0, 1, 1, 2, 1);
    b.transform(&[w.ids[0]], &[1.0], &[0.0], &[0.0], &[0.0]);
    let mut f = b.build();
    let sec = 24;
    let plen_off = sec + 8;
    let cur = u32::from_le_bytes([f[plen_off], f[plen_off + 1], f[plen_off + 2], f[plen_off + 3]]);
    let bad = cur - 1; // shrinking stays in bounds but breaks the exact-size rule
    f[plen_off..plen_off + 4].copy_from_slice(&bad.to_le_bytes());
    assert_eq!(apply_to_store(&mut st, &f), E_PAYLOAD_LEN);

    // store still fully usable after all of the above
    assert_eq!(st.live_count(), w.n);
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 10)), OK);
}

#[test]
fn duplicate_spawn_id_rejected() {
    let w = world(4);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 1)), OK);
    let mut b = B::new(FT_DELTA, 0, 1, 2, 2, 1);
    b.spawn(&[w.ids[0]], &[0], &[0], &[0], &[9.0], &[0.0], &[0.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_ID_EXISTS);
}

#[test]
fn slot_exhaustion_rejected_up_front() {
    let w = world(8);
    let mut st = Store::new(256).unwrap();
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 1)), OK);
    // 300 new ids into a 256-slot store: rejected before any mutation
    let mut ids = Vec::new();
    for i in 0..300u32 {
        ids.push(500_000 + i * 3);
    }
    let (x, y, z, yaw) = (vec![0.0; 300], vec![0.0; 300], vec![0.0; 300], vec![0.0; 300]);
    let mut b = B::new(FT_DELTA, 0, 1, 2, 2, 1);
    b.spawn(&ids, &vec![0u16; 300], &vec![0u16; 300], &vec![0u32; 300], &x, &y, &z, &yaw);
    assert_eq!(apply_to_store(&mut st, &b.build()), E_SLOT_EXHAUSTED);
    assert_eq!(st.live_count(), w.n);
    assert_eq!(st.seq, 1);
}
