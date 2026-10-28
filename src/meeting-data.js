import { AURORA_ASSET } from './generated-assets.js';

export const SCENERIES = [
  { id: 'forest', name: 'Forest sanctuary', mood: 'Grounding · green & still', image: '/scenery/forest.webp', position: 'center' },
  { id: 'ocean', name: 'Ocean light', mood: 'Expansive · a softer horizon', image: '/scenery/ocean.webp', position: 'center' },
  { id: 'mountains', name: 'Alpine stillness', mood: 'Clear · a little perspective', image: '/scenery/mountains.webp', position: 'center' },
  { id: 'lake', name: 'Lakeside morning', mood: 'Restorative · room to breathe', image: '/scenery/lake.webp', position: 'center' },
  { id: 'dunes', name: 'Desert hush', mood: 'Warm · unhurried & open', image: '/scenery/dunes.webp', position: 'center' },
  { id: 'aurora', name: 'Northern glow', mood: 'Dreamlike · quiet wonder', image: AURORA_ASSET, position: 'center' },
];

export const INTENTIONS = {
  together: { name: 'Better together', description: 'Connection, trust & shared purpose', lines: [
    'We bring different strengths. Together, we make something meaningful.',
    'We listen with curiosity and speak with kindness.',
    'We can ask for help. We can offer it generously.',
    'Our progress begins with one thoughtful step.',
    'Every voice has value. Every contribution matters.',
    'We make room for learning, growth, and each other.',
    'We focus on what matters and move forward together.',
    'We begin this week with purpose, patience, and possibility.',
  ] },
  calm: { name: 'A calm beginning', description: 'Presence, focus & a fresh start', lines: [
    'For this moment, we give ourselves permission to pause.',
    'We let go of the rush and return to the present.',
    'We meet this week one moment, one task, one breath at a time.',
    'We can respond with intention and move with clarity.',
    'A steady pace can carry us a long way.',
    'We bring our attention to what is within our reach.',
  ] },
  confidence: { name: 'Quiet confidence', description: 'Courage, resilience & possibility', lines: [
    'We have the skills to begin and the capacity to keep learning.',
    'We meet challenges with curiosity and courage.',
    'Progress grows from small, consistent actions.',
    'We can do meaningful work without expecting perfection.',
    'We trust our preparation and support one another.',
    'This week holds possibilities we have yet to discover.',
  ] },
  gratitude: { name: 'Notice the good', description: 'Appreciation, generosity & care', lines: [
    'We appreciate the effort that often goes unseen.',
    'We notice the people who make our work a little lighter.',
    'Small acts of kindness shape the way we work together.',
    'We celebrate progress and the people behind it.',
    'We make space to recognize what is going well.',
    'We begin with appreciation for this team and this moment.',
  ] },
};

export const MUSIC = [
  { id: '1', name: 'Healing calm', description: 'Warm ambient piano' },
  { id: '0', name: 'Calming clouds', description: 'Soft pads & chimes' },
  { id: '2', name: 'Relaxing flow', description: 'Piano & strings' },
  { id: 'none', name: 'Just the quiet', description: 'No background music' },
];

export function meetingLines(intention, custom, dailyText = "") {
  if (intention === 'daily') return dailyText.trim() ? [dailyText.trim()] : [];
  if (intention === 'custom') return custom.trim() ? [custom.trim()] : [];
  return INTENTIONS[intention]?.lines || INTENTIONS.together.lines;
}
export function meetingSlide(elapsed, count, offset = 0) { return count > 0 ? ((Math.floor(Math.max(0, elapsed) / 12) + offset) % count + count) % count : 0; }
export function clock(seconds) { const safe = Math.max(0, Math.ceil(seconds)); return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`; }
