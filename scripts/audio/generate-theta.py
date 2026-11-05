"""Render InnerGlow's original 2-minute theta soundtrack (Python + NumPy + ffmpeg).

The music is composed here from synthesized pads and soft bell notes. The left
and right channels contain 174 Hz and 180 Hz carriers, respectively: a 6 Hz
binaural difference. No third-party recordings or remote audio are used.
Run from the repository root: python scripts/audio/generate-theta.py
"""
from pathlib import Path
import subprocess

import numpy as np

RATE = 44100
SECONDS = 120
OUTPUT = Path(__file__).resolve().parents[2] / "public/wellness/audio/music-theta.mp3"


def render():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    encoder = subprocess.Popen([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "pipe:0",
        "-codec:a", "libmp3lame", "-b:a", "96k", "-joint_stereo", "0",
        "-metadata", "title=Theta stillness",
        "-metadata", "artist=InnerGlow",
        str(OUTPUT),
    ], stdin=subprocess.PIPE)
    for second in range(SECONDS):
        t = second + np.arange(RATE) / RATE
        # Slow, periodic motion around an A minor seventh chord.
        pad = np.zeros(RATE)
        for i, frequency in enumerate([110, 130.81, 164.81, 220]):
            breath = 0.65 + 0.35 * np.sin(2 * np.pi * t / (24 + i * 6) + i)
            pad += (0.018 / (1 + i * 0.12)) * breath * np.sin(2 * np.pi * frequency * t)
            pad += 0.002 * breath * np.sin(2 * np.pi * frequency * 2 * t)
        # Sparse, softly attacked bell melody; silence between the notes.
        for start, note in enumerate([440, 523.25, 659.25, 783.99, 659.25, 523.25] * 2):
            age = t - start * 10
            envelope = np.where(age >= 0, (1 - np.exp(-np.maximum(age, 0) / 0.35)) * np.exp(-np.maximum(age, 0) / 3), 0)
            pad += 0.018 * envelope * np.sin(2 * np.pi * note * t)
        fade = np.minimum(np.clip(t / 2, 0, 1), np.clip((SECONDS - t) / 2, 0, 1))
        left = (pad + 0.035 * np.sin(2 * np.pi * 174 * t)) * fade
        right = (pad + 0.035 * np.sin(2 * np.pi * 180 * t)) * fade
        encoder.stdin.write(np.column_stack((left, right)).astype("<f4").tobytes())
    encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError("ffmpeg could not encode the theta soundtrack")
    print(f"Rendered {OUTPUT.name}: {SECONDS}s, stereo, 6 Hz binaural difference")


if __name__ == "__main__":
    render()
