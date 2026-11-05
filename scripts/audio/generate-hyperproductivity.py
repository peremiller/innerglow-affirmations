"""Render InnerGlow's original 112 BPM instrumental focus track.

Run from the repository root with Python, NumPy and ffmpeg installed:
    python scripts/audio/generate-hyperproductivity.py
All pads, arpeggios and percussion are synthesized here; no recordings are used.
"""
from pathlib import Path
import subprocess

import numpy as np

RATE = 44100
SECONDS = 120
BPM = 112
OUTPUT = Path(__file__).resolve().parents[2] / "public/wellness/audio/music-hyperproductivity.mp3"
CHORDS = np.array([
    [130.8128, 164.8138, 195.9977, 246.9417],  # C major seventh
    [110, 130.8128, 164.8138, 195.9977],       # A minor seventh
    [87.3071, 110, 130.8128, 164.8138],       # F major seventh
    [97.9989, 123.4708, 146.8324, 164.8138],  # G sixth
])


def render():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    encoder = subprocess.Popen([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "pipe:0",
        "-codec:a", "libmp3lame", "-b:a", "96k", "-joint_stereo", "0",
        "-metadata", "title=Hyperproductivity",
        "-metadata", "artist=InnerGlow", str(OUTPUT),
    ], stdin=subprocess.PIPE)
    rng = np.random.default_rng(112)
    for second in range(SECONDS):
        t = second + np.arange(RATE) / RATE
        beat = t * BPM / 60
        age = np.mod(beat, 1) * 60 / BPM
        eighth_age = np.mod(beat * 2, 1) * 30 / BPM
        chord_index = (beat // 4).astype(int) % len(CHORDS)
        frequencies = CHORDS[chord_index]
        # Fade pads between bars while a quiet bass and kick hold the pulse.
        bar_phase = np.mod(beat, 4) / 4
        pad_envelope = np.sin(np.pi * bar_phase) ** 0.6
        pad = np.sum(np.sin(2 * np.pi * frequencies * t[:, None]), axis=1) * 0.009 * pad_envelope
        bass = 0.024 * np.sin(2 * np.pi * frequencies[:, 0] / 2 * age) * np.exp(-age * 7)
        kick_phase = 2 * np.pi * (48 * age + 5 * (1 - np.exp(-age * 28)))
        kick = 0.065 * np.sin(kick_phase) * np.exp(-age * 22) * (1 - np.exp(-age * 500))
        # An understated eighth-note arpeggio, alternating across stereo.
        step = (beat * 2).astype(int)
        arp_frequency = frequencies[np.arange(RATE), step % 4] * 2
        arp_envelope = (1 - np.exp(-eighth_age * 100)) * np.exp(-eighth_age * 16)
        arp = (np.sin(2 * np.pi * arp_frequency * eighth_age) + 0.12 * np.sin(4 * np.pi * arp_frequency * eighth_age)) * arp_envelope * 0.030
        hat = rng.normal(0, 1, RATE) * np.exp(-eighth_age * 100) * (1 - np.exp(-eighth_age * 1000)) * 0.006
        # Gentle entrance and exit make repeat playback comfortable.
        fade = np.minimum(np.clip(t / 1.5, 0, 1), np.clip((SECONDS - t) / 1.5, 0, 1))
        pan = 0.20 * np.where(step % 2 == 0, -1, 1)
        bed = pad + bass + kick + hat
        stereo = np.column_stack((bed + arp * (1 - pan), bed + arp * (1 + pan))) * fade[:, None] * 6
        encoder.stdin.write(stereo.astype("<f4").tobytes())
    encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError("ffmpeg could not encode the focus soundtrack")
    print(f"Rendered {OUTPUT.name}: {SECONDS}s, stereo, {BPM} BPM, no vocals")


if __name__ == "__main__":
    render()
