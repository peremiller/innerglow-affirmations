export const AMBIENT_TRACKS = [
  { id: "celestial", label: "Celestial", detail: "Warm floating harmonies" },
  { id: "ocean", label: "Ocean", detail: "Slow tides and soft drones" },
  { id: "rain", label: "Rain", detail: "Gentle rain and distant chimes" },
];

const TRACKS = {
  celestial: {
    pad: [174.61, 220, 261.63, 329.63],
    filter: 1450,
    noise: 0.004,
    movement: 0.035,
  },
  ocean: {
    pad: [146.83, 220, 293.66],
    filter: 820,
    noise: 0.022,
    movement: 0.055,
  },
  rain: {
    pad: [196, 246.94, 293.66],
    filter: 1900,
    noise: 0.048,
    movement: 0.025,
    chimes: [659.25, 783.99, 987.77],
  },
};

function createNoiseBuffer(context) {
  const length = context.sampleRate * 3;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let previous = 0;

  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.985 + white * 0.015;
    channel[index] = previous * 3.2;
  }

  return buffer;
}

export function createAmbientSoundscape(trackId = "celestial", initialVolume = 0.45) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const track = TRACKS[trackId] || TRACKS.celestial;
  const master = context.createGain();
  const tone = context.createBiquadFilter();
  const activeNodes = [];
  let stopped = false;
  let volume = Math.max(0, Math.min(1, initialVolume));

  tone.type = "lowpass";
  tone.frequency.value = track.filter;
  tone.Q.value = 0.5;
  master.gain.value = 0.0001;
  master.connect(tone);
  tone.connect(context.destination);

  const register = (...nodes) => {
    activeNodes.push(...nodes);
    return nodes;
  };

  track.pad.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const voice = context.createGain();
    const movement = context.createOscillator();
    const movementDepth = context.createGain();

    oscillator.type = index % 2 ? "sine" : "triangle";
    oscillator.frequency.value = frequency / (index === 0 ? 2 : 1);
    oscillator.detune.value = index % 2 ? 5 : -4;
    voice.gain.value = 0.018 + index * 0.002;
    movement.type = "sine";
    movement.frequency.value = track.movement + index * 0.007;
    movementDepth.gain.value = 0.006;

    movement.connect(movementDepth);
    movementDepth.connect(voice.gain);
    oscillator.connect(voice);
    voice.connect(master);
    oscillator.start();
    movement.start();
    register(oscillator, movement);
  });

  if (track.noise) {
    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const swell = context.createOscillator();
    const swellDepth = context.createGain();

    noise.buffer = createNoiseBuffer(context);
    noise.loop = true;
    noiseFilter.type = trackId === "rain" ? "highpass" : "lowpass";
    noiseFilter.frequency.value = trackId === "rain" ? 900 : 520;
    noiseGain.gain.value = track.noise;
    swell.frequency.value = trackId === "ocean" ? 0.085 : 0.13;
    swellDepth.gain.value = track.noise * 0.38;

    swell.connect(swellDepth);
    swellDepth.connect(noiseGain.gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    swell.start();
    register(noise, swell);
  }

  track.chimes?.forEach((frequency, index) => {
    const chime = context.createOscillator();
    const chimeGain = context.createGain();
    const shimmer = context.createOscillator();
    const shimmerDepth = context.createGain();

    chime.type = "sine";
    chime.frequency.value = frequency;
    chimeGain.gain.value = 0.0015;
    shimmer.frequency.value = 0.028 + index * 0.009;
    shimmerDepth.gain.value = 0.0014;
    shimmer.connect(shimmerDepth);
    shimmerDepth.connect(chimeGain.gain);
    chime.connect(chimeGain);
    chimeGain.connect(master);
    chime.start();
    shimmer.start();
    register(chime, shimmer);
  });

  const gainFor = (value) => 0.055 * value + 0.0001;

  return {
    async start() {
      await context.resume();
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(gainFor(volume), now + 1.8);
    },
    setVolume(nextVolume) {
      volume = Math.max(0, Math.min(1, nextVolume));
      if (stopped) return;
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(gainFor(volume), now, 0.15);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      window.setTimeout(() => {
        activeNodes.forEach((node) => {
          try { node.stop(); } catch { /* already stopped */ }
        });
        context.close();
      }, 1000);
    },
  };
}
