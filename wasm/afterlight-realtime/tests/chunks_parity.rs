//! Cross-implementation parity + chunk semantics (contract §4a): frames
//! produced by the JS reference encoder (`shared/realtime/writer.js`)
//! decode to identical store state here, and chunked snapshot/delta
//! sequences accumulate with sequence commit on CHUNK_END only. The byte
//! arrays are generated deterministically by the JS writer and pinned here.

mod common;

use afterlight_realtime::entity_store::Store;
use afterlight_realtime::protocol::*;
use afterlight_realtime::status::*;
use common::*;

fn hex(s: &str) -> Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap())
        .collect()
}

/// JS: writeFrame FULL_SNAPSHOT — spawn 1001 (guest "guest_parity01",
/// stringRef 0) + 1002 (NO_STRING_REF), dense transform section, seq 41.
const JS_SNAPSHOT: &str = "54524c410100011801000000090000002900000029000000080000000100000014000000010000000e0067756573745f7061726974793031010000000200000038000000e903000000000300000000000000c03f00000000000020400000803eea03000002000500ffffffff0000604000000000000090400000e03f0300000002000000200000000000c03f00006040000000000000000000002040000090400000803e0000e03f";

/// JS: writeFrame DELTA — SORTED_IDS transform + flags for entity 1001, seq 42.
const JS_DELTA: &str = "54524c4101010018010000000a0000002a00000029000000030100000100000014000000e9030000000018410000003e000008410000603f060100000100000005000000e903000005";

#[test]
fn js_reference_snapshot_decodes_identically() {
    let mut st = Store::new(64).unwrap();
    assert_eq!(apply_to_store(&mut st, &hex(JS_SNAPSHOT)), OK);
    assert_eq!(st.live_count(), 2);
    assert_eq!(st.seq, 41);
    assert_eq!(st.epoch, 1);
    let slot = st.find_slot(1001).expect("entity 1001 present");
    assert_eq!(st.archetype_at(slot).unwrap(), 0);
    assert_eq!(st.variant_at(slot).unwrap(), 3);
    assert_eq!(st.string_ref_at(slot).unwrap(), 0);
    assert_eq!(st.x_at(slot).unwrap(), 1.5);
    assert_eq!(st.z_at(slot).unwrap(), 2.5);
    assert_eq!(st.yaw_at(slot).unwrap(), 0.25);
    // entity 1002 carries NO_STRING_REF and still spawns
    let slot2 = st.find_slot(1002).expect("entity 1002 present");
    assert_eq!(st.variant_at(slot2).unwrap(), 5);
    assert_eq!(st.yaw_at(slot2).unwrap(), 1.75);
}

#[test]
fn js_reference_delta_applies_on_exact_baseline() {
    let mut st = Store::new(64).unwrap();
    assert_eq!(apply_to_store(&mut st, &hex(JS_SNAPSHOT)), OK);
    assert_eq!(apply_to_store(&mut st, &hex(JS_DELTA)), OK);
    let slot = st.find_slot(1001).unwrap();
    assert_eq!(st.x_at(slot).unwrap(), 9.5);
    assert_eq!(st.yaw_at(slot).unwrap(), 0.875);
    assert_eq!(st.flags_at(slot).unwrap(), 5); // walking | sitting
}

