import { useEffect, useRef, useState } from 'react';
import { MUSIC } from './meeting-data';
import './healing-music.css';

export default function HealingMusic() {
  const [track, setTrack] = useState('1');
  const [repeat, setRepeat] = useState(true);
  const [error, setError] = useState('');
  const player = useRef(null);
  const tracks = MUSIC.filter(item => item.id !== 'none');
  const selected = tracks.find(item => item.id === track);
  useEffect(() => {
    const stop = () => player.current?.pause();
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.presenting === 'true') stop();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-presenting'] });
    window.addEventListener('pagehide', stop);
    return () => { observer.disconnect(); window.removeEventListener('pagehide', stop); };
  }, []);
  async function choose(id) {
    setTrack(id);
    setError('');
    const audio = player.current;
    audio.src = `/wellness/audio/music-${id}.mp3`;
    try { await audio.play(); } catch { setError('Playback could not start. Press play to retry.'); }
  }
  return <section className="healing-music" id="healing-music" aria-labelledby="healing-title">
    <div className="section-heading"><div><p className="eyebrow">SOUND FOR YOUR STILLNESS</p><h2 id="healing-title">Healing music.</h2></div><p>Press play. Let the day soften.</p></div>
    <div className="healing-tracks">{tracks.map((item, i) => <button key={item.id} aria-pressed={track === item.id} onClick={() => choose(item.id)}><span className="healing-number">0{i + 1}</span><span><strong>{item.name}</strong><small>{item.description}</small></span><span aria-hidden="true">♫</span></button>)}</div>
    <div className="healing-player"><div><strong>{selected.name}</strong><p>Instrumental music for relaxation, reflection, or a quiet break.</p></div>
      <audio ref={player} controls preload="none" loop={repeat} src="/wellness/audio/music-1.mp3" onError={() => setError('This track could not load. Check your connection and select a track to retry.')} onPlaying={() => setError('')} aria-label={`Music player: ${selected.name}`} />
      <label><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} /> Repeat track</label>
    </div>
    {error && <p role="alert">{error}</p>}
    <small className="healing-note">Stream directly here, with no account required. “Healing” describes the mood of the music.</small>
  </section>;
}
