export const PATTERNS = {
  gentle: { label: 'Gentle breathing', detail: 'Inhale 4s · exhale 4s', phases: [['Inhale', 4], ['Exhale', 4]] },
  unwind: { label: 'Long exhale', detail: 'Inhale 4s · exhale 6s', phases: [['Inhale', 4], ['Exhale', 6]] },
  box: { label: 'Box breathing', detail: 'Inhale 4s · hold 4s · exhale 4s · hold 4s', phases: [['Inhale', 4], ['Hold', 4], ['Exhale', 4], ['Hold', 4]] },
};

export function breathAt(elapsedMs, patternId) {
  const phases = (PATTERNS[patternId] || PATTERNS.gentle).phases;
  const cycleMs = phases.reduce((sum, [, seconds]) => sum + seconds * 1000, 0);
  let position = Math.max(0, elapsedMs) % cycleMs;
  for (let index = 0; index < phases.length; index++) {
    const [label, seconds] = phases[index];
    if (position < seconds * 1000) {
      const progress = position / (seconds * 1000);
      const expanded = label === 'Inhale' ? progress : label === 'Exhale' ? 1 - progress : index === 1 ? 1 : 0;
      return { label, secondsLeft: Math.ceil(seconds - position / 1000), scale: 0.78 + expanded * 0.22, phaseKey: `${Math.floor(elapsedMs / cycleMs)}:${index}` };
    }
    position -= seconds * 1000;
  }
}

export function remainingSeconds(durationMs, elapsedMs) {
  return Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
}
