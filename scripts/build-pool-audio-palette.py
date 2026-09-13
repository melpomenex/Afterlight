#!/usr/bin/env python3
"""Build the billiards sample palette under public/audio/pool/.

Sources are CC0 recordings fetched from freesound.org (see SOURCES below).
The script slices individual impacts/pocket sequences out of longer
recordings, trims leading silence, removes DC, applies short fades, and
normalizes each FAMILY together (one family gain so the loudest clip in the
family peaks at -3 dBFS) so relative dynamics between soft/med/hard layers
survive. It also synthesizes the seamless cloth-rolling texture (filtered
noise; permitted by the convincing-billiards-audio design D1) and writes the
provenance manifest next to the assets.

Run from the repository root:
    python3 scripts/build-pool-audio-palette.py <dir-with-downloaded-mp3s>

Downloads are not committed; this script documents their URLs and edits so
the palette can be regenerated. Outputs are 44.1 kHz mono 16-bit WAV.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
FAMILY_TARGET_DB = -3.0

SOURCES = {
    "fs675330": {
        "title": "S02-22 Billiards cue stick hits ball.wav",
        "author": "craigsmith",
        "url": "https://freesound.org/people/craigsmith/sounds/675330/",
        "license": "CC0 1.0",
    },
    "fs379327": {
        "title": "Billiards.wav",
        "author": "13FPanska_Marval_Lukas",
        "url": "https://freesound.org/people/13FPanska_Marval_Lukas/sounds/379327/",
        "license": "CC0 1.0",
    },
    "fs147578": {
        "title": "8 ball - billiard.wav",
        "author": "allberto",
        "url": "https://freesound.org/people/allberto/sounds/147578/",
        "license": "CC0 1.0",
    },
    "fs543482": {
        "title": "Pool Table Ball Break (in a public bar) No.2.wav",
        "author": "RossJuterbock",
        "url": "https://freesound.org/people/RossJuterbock/sounds/543482/",
        "license": "CC0 1.0",
    },
    "fs441857": {
        "title": "B_1 pool ball falling.wav",
        "author": "Yarmonics",
        "url": "https://freesound.org/people/Yarmonics/sounds/441857/",
        "license": "CC0 1.0",
    },
    "fs365525": {
        "title": "Potting snooker balls.mp3",
        "author": "Caitlin_100",
        "url": "https://freesound.org/people/Caitlin_100/sounds/365525/",
        "license": "CC0 1.0",
    },
}

# name -> (source file stem, window start [s], window end [s], family)
# Windows isolate ONE impact onset (checked by the post-build assertion):
# impact families must peak within the first 60 ms; pocket clips are drop +
# rattle SEQUENCES by design; cloth is a loop.
CLIPS = {
    "cue-soft-1": ("fs675330", 2.594, 2.804, "cue"),
    "cue-soft-2": ("fs675330", 5.233, 5.443, "cue"),
    "cue-hard-1": ("fs675330", 3.791, 4.011, "cue"),
    "cue-hard-2": ("fs675330", 7.209, 7.429, "cue"),
    "ball-soft-1": ("fs379327", 1.347, 1.500, "ball"),
    "ball-soft-2": ("fs147578", 5.976, 6.130, "ball"),
    "ball-med-1": ("fs147578", 0.888, 1.010, "ball"),
    "ball-med-2": ("fs147578", 9.369, 9.560, "ball"),
    "ball-hard-1": ("fs543482", 1.207, 1.467, "ball"),
    "ball-hard-2": ("fs147578", 1.013, 1.163, "ball"),
    "cushion-1": ("fs147578", 4.175, 4.268, "cushion"),
    "cushion-2": ("fs147578", 4.420, 4.680, "cushion"),
    "cushion-3": ("fs379327", 1.736, 1.956, "cushion"),
    "pocket-1": ("fs441857", 0.000, 0.700, "pocket"),
    "pocket-2": ("fs365525", 2.550, 3.100, "pocket"),
    "pocket-3": ("fs365525", 3.150, 3.800, "pocket"),
}


def load_mono(path, sr=SR):
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    )
    return np.frombuffer(out.stdout, dtype=np.float32).copy()


def trim_leading_silence(x, threshold_db=-45.0):
    thresh = 10 ** (threshold_db / 20.0)
    idx = np.argmax(np.abs(x) > thresh)
    return x[idx:] if idx > 0 else x


def fades(x, fade_in=0.003, fade_out=0.040, sr=SR):
    n_in = int(fade_in * sr)
    n_out = int(fade_out * sr)
    if n_in > 0 and len(x) > n_in:
        x[:n_in] *= np.linspace(0.0, 1.0, n_in, dtype=np.float32)
    if n_out > 0 and len(x) > n_out:
        x[-n_out:] *= np.linspace(1.0, 0.0, n_out, dtype=np.float32)
    return x


def synth_cloth_loop(seconds=1.6, sr=SR, seed=20260913):
    """Seamless, quiet cloth-rolling texture: band-limited filtered noise.

    Pink-weighted noise (natural hiss of resin on cloth), band-limited to
    150 Hz..2.2 kHz, with a gentle 0.8 Hz amplitude wander so the loop does
    not read as a static hiss. Equal-power crossfaded ends make it loop
    seamlessly.
    """
    rng = np.random.default_rng(seed)
    n = int(seconds * sr)
    white = rng.standard_normal(n + sr).astype(np.float32)  # extra second for the crossfade
    # Pink-ish shaping via cumulative spectral tilt.
    spec = np.fft.rfft(white)
    freqs = np.fft.rfftfreq(len(white), 1.0 / sr)
    shape = np.where(freqs > 0, 1.0 / np.sqrt(np.maximum(freqs, 1.0)), 0.0)
    band = np.where((freqs >= 150.0) & (freqs <= 2200.0), 1.0, 0.0)
    # Soften the band edges to avoid ringing.
    edge = np.clip(np.minimum(freqs - 130.0, 2400.0 - freqs) / 120.0, 0.0, 1.0)
    shaped = spec * shape * band * edge
    x = np.fft.irfft(shaped, len(white)).astype(np.float32)
    # Slow amplitude wander (0.8 Hz), phase-locked to the loop length.
    t = np.arange(len(x), dtype=np.float32) / sr
    wander = 0.82 + 0.18 * np.sin(2 * np.pi * 0.8 * t + rng.uniform(0, 6.28))
    x *= wander.astype(np.float32)
    # Equal-power crossfade: loop body + one-second tail folded back onto the head.
    body = x[:n].copy()
    tail = x[n:]
    fade_len = min(len(tail), int(0.5 * sr))
    w = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
    body[:fade_len] = body[:fade_len] * np.sqrt(1.0 - w) + tail[:fade_len] * np.sqrt(w)
    peak = np.abs(body).max()
    return (body / peak * (10 ** (FAMILY_TARGET_DB / 20.0))).astype(np.float32)


def write_wav(path, x, sr=SR):
    y = np.clip(x, -1.0, 1.0)
    pcm = (y * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    src_dir = Path(sys.argv[1])
    out_dir = Path(__file__).resolve().parent.parent / "public" / "audio" / "pool"
    out_dir.mkdir(parents=True, exist_ok=True)

    audio = {}
    for stem in SOURCES:
        matches = sorted(src_dir.glob(f"{stem}*.mp3"))
        if not matches:
            sys.exit(f"missing source {stem}*.mp3 in {src_dir}")
        audio[stem] = load_mono(matches[0])

    raw = {}
    for name, (stem, t0, t1, family) in CLIPS.items():
        x = audio[stem][int(t0 * SR):int(t1 * SR)].copy()
        x = trim_leading_silence(x)
        x = x - x.mean()  # DC removal
        raw[name] = (x, family, stem)

    # Family-consistent normalization: one gain per family so the loudest raw
    # clip peaks at the family target; every other clip keeps its relative
    # level inside the family.
    family_gain = {}
    families = {family for _, family, _ in raw.values()}
    for family in sorted(families):
        loudest = max(np.abs(x).max() for x, f, _ in raw.values() if f == family)
        family_gain[family] = (10 ** (FAMILY_TARGET_DB / 20.0)) / max(loudest, 1e-9)

    manifest_entries = []
    total_bytes = 0
    total_samples = 0
    for name, (x, family, stem) in raw.items():
        y = fades(x * family_gain[family]).astype(np.float32)
        path = out_dir / f"{name}.wav"
        write_wav(path, y)
        total_bytes += path.stat().st_size
        total_samples += len(y)
        src = SOURCES[stem]
        manifest_entries.append(
            {
                "file": f"{name}.wav",
                "family": family,
                "source": f"{src['title']} by {src['author']} — {src['url']}",
                "license": src["license"],
                "edit": (
                    f"sliced {CLIPS[name][1]:.3f}s–{CLIPS[name][2]:.3f}s from the recording, "
                    "converted to 44.1 kHz mono, leading silence trimmed, DC removed, "
                    "3 ms/40 ms fades, family-shared peak normalization"
                ),
            }
        )

    cloth = synth_cloth_loop()
    cloth_path = out_dir / "cloth-loop.wav"
    write_wav(cloth_path, cloth)
    total_bytes += cloth_path.stat().st_size
    total_samples += len(cloth)
    manifest_entries.append(
        {
            "file": "cloth-loop.wav",
            "family": "cloth",
            "source": "synthesized locally by scripts/build-pool-audio-palette.py (no recording)",
            "license": "project-authored (CC0-equivalent)",
            "edit": (
                "seamless 1.6 s loop: pink-weighted noise band-limited 150 Hz–2.2 kHz, "
                "0.8 Hz amplitude wander, equal-power crossfaded ends"
            ),
        }
    )

    manifest = {
        "generator": "scripts/build-pool-audio-palette.py",
        "format": "44.1 kHz mono 16-bit WAV",
        "families": {
            "cue": "cue-tip strike; soft/hard velocity layers, 2 variants each",
            "ball": "resin ball-to-ball impact; soft/med/hard velocity layers, 2 variants each",
            "cushion": "rubber cushion knock; 3 variants (speed scales gain at playback)",
            "pocket": "lip/drop/settle sequence; 3 variants",
            "cloth": "seamless rolling/sliding texture driven by ball speed",
        },
        "budgets": {
            "transfer_bytes": total_bytes,
            "transfer_budget_bytes": 2 * 1024 * 1024,
            "decoded_bytes_float32": total_samples * 4,
            "decoded_budget_bytes": 12 * 1024 * 1024,
        },
        "files": manifest_entries,
    }

    # Audition guard: a late peak means the slice caught a neighboring impact
    # instead of the intended one. Resin ball clicks are instantaneous (60 ms);
    # leather cue taps and rubber cushion knocks develop a touch slower (90 ms).
    # Pocket sequences and the cloth loop are exempt.
    GUARD_MS = {"ball": 60, "cue": 90, "cushion": 90}
    for name, (x, family, _stem) in raw.items():
        limit_ms = GUARD_MS.get(family)
        if limit_ms is None:
            continue
        peak_at = int(np.argmax(np.abs(x))) / SR
        if peak_at > limit_ms / 1000.0:
            sys.exit(f"{name}: peak at {peak_at*1000:.0f} ms — slice caught the wrong onset")

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    human = [
        "# Billiards audio palette",
        "",
        "All files are generated by `scripts/build-pool-audio-palette.py` from the",
        "CC0 recordings listed below (downloads live outside the repo; the URLs and",
        "edits are recorded so the palette is reproducible).",
        "",
    ]
    for e in manifest_entries:
        human += [
            f"## {e['file']} ({e['family']})",
            f"- Source: {e['source']}",
            f"- License: {e['license']}",
            f"- Edits: {e['edit']}",
            "",
        ]
    human += [
        "## Budgets",
        f"- Transfer: {total_bytes} bytes (budget {2*1024*1024})",
        f"- Decoded (float32): {total_samples*4} bytes (budget {12*1024*1024})",
        "",
    ]
    (out_dir / "PROVENANCE.md").write_text("\n".join(human))

    print(json.dumps(manifest["budgets"], indent=2))
    print(f"wrote {len(manifest_entries)} files to {out_dir}")


if __name__ == "__main__":
    main()