#[test]
fn chunked_snapshot_accumulates_and_commits_on_chunk_end() {
    // Chunk 1 (SNAPSHOT_CHUNK, no CHUNK_END): spawns 2001..2003.
    let mut b1 = B::new(FT_SNAPSHOT_CHUNK, 0, 1, 5, 100, 100);
    b1.spawn(
        &[2001, 2002, 2003],
        &[0, 0, 0],
        &[0, 0, 0],
        &[0xFFFF_FFFF; 3],
        &[1.0, 2.0, 3.0],
        &[0.0, 0.0, 0.0],
        &[1.0, 2.0, 3.0],
        &[0.0, 0.0, 0.0],
    );
    // Chunk 2 (SNAPSHOT_CHUNK + CHUNK_END): spawns 2004..2005 and commits.
    let mut b2 = B::new(FT_SNAPSHOT_CHUNK, 2, 1, 5, 100, 100);
    b2.spawn(
        &[2004, 2005],
        &[0, 0],
        &[0, 0],
        &[0xFFFF_FFFF; 2],
        &[4.0, 5.0],
        &[0.0, 0.0],
        &[4.0, 5.0],
        &[0.0, 0.0],
    );

    let mut st = Store::new(64).unwrap();
    assert_eq!(apply_to_store(&mut st, &b1.build()), OK);
    assert_eq!(st.live_count(), 3);
    assert!(!st.has_baseline, "no delta baseline mid-accumulation");
    assert_eq!(st.chunk_seq, 100, "accumulation tracked");
    assert_eq!(apply_to_store(&mut st, &b2.build()), OK);
    assert_eq!(st.live_count(), 5);
    assert_eq!(st.seq, 100, "CHUNK_END commits the sequence");
    assert_eq!(st.chunk_seq, 0);
    let slot = st.find_slot(2001).unwrap();
    assert_eq!(st.x_at(slot).unwrap(), 1.0);
    assert_eq!(st.z_at(slot).unwrap(), 1.0);
}

#[test]
fn delta_chunk_keeps_baseline_until_chunk_end() {
    let mut st = Store::new(64).unwrap();
    assert_eq!(apply_to_store(&mut st, &hex(JS_SNAPSHOT)), OK);

    // Two DELTA_CHUNKs, both baseline 41, sequence 42; CHUNK_END on the last.
    let mut c1 = B::new(FT_DELTA_CHUNK, 0, 1, 6, 42, 41);
    c1.transform(&[1001], &[9.5], &[0.125], &[8.5], &[0.875]);
    c1.flags(&[1001], &[5]);
    let mut c2 = B::new(FT_DELTA_CHUNK, 2, 1, 6, 42, 41);
    c2.transform(&[1002], &[7.25], &[0.0], &[6.25], &[0.5]);

    assert_eq!(apply_to_store(&mut st, &c1.build()), OK);
    assert_eq!(st.seq, 41, "non-final chunk must not commit");
    assert_eq!(apply_to_store(&mut st, &c2.build()), OK);
    assert_eq!(st.seq, 42, "CHUNK_END commits");
    let s1 = st.find_slot(1001).unwrap();
    let s2 = st.find_slot(1002).unwrap();
    assert_eq!(st.x_at(s1).unwrap(), 9.5);
    assert_eq!(st.x_at(s2).unwrap(), 7.25);
}

#[test]
fn full_snapshot_aborts_chunk_accumulation() {
    let mut st = Store::new(64).unwrap();
    let mut c1 = B::new(FT_SNAPSHOT_CHUNK, 0, 1, 5, 100, 100);
    c1.spawn(&[3001], &[0], &[0], &[0xFFFF_FFFF], &[1.0], &[0.0], &[1.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &c1.build()), OK);
    assert_eq!(st.chunk_seq, 100);
    // A full snapshot at the same epoch replaces everything and clears it.
    let w = world(4);
    assert_eq!(apply_to_store(&mut st, &snapshot_frame(&w, 1, 7)), OK);
    assert_eq!(st.chunk_seq, 0);
    assert_eq!(st.live_count(), 4);
}

#[test]
fn stale_epoch_chunk_is_dropped() {
    let mut st = Store::new(64).unwrap();
    assert_eq!(apply_to_store(&mut st, &hex(JS_SNAPSHOT)), OK); // epoch 1, seq 41
    let mut c = B::new(FT_SNAPSHOT_CHUNK, 0, 0, 5, 100, 100);
    c.spawn(&[4001], &[0], &[0], &[0xFFFF_FFFF], &[1.0], &[0.0], &[1.0], &[0.0]);
    assert_eq!(apply_to_store(&mut st, &c.build()), OK_STALE);
    assert_eq!(st.live_count(), 2, "stale chunk dropped without state change");
}
